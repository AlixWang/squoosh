/**
 * Tests for base codec classes
 */

import { AbstractBaseCodec, AbstractEncoder, AbstractDecoder } from '../base-codec.js';
import { ImageFormat, EncodeOptions } from '../../types/index.js';
import { ValidationError } from '../../errors/index.js';

// Mock implementations for testing
class MockEncoder extends AbstractEncoder {
  readonly format: ImageFormat = 'webp';
  readonly mimeType = 'image/webp';
  readonly extension = '.webp';

  async encode(imageData: ImageData, options?: EncodeOptions): Promise<ArrayBuffer> {
    this.validateImageData(imageData);
    const mergedOptions = this.mergeOptions(options);
    // Mock implementation - return empty buffer
    return new ArrayBuffer(100);
  }

  getDefaultOptions(): EncodeOptions {
    return { quality: 80 };
  }

  protected validateFormatSpecificOptions(options: EncodeOptions): boolean {
    // Mock validation - reject if lossless is not boolean
    if (options.lossless !== undefined && typeof options.lossless !== 'boolean') {
      return false;
    }
    return true;
  }
}

class MockDecoder extends AbstractDecoder {
  readonly format: ImageFormat = 'webp';
  readonly mimeType = 'image/webp';
  readonly extension = '.webp';

  async decode(buffer: ArrayBuffer): Promise<ImageData> {
    this.validateDecodeBuffer(buffer);
    // Mock implementation - return dummy ImageData
    return new ImageData(100, 100);
  }

  canDecode(buffer: ArrayBuffer): boolean {
    return this.checkSignature(buffer);
  }

  protected checkSignature(buffer: ArrayBuffer): boolean {
    // Mock WebP signature check
    const bytes = new Uint8Array(buffer);
    return bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
}

describe('AbstractBaseCodec', () => {
  let codec: MockEncoder;

  beforeEach(() => {
    codec = new MockEncoder();
  });

  describe('isSupported', () => {
    it('should return true when WebAssembly is available', async () => {
      // WebAssembly should be available in test environment
      const supported = await codec.isSupported();
      expect(supported).toBe(true);
    });

    it('should return format information', () => {
      const info = codec.getFormatInfo();
      expect(info).toEqual({
        format: 'webp',
        mimeType: 'image/webp',
        extension: '.webp',
      });
    });
  });

  describe('validateBuffer', () => {
    it('should not throw for valid buffer', () => {
      const buffer = new ArrayBuffer(100);
      expect(() => codec['validateBuffer'](buffer)).not.toThrow();
    });

    it('should throw for empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      expect(() => codec['validateBuffer'](buffer)).toThrow(ValidationError);
    });

    it('should throw for null buffer', () => {
      expect(() => codec['validateBuffer'](null as any)).toThrow(ValidationError);
    });
  });
});

