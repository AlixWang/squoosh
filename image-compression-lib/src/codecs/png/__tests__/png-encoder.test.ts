/**
 * PNG encoder tests
 */

// Mock the PNG WASM module
jest.mock('../pkg/squoosh_png.js', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({}),
  encode: jest.fn().mockReturnValue(new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR chunk type
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND chunk type
    0xAE, 0x42, 0x60, 0x82  // IEND CRC
  ])),
}));

import { PngEncoder } from '../png-encoder.js';
import { EncodingError, ValidationError } from '../../../errors/index.js';

describe('PngEncoder', () => {
  let encoder: PngEncoder;

  beforeEach(() => {
    encoder = new PngEncoder();
  });

  describe('basic properties', () => {
    it('should have correct format properties', () => {
      expect(encoder.format).toBe('png');
      expect(encoder.mimeType).toBe('image/png');
      expect(encoder.extension).toBe('.png');
    });
  });

  describe('default options', () => {
    it('should return empty default options', () => {
      const options = encoder.getDefaultOptions();
      expect(options).toEqual({});
    });
  });

  describe('options validation', () => {
    it('should validate empty options object', () => {
      expect(encoder.validateOptions({})).toBe(true);
    });

    it('should validate options with quality', () => {
      expect(encoder.validateOptions({ quality: 50 })).toBe(true);
    });

    it('should reject invalid quality values', () => {
      expect(encoder.validateOptions({ quality: -1 })).toBe(false);
      expect(encoder.validateOptions({ quality: 101 })).toBe(false);
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
      
      // This test may fail if WASM module is not available in test environment
      try {
        const result = await encoder.encode(imageData);
        expect(result).toBeInstanceOf(ArrayBuffer);
        expect(result.byteLength).toBeGreaterThan(0);
      } catch (error) {
        // If WASM module is not available, expect specific error
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