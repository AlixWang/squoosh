/**
 * Tests for JPEG XL decoder
 */

import { JXLDecoder } from '../jxl-decoder.js';
import { DecodingError, ValidationError } from '../../../errors/index.js';

// Mock the WASM module
const mockModule = {
  decode: jest.fn(),
};

const mockModuleFactory = jest.fn().mockResolvedValue(mockModule);

jest.mock('../dec/jxl_dec.js', () => ({
  __esModule: true,
  default: mockModuleFactory,
}));

describe('JXLDecoder', () => {
  let decoder: JXLDecoder;

  beforeEach(() => {
    decoder = new JXLDecoder();
    jest.clearAllMocks();
  });

  describe('format properties', () => {
    it('should have correct format properties', () => {
      expect(decoder.format).toBe('jpeg-xl');
      expect(decoder.mimeType).toBe('image/jxl');
      expect(decoder.extension).toBe('.jxl');
    });
  });

  describe('canDecode', () => {
    it('should detect JPEG XL naked codestream signature', () => {
      const buffer = new ArrayBuffer(12);
      const view = new Uint8Array(buffer);
      view[0] = 0xFF;
      view[1] = 0x0A;

      expect(decoder.canDecode(buffer)).toBe(true);
    });

    it('should detect JPEG XL container format signature', () => {
      const buffer = new ArrayBuffer(12);
      const view = new Uint8Array(buffer);
      // Container format signature
      view[0] = 0x00; view[1] = 0x00; view[2] = 0x00; view[3] = 0x0C;
      view[4] = 0x4A; view[5] = 0x58; view[6] = 0x4C; view[7] = 0x20;
      view[8] = 0x0D; view[9] = 0x0A; view[10] = 0x87; view[11] = 0x0A;

      expect(decoder.canDecode(buffer)).toBe(true);
    });

    it('should reject non-JPEG XL buffers', () => {
      const buffer = new ArrayBuffer(12);
      const view = new Uint8Array(buffer);
      view[0] = 0x89; // PNG signature start
      view[1] = 0x50;

      expect(decoder.canDecode(buffer)).toBe(false);
    });

    it('should reject buffers that are too small', () => {
      const buffer = new ArrayBuffer(8);
      expect(decoder.canDecode(buffer)).toBe(false);
    });
  });

  describe('decode', () => {
    it('should throw ValidationError for invalid buffer', async () => {
      const buffer = new ArrayBuffer(0);

      await expect(decoder.decode(buffer)).rejects.toThrow(ValidationError);
      await expect(decoder.decode(buffer)).rejects.toThrow('Buffer is empty or invalid');
    });
  });

  describe('isSupported', () => {
    it('should return false when WebAssembly is not supported', async () => {
      // Mock WebAssembly as undefined
      const originalWebAssembly = global.WebAssembly;
      (global as any).WebAssembly = undefined;

      const supported = await decoder.isSupported();
      expect(supported).toBe(false);

      // Restore WebAssembly
      global.WebAssembly = originalWebAssembly;
    });
  });
});