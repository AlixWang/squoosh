/**
 * MozJPEG decoder tests
 */

import { MozJpegDecoder } from '../mozjpeg-decoder.js';
import { DecodingError, ValidationError } from '../../../errors/index.js';

describe('MozJpegDecoder', () => {
  let decoder: MozJpegDecoder;

  beforeEach(() => {
    decoder = new MozJpegDecoder();
  });

  describe('basic properties', () => {
    it('should have correct format properties', () => {
      expect(decoder.format).toBe('jpeg');
      expect(decoder.mimeType).toBe('image/jpeg');
      expect(decoder.extension).toBe('.jpg');
    });
  });

  describe('signature detection', () => {
    it('should detect valid JPEG signature', () => {
      // JPEG signature: FF D8 FF
      const validSignature = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      const buffer = validSignature.buffer;
      
      expect(decoder.canDecode(buffer)).toBe(true);
    });

    it('should detect JPEG with different APP marker', () => {
      // JPEG with APP1 marker
      const validSignature = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x16]);
      const buffer = validSignature.buffer;
      
      expect(decoder.canDecode(buffer)).toBe(true);
    });

    it('should reject invalid JPEG signature', () => {
      const invalidSignature = new Uint8Array([0xFF, 0xD8, 0xFE, 0xE0]); // Wrong third byte
      const buffer = invalidSignature.buffer;
      
      expect(decoder.canDecode(buffer)).toBe(false);
    });

    it('should reject buffer that is too short', () => {
      const shortBuffer = new Uint8Array([0xFF, 0xD8]).buffer;
      
      expect(decoder.canDecode(shortBuffer)).toBe(false);
    });

    it('should reject completely wrong signature', () => {
      const wrongSignature = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).buffer; // PNG signature
      
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
      const invalidBuffer = new Uint8Array([0x89, 0x50, 0x4E, 0x47]).buffer;
      await expect(decoder.decode(invalidBuffer)).rejects.toThrow(ValidationError);
    });
  });

  describe('decode functionality', () => {
    it('should handle decode errors gracefully', async () => {
      // Valid signature but invalid JPEG data
      const invalidJpegData = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, // Valid JPEG signature
        0x00, 0x10, 0x4A, 0x46, // APP0 marker
        0x49, 0x46, 0x00, 0x01, // Invalid data
        0xFF, 0xFF, 0xFF, 0xFF  // More invalid data
      ]).buffer;

      await expect(decoder.decode(invalidJpegData)).rejects.toThrow(DecodingError);
    });
  });

  describe('support detection', () => {
    it('should check WebAssembly support', async () => {
      const isSupported = await decoder.isSupported();
      expect(typeof isSupported).toBe('boolean');
    });
  });
});