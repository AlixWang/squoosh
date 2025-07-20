/**
 * PNG decoder tests
 */

// Mock the PNG WASM module
jest.mock('../pkg/squoosh_png.js', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({}),
  decode: jest.fn().mockImplementation((data) => {
    // Simulate error for invalid PNG data (check for specific invalid pattern)
    const view = new Uint8Array(data);
    if (view.length > 12 && view[8] === 0x00 && view[9] === 0x00 && view[10] === 0x00 && view[11] === 0x0D) {
      throw new Error('Invalid PNG data');
    }
    return new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
  }),
}));

import { PngDecoder } from '../png-decoder.js';
import { DecodingError, ValidationError } from '../../../errors/index.js';

describe('PngDecoder', () => {
  let decoder: PngDecoder;

  beforeEach(() => {
    decoder = new PngDecoder();
  });

  describe('basic properties', () => {
    it('should have correct format properties', () => {
      expect(decoder.format).toBe('png');
      expect(decoder.mimeType).toBe('image/png');
      expect(decoder.extension).toBe('.png');
    });
  });

  describe('signature detection', () => {
    it('should detect valid PNG signature', () => {
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      const validSignature = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
      const buffer = validSignature.buffer;
      
      expect(decoder.canDecode(buffer)).toBe(true);
    });

    it('should reject invalid PNG signature', () => {
      const invalidSignature = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0B]); // Wrong last byte
      const buffer = invalidSignature.buffer;
      
      expect(decoder.canDecode(buffer)).toBe(false);
    });

    it('should reject buffer that is too short', () => {
      const shortBuffer = new Uint8Array([0x89, 0x50, 0x4E]).buffer;
      
      expect(decoder.canDecode(shortBuffer)).toBe(false);
    });

    it('should reject completely wrong signature', () => {
      const wrongSignature = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]).buffer; // JPEG signature
      
      expect(decoder.canDecode(wrongSignature)).toBe(false);
    });
  });

  describe('input validation', () => {
    it('should throw error for null buffer', async () => {
      await expect(decoder.decode(null as any)).rejects.toThrow(ValidationError);
    });

    it('should throw error for undefined buffer', async () => {
      await expect(decoder.decode(undefined as any)).rejects.toThrow(ValidationError);
    });

    it('should throw error for empty buffer', async () => {
      const emptyBuffer = new ArrayBuffer(0);
      await expect(decoder.decode(emptyBuffer)).rejects.toThrow(ValidationError);
    });

    it('should throw error for invalid signature during decode', async () => {
      const invalidBuffer = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]).buffer;
      await expect(decoder.decode(invalidBuffer)).rejects.toThrow(ValidationError);
    });
  });

  describe('decode functionality', () => {
    it('should handle decode errors gracefully', async () => {
      // Valid signature but invalid PNG data
      const invalidPngData = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // Valid PNG signature
        0x00, 0x00, 0x00, 0x0D, // Invalid chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR chunk type
        0xFF, 0xFF, 0xFF, 0xFF  // Invalid data
      ]).buffer;

      await expect(decoder.decode(invalidPngData)).rejects.toThrow(DecodingError);
    });
  });

  describe('support detection', () => {
    it('should check WebAssembly support', async () => {
      // This test depends on the environment
      const isSupported = await decoder.isSupported();
      expect(typeof isSupported).toBe('boolean');
    });
  });
});