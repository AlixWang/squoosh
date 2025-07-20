/**
 * Tests for codec registry system
 */

import {
  GenericCodecRegistry,
  EncoderRegistry,
  DecoderRegistry,
  CodecManager,
} from '../codec-registry.js';
import { AbstractEncoder, AbstractDecoder } from '../base-codec.js';
import { ImageFormat, EncodeOptions } from '../../types/index.js';
import { UnsupportedFormatError, ValidationError } from '../../errors/index.js';

// Mock encoder implementation
class MockEncoder extends AbstractEncoder {
  constructor(
    public readonly format: ImageFormat,
    public readonly mimeType: string = `image/${format}`,
    public readonly extension: string = `.${format}`,
    private supported: boolean = true
  ) {
    super();
  }

  async encode(imageData: ImageData, options?: EncodeOptions): Promise<ArrayBuffer> {
    this.validateImageData(imageData);
    return new ArrayBuffer(100);
  }

  getDefaultOptions(): EncodeOptions {
    return { quality: 80 };
  }

  async isSupported(): Promise<boolean> {
    return this.supported;
  }
}

// Mock decoder implementation
class MockDecoder extends AbstractDecoder {
  constructor(
    public readonly format: ImageFormat,
    public readonly mimeType: string = `image/${format}`,
    public readonly extension: string = `.${format}`,
    private supported: boolean = true,
    private canDecodeResult: boolean = true
  ) {
    super();
  }

  async decode(buffer: ArrayBuffer): Promise<ImageData> {
    this.validateDecodeBuffer(buffer);
    return new ImageData(100, 100);
  }

  canDecode(buffer: ArrayBuffer): boolean {
    return this.canDecodeResult && this.checkSignature(buffer);
  }

  protected checkSignature(buffer: ArrayBuffer): boolean {
    return buffer.byteLength > 0;
  }

  async isSupported(): Promise<boolean> {
    return this.supported;
  }
}

