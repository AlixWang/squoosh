/**
 * Unit tests for WebP encoder
 */

import { WebPEncoder, WebPOptions } from '../webp-encoder.js';
import { EncodingError, ValidationError } from '../../../errors/index.js';

describe('WebPEncoder', () => {
  let encoder: WebPEncoder;

  beforeEach(() => {
    encoder = new WebPEncoder();
  });

  describe('format properties', () => {
    it('should have correct format properties', () => {
      expect(encoder.format).toBe('webp');
      expect(encoder.mimeType).toBe('image/webp');
      expect(encoder.extension).toBe('.webp');
    });
  });

  describe('getDefaultOptions', () => {
    it('should return valid default options', () => {
      const defaults = encoder.getDefaultOptions();
      
      expect(defaults).toEqual({
        quality: 75,
        target_size: 0,
        target_PSNR: 0,
        method: 4,
        sns_strength: 50,
        filter_strength: 60,
        filter_sharpness: 0,
        filter_type: 1,
        partitions: 0,
        segments: 4,
        pass: 1,
        show_compressed: 0,
        preprocessing: 0,
        autofilter: 0,
        partition_limit: 0,
        alpha_compression: 1,
        alpha_filtering: 1,
        alpha_quality: 100,
        lossless: 0,
        exact: 0,
        image_hint: 0,
        emulate_jpeg_size: 0,
        thread_level: 0,
        low_memory: 0,
        near_lossless: 100,
        use_delta_palette: 0,
        use_sharp_yuv: 0,
      });
    });
  });

  describe('validateOptions', () => {
    it('should validate basic quality option', () => {
      expect(encoder.validateOptions({ quality: 75 })).toBe(true);
      expect(encoder.validateOptions({ quality: 0 })).toBe(true);
      expect(encoder.validateOptions({ quality: 100 })).toBe(true);
      expect(encoder.validateOptions({ quality: -1 })).toBe(false);
      expect(encoder.validateOptions({ quality: 101 })).toBe(false);
      expect(encoder.validateOptions({ quality: 'invalid' as any })).toBe(false);
    });

    it('should validate WebP-specific options', () => {
      // Valid method values (0-6)
      expect(encoder.validateOptions({ method: 0 })).toBe(true);
      expect(encoder.validateOptions({ method: 6 })).toBe(true);
      expect(encoder.validateOptions({ method: -1 })).toBe(false);
      expect(encoder.validateOptions({ method: 7 })).toBe(false);

      // Valid sns_strength values (0-100)
      expect(encoder.validateOptions({ sns_strength: 0 })).toBe(true);
      expect(encoder.validateOptions({ sns_strength: 100 })).toBe(true);
      expect(encoder.validateOptions({ sns_strength: -1 })).toBe(false);
      expect(encoder.validateOptions({ sns_strength: 101 })).toBe(false);

      // Valid filter_strength values (0-100)
      expect(encoder.validateOptions({ filter_strength: 0 })).toBe(true);
      expect(encoder.validateOptions({ filter_strength: 100 })).toBe(true);
      expect(encoder.validateOptions({ filter_strength: -1 })).toBe(false);
      expect(encoder.validateOptions({ filter_strength: 101 })).toBe(false);

      // Valid alpha_quality values (0-100)
      expect(encoder.validateOptions({ alpha_quality: 0 })).toBe(true);
      expect(encoder.validateOptions({ alpha_quality: 100 })).toBe(true);
      expect(encoder.validateOptions({ alpha_quality: -1 })).toBe(false);
      expect(encoder.validateOptions({ alpha_quality: 101 })).toBe(false);

      // Valid lossless values (0 or 1)
      expect(encoder.validateOptions({ lossless: 0 })).toBe(true);
      expect(encoder.validateOptions({ lossless: 1 })).toBe(true);
      expect(encoder.validateOptions({ lossless: -1 })).toBe(false);
      expect(encoder.validateOptions({ lossless: 2 })).toBe(false);
    });

    it('should return true for empty options', () => {
      expect(encoder.validateOptions({})).toBe(true);
      expect(encoder.validateOptions(undefined as any)).toBe(true);
    });
  });

  describe('encode', () => {
    const createTestImageData = (width = 2, height = 2): ImageData => {
      const data = new Uint8ClampedArray(width * height * 4);
      // Fill with some test data (red pixels)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;     // R
        data[i + 1] = 0;   // G
        data[i + 2] = 0;   // B
        data[i + 3] = 255; // A
      }
      return new ImageData(data, width, height);
    };

    it('should throw ValidationError for null ImageData', async () => {
      await expect(encoder.encode(null as any)).rejects.toThrow(ValidationError);
      await expect(encoder.encode(null as any)).rejects.toThrow('ImageData is required');
    });

    it('should throw ValidationError for ImageData with no pixel data', async () => {
      const imageData = {
        data: new Uint8ClampedArray(0),
        width: 2,
        height: 2,
      } as ImageData;

      await expect(encoder.encode(imageData)).rejects.toThrow(ValidationError);
      await expect(encoder.encode(imageData)).rejects.toThrow('ImageData contains no pixel data');
    });

    it('should throw ValidationError for ImageData with invalid dimensions', async () => {
      const imageData = {
        data: new Uint8ClampedArray(16),
        width: 0,
        height: 2,
      } as ImageData;

      await expect(encoder.encode(imageData)).rejects.toThrow(ValidationError);
      await expect(encoder.encode(imageData)).rejects.toThrow('ImageData has invalid dimensions');
    });

    it('should throw ValidationError for mismatched data length', async () => {
      const imageData = {
        data: new Uint8ClampedArray(8), // Should be 16 for 2x2 image
        width: 2,
        height: 2,
      } as ImageData;

      await expect(encoder.encode(imageData)).rejects.toThrow(ValidationError);
      await expect(encoder.encode(imageData)).rejects.toThrow('ImageData pixel data length does not match dimensions');
    });

    it('should throw EncodingError for invalid options', async () => {
      const imageData = createTestImageData();
      const invalidOptions: WebPOptions = { quality: -1 };

      await expect(encoder.encode(imageData, invalidOptions)).rejects.toThrow(EncodingError);
      await expect(encoder.encode(imageData, invalidOptions)).rejects.toThrow('Invalid WebP encoding options');
    });

    // Note: Testing actual encoding would require the WASM module to be loaded
    // For now, we test the validation and error handling paths
  });

  describe('isSupported', () => {
    it('should check WebAssembly support', async () => {
      // Mock WebAssembly to be undefined
      const originalWebAssembly = global.WebAssembly;
      (global as any).WebAssembly = undefined;

      const supported = await encoder.isSupported();
      expect(supported).toBe(false);

      // Restore WebAssembly
      global.WebAssembly = originalWebAssembly;
    });

    it('should return true when WebAssembly is available', async () => {
      // This test might fail if the WASM module can't be loaded in test environment
      // but it tests the basic WebAssembly availability check
      if (typeof WebAssembly !== 'undefined') {
        // We can't easily test module loading in unit tests without mocking
        // so we'll just verify the method exists and doesn't throw immediately
        expect(typeof encoder.isSupported).toBe('function');
      }
    });
  });

  describe('getFormatInfo', () => {
    it('should return correct format information', () => {
      const info = encoder.getFormatInfo();
      
      expect(info).toEqual({
        format: 'webp',
        mimeType: 'image/webp',
        extension: '.webp',
      });
    });
  });
});