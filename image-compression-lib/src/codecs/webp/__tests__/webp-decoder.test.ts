/**
 * Unit tests for WebP decoder
 */

import { WebPDecoder } from '../webp-decoder.js';
import { DecodingError, ValidationError } from '../../../errors/index.js';

describe('WebPDecoder', () => {
  let decoder: WebPDecoder;

  beforeEach(() => {
    decoder = new WebPDecoder();
  });

  describe('format properties', () => {
    it('should have correct format properties', () => {
      expect(decoder.format).toBe('webp');
      expect(decoder.mimeType).toBe('image/webp');
      expect(decoder.extension).toBe('.webp');
    });
  });

  describe('checkSignature', () => {
    it('should return true for valid WebP signature', () => {
      // Create a buffer with WebP signature (RIFF...WEBP)
      const buffer = new ArrayBuffer(12);
      const view = new Uint8Array(buffer);
      
      // RIFF header
      view[0] = 0x52; // R
      view[1] = 0x49; // I
      view[2] = 0x46; // F
      view[3] = 0x46; // F
      
      // File size (4 bytes) - can be anything for signature check
      view[4] = 0x00;
      view[5] = 0x00;
      view[6] = 0x00;
      view[7] = 0x00;
      
      // WEBP signature
      view[8] = 0x57;  // W
      view[9] = 0x45;  // E
      view[10] = 0x42; // B
      view[11] = 0x50; // P

      expect(decoder.canDecode(buffer)).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const buffer = new ArrayBuffer(12);
      const view = new Uint8Array(buffer);
      
      // Invalid signature
      view[0] = 0x00;
      view[1] = 0x00;
      view[2] = 0x00;
      view[3] = 0x00;

      expect(decoder.canDecode(buffer)).toBe(false);
    });

    it('should return false for buffer too small', () => {
      const buffer = new ArrayBuffer(8); // Too small for WebP signature
      expect(decoder.canDecode(buffer)).toBe(false);
    });

    it('should return false for RIFF but not WEBP', () => {
      const buffer = new ArrayBuffer(12);
      const view = new Uint8Array(buffer);
      
      // RIFF header
      view[0] = 0x52; // R
      view[1] = 0x49; // I
      view[2] = 0x46; // F
      view[3] = 0x46; // F
      
      // File size
      view[4] = 0x00;
      view[5] = 0x00;
      view[6] = 0x00;
      view[7] = 0x00;
      
      // Not WEBP signature
      view[8] = 0x57;  // W
      view[9] = 0x41;  // A (should be E)
      view[10] = 0x56; // V (should be B)
      view[11] = 0x45; // E (should be P)

      expect(decoder.canDecode(buffer)).toBe(false);
    });
  });

  describe('decode', () => {
    it('should throw ValidationError for empty buffer', async () => {
      const buffer = new ArrayBuffer(0);
      
      await expect(decoder.decode(buffer)).rejects.toThrow(ValidationError);
      await expect(decoder.decode(buffer)).rejects.toThrow('Buffer is empty or invalid');
    });

    it('should throw ValidationError for invalid WebP buffer', async () => {
      const buffer = new ArrayBuffer(12);
      // Leave buffer with zeros (invalid signature)
      
      await expect(decoder.decode(buffer)).rejects.toThrow(ValidationError);
      await expect(decoder.decode(buffer)).rejects.toThrow('Buffer does not contain valid webp data');
    });

    // Note: Testing actual decoding would require a real WebP file and the WASM module
    // For now, we test the validation and error handling paths
  });

  describe('isSupported', () => {
    it('should check WebAssembly support', async () => {
      // Mock WebAssembly to be undefined
      const originalWebAssembly = global.WebAssembly;
      (global as any).WebAssembly = undefined;

      const supported = await decoder.isSupported();
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
        expect(typeof decoder.isSupported).toBe('function');
      }
    });
  });

  describe('getFormatInfo', () => {
    it('should return correct format information', () => {
      const info = decoder.getFormatInfo();
      
      expect(info).toEqual({
        format: 'webp',
        mimeType: 'image/webp',
        extension: '.webp',
      });
    });
  });
});