describe('GenericCodecRegistry', () => {
  let registry: GenericCodecRegistry<MockEncoder>;

  beforeEach(() => {
    registry = new GenericCodecRegistry<MockEncoder>();
  });

  describe('register', () => {
    it('should register a codec', () => {
      const encoder = new MockEncoder('webp');
      registry.register(encoder);

      expect(registry.get('webp')).toBe(encoder);
      expect(registry.size()).toBe(1);
    });

    it('should throw for null codec', () => {
      expect(() => registry.register(null as any)).toThrow(ValidationError);
    });

    it('should throw for codec without format', () => {
      const encoder = { mimeType: 'image/webp', extension: '.webp' } as any;
      expect(() => registry.register(encoder)).toThrow(ValidationError);
    });

    it('should replace existing codec for same format', () => {
      const encoder1 = new MockEncoder('webp');
      const encoder2 = new MockEncoder('webp');

      registry.register(encoder1);
      registry.register(encoder2);

      expect(registry.get('webp')).toBe(encoder2);
      expect(registry.size()).toBe(1);
    });
  });

  describe('unregister', () => {
    it('should unregister a codec', () => {
      const encoder = new MockEncoder('webp');
      registry.register(encoder);

      registry.unregister('webp');

      expect(registry.get('webp')).toBeUndefined();
      expect(registry.size()).toBe(0);
    });

    it('should handle unregistering non-existent format', () => {
      expect(() => registry.unregister('webp')).not.toThrow();
    });
  });

  describe('get', () => {
    it('should return registered codec', () => {
      const encoder = new MockEncoder('webp');
      registry.register(encoder);

      expect(registry.get('webp')).toBe(encoder);
    });

    it('should return undefined for unregistered format', () => {
      expect(registry.get('webp')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered codecs', () => {
      const encoder1 = new MockEncoder('webp');
      const encoder2 = new MockEncoder('avif');

      registry.register(encoder1);
      registry.register(encoder2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(encoder1);
      expect(all).toContain(encoder2);
    });

    it('should return empty array when no codecs registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('isSupported', () => {
    it('should return true for supported codec', async () => {
      const encoder = new MockEncoder('webp', 'image/webp', '.webp', true);
      registry.register(encoder);

      expect(await registry.isSupported('webp')).toBe(true);
    });

    it('should return false for unsupported codec', async () => {
      const encoder = new MockEncoder('webp', 'image/webp', '.webp', false);
      registry.register(encoder);

      expect(await registry.isSupported('webp')).toBe(false);
    });

    it('should return false for unregistered format', async () => {
      expect(await registry.isSupported('webp')).toBe(false);
    });

    it('should return false when codec throws error', async () => {
      const encoder = new MockEncoder('webp');
      jest.spyOn(encoder, 'isSupported').mockRejectedValue(new Error('Test error'));
      registry.register(encoder);

      expect(await registry.isSupported('webp')).toBe(false);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported formats', async () => {
      const encoder1 = new MockEncoder('webp', 'image/webp', '.webp', true);
      const encoder2 = new MockEncoder('avif', 'image/avif', '.avif', false);
      const encoder3 = new MockEncoder('png', 'image/png', '.png', true);

      registry.register(encoder1);
      registry.register(encoder2);
      registry.register(encoder3);

      const supported = await registry.getSupportedFormats();
      expect(supported).toEqual(['webp', 'png']);
    });

    it('should return empty array when no codecs supported', async () => {
      const encoder = new MockEncoder('webp', 'image/webp', '.webp', false);
      registry.register(encoder);

      const supported = await registry.getSupportedFormats();
      expect(supported).toEqual([]);
    });
  });

  describe('utility methods', () => {
    it('should clear all codecs', () => {
      registry.register(new MockEncoder('webp'));
      registry.register(new MockEncoder('avif'));

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.isEmpty()).toBe(true);
    });

    it('should check if empty', () => {
      expect(registry.isEmpty()).toBe(true);

      registry.register(new MockEncoder('webp'));
      expect(registry.isEmpty()).toBe(false);
    });

    it('should get registered formats', () => {
      registry.register(new MockEncoder('webp'));
      registry.register(new MockEncoder('avif'));

      const formats = registry.getRegisteredFormats();
      expect(formats).toEqual(['webp', 'avif']);
    });
  });
});

describe('EncoderRegistry', () => {
  let registry: EncoderRegistry;

  beforeEach(() => {
    registry = new EncoderRegistry();
  });

  describe('encode', () => {
    it('should encode using registered encoder', async () => {
      const encoder = new MockEncoder('webp');
      registry.register(encoder);

      const imageData = new ImageData(100, 100);
      const result = await registry.encode(imageData, 'webp');

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(100);
    });

    it('should throw for unregistered format', async () => {
      const imageData = new ImageData(100, 100);

      await expect(registry.encode(imageData, 'webp')).rejects.toThrow(UnsupportedFormatError);
    });

    it('should throw for unsupported encoder', async () => {
      const encoder = new MockEncoder('webp', 'image/webp', '.webp', false);
      registry.register(encoder);

      const imageData = new ImageData(100, 100);

      await expect(registry.encode(imageData, 'webp')).rejects.toThrow(UnsupportedFormatError);
    });
  });

  describe('getDefaultOptions', () => {
    it('should return default options', () => {
      const encoder = new MockEncoder('webp');
      registry.register(encoder);

      const options = registry.getDefaultOptions('webp');
      expect(options).toEqual({ quality: 80 });
    });

    it('should throw for unregistered format', () => {
      expect(() => registry.getDefaultOptions('webp')).toThrow(UnsupportedFormatError);
    });
  });

  describe('validateOptions', () => {
    it('should validate options', () => {
      const encoder = new MockEncoder('webp');
      registry.register(encoder);

      expect(registry.validateOptions('webp', { quality: 80 })).toBe(true);
    });

    it('should return false for unregistered format', () => {
      expect(registry.validateOptions('webp', { quality: 80 })).toBe(false);
    });
  });
});

describe('DecoderRegistry', () => {
  let registry: DecoderRegistry;

  beforeEach(() => {
    registry = new DecoderRegistry();
  });

  describe('decode', () => {
    it('should decode using specified format', async () => {
      const decoder = new MockDecoder('webp');
      registry.register(decoder);

      const buffer = new ArrayBuffer(100);
      const result = await registry.decode(buffer, 'webp');

      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it('should auto-detect format when not specified', async () => {
      const decoder = new MockDecoder('webp');
      registry.register(decoder);

      // Create WebP-like buffer
      const buffer = new ArrayBuffer(12);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46; // RIFF
      bytes[8] = 0x57; bytes[9] = 0x45; bytes[10] = 0x42; bytes[11] = 0x50; // WEBP

      const result = await registry.decode(buffer);

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should throw for unregistered format', async () => {
      const buffer = new ArrayBuffer(100);

      await expect(registry.decode(buffer, 'webp')).rejects.toThrow(UnsupportedFormatError);
    });

    it('should throw when format cannot be detected', async () => {
      const buffer = new ArrayBuffer(100);

      await expect(registry.decode(buffer)).rejects.toThrow(ValidationError);
    });

    it('should throw when decoder cannot decode buffer', async () => {
      const decoder = new MockDecoder('webp', 'image/webp', '.webp', true, false);
      registry.register(decoder);

      const buffer = new ArrayBuffer(100);

      await expect(registry.decode(buffer, 'webp')).rejects.toThrow(ValidationError);
    });
  });

  describe('canDecode', () => {
    it('should check if buffer can be decoded with specified format', () => {
      const decoder = new MockDecoder('webp');
      registry.register(decoder);

      const buffer = new ArrayBuffer(100);
      expect(registry.canDecode(buffer, 'webp')).toBe(true);
    });

    it('should check all decoders when format not specified', () => {
      const decoder1 = new MockDecoder('webp', 'image/webp', '.webp', true, false);
      const decoder2 = new MockDecoder('avif', 'image/avif', '.avif', true, true);

      registry.register(decoder1);
      registry.register(decoder2);

      const buffer = new ArrayBuffer(100);
      expect(registry.canDecode(buffer)).toBe(true);
    });

    it('should return false for unregistered format', () => {
      const buffer = new ArrayBuffer(100);
      expect(registry.canDecode(buffer, 'webp')).toBe(false);
    });
  });

  describe('detectFormat', () => {
    it('should detect format using utility detector', () => {
      const decoder = new MockDecoder('webp');
      registry.register(decoder);

      // Create WebP-like buffer
      const buffer = new ArrayBuffer(12);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46; // RIFF
      bytes[8] = 0x57; bytes[9] = 0x45; bytes[10] = 0x42; bytes[11] = 0x50; // WEBP

      expect(registry.detectFormat(buffer)).toBe('webp');
    });

    it('should fall back to checking registered decoders', () => {
      const decoder = new MockDecoder('custom' as ImageFormat);
      registry.register(decoder);

      const buffer = new ArrayBuffer(100);
      expect(registry.detectFormat(buffer)).toBe('custom');
    });

    it('should return null when no format detected', () => {
      const buffer = new ArrayBuffer(100);
      expect(registry.detectFormat(buffer)).toBe(null);
    });
  });
});

describe('CodecManager', () => {
  let manager: CodecManager;

  beforeEach(() => {
    manager = new CodecManager();
  });

  describe('registration', () => {
    it('should register encoder and decoder separately', () => {
      const encoder = new MockEncoder('webp');
      const decoder = new MockDecoder('webp');

      manager.registerEncoder(encoder);
      manager.registerDecoder(decoder);

      expect(manager.encoders.get('webp')).toBe(encoder);
      expect(manager.decoders.get('webp')).toBe(decoder);
    });

    it('should register codec pair', () => {
      const encoder = new MockEncoder('webp');
      const decoder = new MockDecoder('webp');

      manager.registerCodec(encoder, decoder);

      expect(manager.encoders.get('webp')).toBe(encoder);
      expect(manager.decoders.get('webp')).toBe(decoder);
    });

    it('should throw when encoder and decoder formats do not match', () => {
      const encoder = new MockEncoder('webp');
      const decoder = new MockDecoder('avif');

      expect(() => manager.registerCodec(encoder, decoder)).toThrow(ValidationError);
    });

    it('should unregister format', () => {
      const encoder = new MockEncoder('webp');
      const decoder = new MockDecoder('webp');

      manager.registerCodec(encoder, decoder);
      manager.unregisterFormat('webp');

      expect(manager.encoders.get('webp')).toBeUndefined();
      expect(manager.decoders.get('webp')).toBeUndefined();
    });
  });

  describe('format support', () => {
    it('should get supported formats', async () => {
      const encoder = new MockEncoder('webp');
      const decoder = new MockDecoder('avif');

      manager.registerEncoder(encoder);
      manager.registerDecoder(decoder);

      const formats = await manager.getSupportedFormats();

      expect(formats.encoders).toEqual(['webp']);
      expect(formats.decoders).toEqual(['avif']);
      expect(formats.processors).toEqual([]);
    });

    it('should check encoding support', async () => {
      const encoder = new MockEncoder('webp');
      manager.registerEncoder(encoder);

      expect(await manager.canEncode('webp')).toBe(true);
      expect(await manager.canEncode('avif')).toBe(false);
    });

    it('should check decoding support', async () => {
      const decoder = new MockDecoder('webp');
      manager.registerDecoder(decoder);

      expect(await manager.canDecode('webp')).toBe(true);
      expect(await manager.canDecode('avif')).toBe(false);
    });
  });

  describe('conversion', () => {
    it('should convert between formats', async () => {
      const encoder = new MockEncoder('avif');
      const decoder = new MockDecoder('webp');

      manager.registerEncoder(encoder);
      manager.registerDecoder(decoder);

      const buffer = new ArrayBuffer(100);
      const result = await manager.convert(buffer, 'avif', {}, 'webp');

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(100);
    });

    it('should auto-detect source format', async () => {
      const encoder = new MockEncoder('avif');
      const decoder = new MockDecoder('webp');

      manager.registerEncoder(encoder);
      manager.registerDecoder(decoder);

      // Create WebP-like buffer
      const buffer = new ArrayBuffer(12);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46; // RIFF
      bytes[8] = 0x57; bytes[9] = 0x45; bytes[10] = 0x42; bytes[11] = 0x50; // WEBP

      const result = await manager.convert(buffer, 'avif');

      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('format information', () => {
    it('should get format info from encoder', () => {
      const encoder = new MockEncoder('webp');
      manager.registerEncoder(encoder);

      const info = manager.getFormatInfo('webp');

      expect(info.format).toBe('webp');
      expect(info.mimeType).toBe('image/webp');
      expect(info.extension).toBe('.webp');
      expect(info.supportsLossless).toBe(true);
      expect(info.supportsTransparency).toBe(true);
      expect(info.defaultOptions).toEqual({ quality: 80 });
    });

    it('should get format info from decoder when no encoder', () => {
      const decoder = new MockDecoder('webp');
      manager.registerDecoder(decoder);

      const info = manager.getFormatInfo('webp');

      expect(info.format).toBe('webp');
      expect(info.defaultOptions).toEqual({});
    });

    it('should throw for unsupported format', () => {
      expect(() => manager.getFormatInfo('webp')).toThrow(UnsupportedFormatError);
    });
  });

  describe('utility methods', () => {
    it('should detect format', () => {
      const decoder = new MockDecoder('webp');
      manager.registerDecoder(decoder);

      // Create WebP-like buffer
      const buffer = new ArrayBuffer(12);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46; // RIFF
      bytes[8] = 0x57; bytes[9] = 0x45; bytes[10] = 0x42; bytes[11] = 0x50; // WEBP

      expect(manager.detectFormat(buffer)).toBe('webp');
    });

    it('should clear all codecs', () => {
      const encoder = new MockEncoder('webp');
      const decoder = new MockDecoder('webp');

      manager.registerCodec(encoder, decoder);
      manager.clear();

      expect(manager.encoders.size()).toBe(0);
      expect(manager.decoders.size()).toBe(0);
    });
  });
});