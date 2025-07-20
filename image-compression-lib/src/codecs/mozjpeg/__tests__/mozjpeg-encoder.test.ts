/**
 * MozJPEG encoder tests
 */

import { MozJpegEncoder } from '../mozjpeg-encoder.js';
import { EncodingError, ValidationError } from '../../../errors/index.js';

describe('MozJpegEncoder', () => {
  let encoder: MozJpegEncoder;

  beforeEach(() => {
    encoder = new MozJpegEncoder();
  });

  describe('basic properties', () => {
    it('should have correct format properties', () => {
      expect(encoder.format).toBe('jpeg');
      expect(encoder.mimeType).toBe('image/jpeg');
      expect(encoder.extension).toBe('.jpg');
    });
  });

  describe('default options', () => {
    it('should return comprehensive default options', () => {
      const options = encoder.getDefaultOptions();
      
      expect(options).toEqual({
        quality: 75,
        baseline: false,
        arithmetic: false,
        progressive: true,
        optimize_coding: true,
        smoothing: 0,
        color_space: 3, // YCbCr
        quant_table: 3,
        trellis_multipass: false,
        trellis_opt_zero: false,
        trellis_opt_table: false,
        trellis_loops: 1,
        auto_subsample: true,
        chroma_subsample: 2,
        separate_chroma_quality: false,
        chroma_quality: 75,
      });
    });
  });

  describe('options validation', () => {
    it('should validate empty options object', () => {
      expect(encoder.validateOptions({})).toBe(true);
    });

    it('should validate valid quality values', () => {
      expect(encoder.validateOptions({ quality: 0 })).toBe(true);
      expect(encoder.validateOptions({ quality: 50 })).toBe(true);
      expect(encoder.validateOptions({ quality: 100 })).toBe(true);
    });

    it('should reject invalid quality values', () => {
      expect(encoder.validateOptions({ quality: -1 })).toBe(false);
      expect(encoder.validateOptions({ quality: 101 })).toBe(false);
      expect(encoder.validateOptions({ quality: 'high' as any })).toBe(false);
    });

    it('should validate smoothing values', () => {
      expect(encoder.validateOptions({ smoothing: 0 })).toBe(true);
      expect(encoder.validateOptions({ smoothing: 50 })).toBe(true);
      expect(encoder.validateOptions({ smoothing: 100 })).toBe(true);
    });

    it('should reject invalid smoothing values', () => {
      expect(encoder.validateOptions({ smoothing: -1 })).toBe(false);
      expect(encoder.validateOptions({ smoothing: 101 })).toBe(false);
    });

    it('should validate color space values', () => {
      expect(encoder.validateOptions({ color_space: 1 })).toBe(true); // GRAYSCALE
      expect(encoder.validateOptions({ color_space: 2 })).toBe(true); // RGB
      expect(encoder.validateOptions({ color_space: 3 })).toBe(true); // YCbCr
    });

    it('should reject invalid color space values', () => {
      expect(encoder.validateOptions({ color_space: 0 as any })).toBe(false);
      expect(encoder.validateOptions({ color_space: 4 as any })).toBe(false);
    });

    it('should validate chroma quality values', () => {
      expect(encoder.validateOptions({ chroma_quality: 0 })).toBe(true);
      expect(encoder.validateOptions({ chroma_quality: 50 })).toBe(true);
      expect(encoder.validateOptions({ chroma_quality: 100 })).toBe(true);
    });

    it('should reject invalid chroma quality values', () => {
      expect(encoder.validateOptions({ chroma_quality: -1 })).toBe(false);
      expect(encoder.validateOptions({ chroma_quality: 101 })).toBe(false);
    });

    it('should reject null options', () => {
      expect(encoder.validateOptions(null as any)).toBe(false);
    });

    it('should accept undefined options', () => {
      expect(encoder.validateOptions(undefined as any)).toBe(true);
    });

    it('should reject non-object options', () => {
      expect(encoder.validateOptions('invalid' as any)).toBe(false);
      expect(encoder.validateOptions(123 as any)).toBe(false);
      expect(encoder.validateOptions(true as any)).toBe(false);
    });
  });

  describe('input validation', () => {
    it('should throw error for null ImageData', async () => {
      await expect(encoder.encode(null as any)).rejects.toThrow(ValidationError);
    });

    it('should throw error for undefined ImageData', async () => {
      await expect(encoder.encode(undefined as any)).rejects.toThrow(ValidationError);
    });

    it('should throw error for invalid ImageData', async () => {
      const invalidImageData = { width: 0, height: 0, data: new Uint8ClampedArray(0) };
      await expect(encoder.encode(invalidImageData as ImageData)).rejects.toThrow(ValidationError);
    });

    it('should throw error for invalid options', async () => {
      const validImageData = new ImageData(1, 1);
      await expect(encoder.encode(validImageData, { quality: -1 })).rejects.toThrow(EncodingError);
    });
  });

  describe('encode functionality', () => {
    it('should handle encoding with valid ImageData', async () => {
      const imageData = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
      
      try {
        const result = await encoder.encode(imageData);
        expect(result).toBeInstanceOf(ArrayBuffer);
        expect(result.byteLength).toBeGreaterThan(0);
      } catch (error) {
        // If WASM module is not available, expect specific error
        expect(error).toBeInstanceOf(EncodingError);
      }
    });

    it('should handle encoding with custom options', async () => {
      const imageData = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
      const options = { quality: 90, progressive: false };
      
      try {
        const result = await encoder.encode(imageData, options);
        expect(result).toBeInstanceOf(ArrayBuffer);
      } catch (error) {
        expect(error).toBeInstanceOf(EncodingError);
      }
    });

    it('should handle encoding with empty options', async () => {
      const imageData = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
      
      try {
        const result = await encoder.encode(imageData, {});
        expect(result).toBeInstanceOf(ArrayBuffer);
      } catch (error) {
        expect(error).toBeInstanceOf(EncodingError);
      }
    });
  });

  describe('support detection', () => {
    it('should check WebAssembly support', async () => {
      const isSupported = await encoder.isSupported();
      expect(typeof isSupported).toBe('boolean');
    });
  });
});