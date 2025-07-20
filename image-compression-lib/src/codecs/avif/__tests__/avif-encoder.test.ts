/**
 * AVIF encoder tests
 */

import { AVIFEncoder, AVIFOptions } from '../avif-encoder.js';
import { EncodingError } from '../../../errors/index.js';

describe('AVIFEncoder', () => {
  let encoder: AVIFEncoder;

  beforeEach(() => {
    encoder = new AVIFEncoder();
  });

  describe('properties', () => {
    it('should have correct format properties', () => {
      expect(encoder.format).toBe('avif');
      expect(encoder.mimeType).toBe('image/avif');
      expect(encoder.extension).toBe('.avif');
    });
  });

  describe('getDefaultOptions', () => {
    it('should return valid default options', () => {
      const options = encoder.getDefaultOptions();
      
      expect(options).toEqual({
        quality: 50,
        qualityAlpha: 50,
        denoiseLevel: 0,
        tileRowsLog2: 0,
        tileColsLog2: 0,
        speed: 6,
        subsample: 1,
        chromaDeltaQ: false,
        sharpness: 0,
        enableSharpYUV: false,
        tune: 0, // AVIFTune.auto
      });
    });
  });

  describe('validateOptions', () => {
    it('should accept valid options', () => {
      const validOptions: AVIFOptions = {
        quality: 75,
        qualityAlpha: 80,
        denoiseLevel: 5,
        speed: 4,
        subsample: 1,
        chromaDeltaQ: true,
        sharpness: 2,
        enableSharpYUV: true,
        tune: 1,
      };

      expect(encoder.validateOptions(validOptions)).toBe(true);
    });

    it('should reject invalid quality values', () => {
      const invalidOptions: AVIFOptions = {
        quality: 150, // Invalid: > 100
      };

      expect(encoder.validateOptions(invalidOptions)).toBe(false);
    });

    it('should reject invalid qualityAlpha values', () => {
      const invalidOptions: AVIFOptions = {
        qualityAlpha: -10, // Invalid: < 0
      };

      expect(encoder.validateOptions(invalidOptions)).toBe(false);
    });

    it('should reject invalid denoiseLevel values', () => {
      const invalidOptions: AVIFOptions = {
        denoiseLevel: 100, // Invalid: > 50
      };

      expect(encoder.validateOptions(invalidOptions)).toBe(false);
    });

    it('should reject invalid tileRowsLog2 values', () => {
      const invalidOptions: AVIFOptions = {
        tileRowsLog2: 10, // Invalid: > 6
      };

      expect(encoder.validateOptions(invalidOptions)).toBe(false);
    });

    it('should reject invalid tileColsLog2 values', () => {
      const invalidOptions: AVIFOptions = {
        tileColsLog2: -1, // Invalid: < 0
      };

      expect(encoder.validateOptions(invalidOptions)).toBe(false);
    });

    it('should reject invalid speed values', () => {
      const invalidOptions: AVIFOptions = {
        speed: 15, // Invalid: > 10
      };

      expect(encoder.validateOptions(invalidOptions)).toBe(false);
    });

    it('should reject invalid subsample values', () => {
      const invalidOptions: AVIFOptions = {
        subsample: 3, // Invalid: not 0, 1, or 2
      };

      expect(encoder.validateOptions(invalidOptions)).toBe(false);
    });

    it('should reject invalid sharpness values', () => {
      const invalidOptions: AVIFOptions = {
        sharpness: 10, // Invalid: > 7
      };

      expect(encoder.validateOptions(invalidOptions)).toBe(false);
    });

    it('should reject invalid tune values', () => {
      const invalidOptions: AVIFOptions = {
        tune: 5 as any, // Invalid: not 0, 1, or 2
      };

      expect(encoder.validateOptions(invalidOptions)).toBe(false);
    });

    it('should accept empty options', () => {
      expect(encoder.validateOptions({})).toBe(true);
    });

    it('should accept undefined options', () => {
      expect(encoder.validateOptions(undefined as any)).toBe(true);
    });
  });

  describe('encode', () => {
    const createTestImageData = (width = 100, height = 100): ImageData => {
      const data = new Uint8ClampedArray(width * height * 4);
      // Fill with red pixels
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;     // R
        data[i + 1] = 0;   // G
        data[i + 2] = 0;   // B
        data[i + 3] = 255; // A
      }
      return new ImageData(data, width, height);
    };

    it('should throw ValidationError for invalid ImageData', async () => {
      const invalidImageData = new ImageData(new Uint8ClampedArray(0), 0, 0);
      
      await expect(encoder.encode(invalidImageData)).rejects.toThrow('ImageData contains no pixel data');
    });

    it('should throw EncodingError for invalid options', async () => {
      const imageData = createTestImageData();
      const invalidOptions: AVIFOptions = {
        quality: 150, // Invalid
      };

      await expect(encoder.encode(imageData, invalidOptions)).rejects.toThrow(EncodingError);
    });

    it('should validate ImageData before encoding', async () => {
      const invalidImageData = {
        data: new Uint8ClampedArray(0),
        width: 0,
        height: 0,
      } as ImageData;

      await expect(encoder.encode(invalidImageData)).rejects.toThrow('ImageData contains no pixel data');
    });
  });

  describe('isSupported', () => {
    it('should check base support and module loading', async () => {
      // This test will depend on the actual WASM module being available
      // In a real environment, this would test the actual module loading
      const supported = await encoder.isSupported();
      expect(typeof supported).toBe('boolean');
    });
  });

  describe('convertToAVIFOptions', () => {
    it('should merge options with defaults correctly', () => {
      const customOptions: AVIFOptions = {
        quality: 80,
        speed: 2,
      };

      // Access private method for testing (in real implementation, this would be tested indirectly)
      const result = (encoder as any).convertToAVIFOptions(customOptions);
      
      expect(result.quality).toBe(80);
      expect(result.speed).toBe(2);
      expect(result.qualityAlpha).toBe(50); // Default value
      expect(result.denoiseLevel).toBe(0); // Default value
    });

    it('should use all defaults when no options provided', () => {
      const result = (encoder as any).convertToAVIFOptions({});
      const defaults = encoder.getDefaultOptions();
      
      expect(result.quality).toBe(defaults.quality);
      expect(result.qualityAlpha).toBe(defaults.qualityAlpha);
      expect(result.denoiseLevel).toBe(defaults.denoiseLevel);
      expect(result.speed).toBe(defaults.speed);
    });
  });
});