describe('AbstractEncoder', () => {
  let encoder: MockEncoder;

  beforeEach(() => {
    encoder = new MockEncoder();
  });

  describe('validateOptions', () => {
    it('should return true for valid options', () => {
      const options = { quality: 80, lossless: true };
      expect(encoder.validateOptions(options)).toBe(true);
    });

    it('should return true for undefined options', () => {
      expect(encoder.validateOptions(undefined as any)).toBe(true);
    });

    it('should return false for invalid quality', () => {
      expect(encoder.validateOptions({ quality: -1 })).toBe(false);
      expect(encoder.validateOptions({ quality: 101 })).toBe(false);
      expect(encoder.validateOptions({ quality: 'high' as any })).toBe(false);
    });

    it('should return false for invalid format-specific options', () => {
      const options = { quality: 80, lossless: 'yes' as any };
      expect(encoder.validateOptions(options)).toBe(false);
    });
  });

  describe('validateImageData', () => {
    it('should not throw for valid ImageData', () => {
      const imageData = new ImageData(100, 100);
      expect(() => encoder['validateImageData'](imageData)).not.toThrow();
    });

    it('should throw for null ImageData', () => {
      expect(() => encoder['validateImageData'](null as any)).toThrow(ValidationError);
    });

    it('should throw for ImageData with no pixel data', () => {
      const imageData = { width: 100, height: 100, data: new Uint8ClampedArray(0) } as ImageData;
      expect(() => encoder['validateImageData'](imageData)).toThrow(ValidationError);
    });

    it('should throw for ImageData with invalid dimensions', () => {
      const imageData = { width: 0, height: 100, data: new Uint8ClampedArray(100) } as ImageData;
      expect(() => encoder['validateImageData'](imageData)).toThrow(ValidationError);
    });

    it('should throw for ImageData with mismatched data length', () => {
      const imageData = {
        width: 100,
        height: 100,
        data: new Uint8ClampedArray(100) // Should be 100 * 100 * 4 = 40000
      } as ImageData;
      expect(() => encoder['validateImageData'](imageData)).toThrow(ValidationError);
    });
  });

  describe('mergeOptions', () => {
    it('should merge user options with defaults', () => {
      const userOptions = { quality: 90, lossless: true };
      const merged = encoder['mergeOptions'](userOptions);
      expect(merged).toEqual({ quality: 90, lossless: true });
    });

    it('should use defaults when no user options provided', () => {
      const merged = encoder['mergeOptions']();
      expect(merged).toEqual({ quality: 80 });
    });

    it('should override defaults with user options', () => {
      const userOptions = { quality: 50 };
      const merged = encoder['mergeOptions'](userOptions);
      expect(merged).toEqual({ quality: 50 });
    });
  });

  describe('encode', () => {
    it('should encode valid ImageData', async () => {
      const imageData = new ImageData(100, 100);
      const result = await encoder.encode(imageData);
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(100);
    });

    it('should throw for invalid ImageData', async () => {
      const imageData = null as any;
      await expect(encoder.encode(imageData)).rejects.toThrow(ValidationError);
    });
  });
});

describe('AbstractDecoder', () => {
  let decoder: MockDecoder;

  beforeEach(() => {
    decoder = new MockDecoder();
  });

  describe('canDecode', () => {
    it('should return true for valid WebP buffer', () => {
      // Create mock WebP buffer with correct signature
      const buffer = new ArrayBuffer(12);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46; // RIFF
      bytes[8] = 0x57; bytes[9] = 0x45; bytes[10] = 0x42; bytes[11] = 0x50; // WEBP

      expect(decoder.canDecode(buffer)).toBe(true);
    });

    it('should return false for invalid buffer', () => {
      const buffer = new ArrayBuffer(12);
      expect(decoder.canDecode(buffer)).toBe(false);
    });
  });

  describe('validateDecodeBuffer', () => {
    it('should not throw for valid buffer', () => {
      // Create mock WebP buffer
      const buffer = new ArrayBuffer(12);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46; // RIFF
      bytes[8] = 0x57; bytes[9] = 0x45; bytes[10] = 0x42; bytes[11] = 0x50; // WEBP

      expect(() => decoder['validateDecodeBuffer'](buffer)).not.toThrow();
    });

    it('should throw for empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      expect(() => decoder['validateDecodeBuffer'](buffer)).toThrow(ValidationError);
    });

    it('should throw for buffer that cannot be decoded', () => {
      const buffer = new ArrayBuffer(12); // Invalid WebP
      expect(() => decoder['validateDecodeBuffer'](buffer)).toThrow(ValidationError);
    });
  });

  describe('decode', () => {
    it('should decode valid buffer', async () => {
      // Create mock WebP buffer
      const buffer = new ArrayBuffer(12);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46; // RIFF
      bytes[8] = 0x57; bytes[9] = 0x45; bytes[10] = 0x42; bytes[11] = 0x50; // WEBP

      const result = await decoder.decode(buffer);
      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it('should throw for invalid buffer', async () => {
      const buffer = new ArrayBuffer(12); // Invalid WebP
      await expect(decoder.decode(buffer)).rejects.toThrow(ValidationError);
    });
  });
});