/**
 * AVIF decoder tests
 */

import { AVIFDecoder } from '../avif-decoder.js';
import { DecodingError } from '../../../errors/index.js';

describe('AVIFDecoder', () => {
  let decoder: AVIFDecoder;

  beforeEach(() => {
    decoder = new AVIFDecoder();
  });

  describe('properties', () => {
    it('should have correct format properties', () => {
      expect(decoder.format).toBe('avif');
      expect(decoder.mimeType).toBe('image/avif');
      expect(decoder.extension).toBe('.avif');
    });
  });

  describe('canDecode', () => {
    it('should return true for valid AVIF signature', () => {
      // Create a mock AVIF buffer with ftyp box and avif brand
      const buffer = new ArrayBuffer(16);
      const view = new Uint8Array(buffer);
      
      // Set up ftyp box signature
      view[4] = 0x66; // 'f'
      view[5] = 0x74; // 't'
      view[6] = 0x79; // 'y'
      view[7] = 0x70; // 'p'
      view[8] = 0x61; // 'a'
      view[9] = 0x76; // 'v'
      view[10] = 0x69; // 'i'
      view[11] = 0x66; // 'f'

      expect(decoder.canDecode(buffer)).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const buffer = new ArrayBuffer(16);
      const view = new Uint8Array(buffer);
      view.fill(0);

      expect(decoder.canDecode(buffer)).toBe(false);
    });

    it('should return false for buffer too small', () => {
      const buffer = new ArrayBuffer(8);
      expect(decoder.canDecode(buffer)).toBe(false);
    });

    it('should return true for AVIF signature found elsewhere in first 32 bytes', () => {
      const buffer = new ArrayBuffer(32);
      const view = new Uint8Array(buffer);
      
      // Place 'avif' at offset 20
      view[20] = 0x61; // 'a'
      view[21] = 0x76; // 'v'
      view[22] = 0x69; // 'i'
      view[23] = 0x66; // 'f'

      expect(decoder.canDecode(buffer)).toBe(true);
    });
  });

  describe('decode', () => {
    it('should throw ValidationError for null buffer', async () => {
      const buffer = new ArrayBuffer(0);
      
      await expect(decoder.decode(buffer)).rejects.toThrow('Buffer is empty or invalid');
    });

    it('should throw ValidationError for invalid buffer', async () => {
      const buffer = new ArrayBuffer(16);
      const view = new Uint8Array(buffer);
      view.fill(0xFF); // Invalid data

      await expect(decoder.decode(buffer)).rejects.toThrow('Buffer does not contain valid avif data');
    });

    it('should validate buffer before decoding', async () => {
      const buffer = new ArrayBuffer(0);
      
      await expect(decoder.decode(buffer)).rejects.toThrow('Buffer is empty or invalid');
    });
  });

  describe('isSupported', () => {
    it('should check base support and module loading', async () => {
      // This test will depend on the actual WASM module being available
      // In a real environment, this would test the actual module loading
      const supported = await decoder.isSupported();
      expect(typeof supported).toBe('boolean');
    });
  });

  describe('checkSignature', () => {
    it('should correctly identify AVIF ftyp signature', () => {
      const buffer = new ArrayBuffer(16);
      const view = new Uint8Array(buffer);
      
      // Set up correct ftyp + avif signature
      view[4] = 0x66; // 'f'
      view[5] = 0x74; // 't'
      view[6] = 0x79; // 'y'
      view[7] = 0x70; // 'p'
      view[8] = 0x61; // 'a'
      view[9] = 0x76; // 'v'
      view[10] = 0x69; // 'i'
      view[11] = 0x66; // 'f'

      expect(decoder.canDecode(buffer)).toBe(true);
    });

    it('should reject non-AVIF signatures', () => {
      const buffer = new ArrayBuffer(16);
      const view = new Uint8Array(buffer);
      
      // Set up WebP signature instead
      view[0] = 0x52; // 'R'
      view[1] = 0x49; // 'I'
      view[2] = 0x46; // 'F'
      view[3] = 0x46; // 'F'
      view[8] = 0x57; // 'W'
      view[9] = 0x45; // 'E'
      view[10] = 0x42; // 'B'
      view[11] = 0x50; // 'P'

      expect(decoder.canDecode(buffer)).toBe(false);
    });
  });
});