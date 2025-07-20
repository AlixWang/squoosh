/**
 * Tests for JPEG XL encoder
 */

import { JXLEncoder, type JXLOptions } from '../jxl-encoder.js';
import { EncodingError, ValidationError } from '../../../errors/index.js';

// Mock the WASM module
const mockModule = {
  encode: jest.fn(),
};

const mockModuleFactory = jest.fn().mockResolvedValue(mockModule);

jest.mock('../enc/jxl_enc.js', () => ({
  __esModule: true,
  default: mockModuleFactory,
}));

describe('JXLEncoder', () => {
  let encoder: JXLEncoder;

  beforeEach(() => {
    encoder = new JXLEncoder();
    jest.clearAllMocks();
  });

  describe('format properties', () => {
    it('should have correct format properties', () => {
      expect(encoder.format).toBe('jpeg-xl');
      expect(encoder.mimeType).toBe('image/jxl');
      expect(encoder.extension).toBe('.jxl');
    });
  });

  describe('getDefaultOptions', () => {
    it('should return correct default options', () => {
      const defaults = encoder.getDefaultOptions();
      
      expect(defaults).toEqual({
        quality: 75,
        effort: 7,
        progressive: false,
        epf: -1,
        lossyPalette: false,
        decodingSpeedTier: 0,
        photonNoiseIso: 0,
        lossyModular: false,
      });
    });
  });

  describe('validateOptions', () => {
    it('should validate correct options', () => {
      const validOptions: JXLOptions = {
        quality: 80,
        effort: 5,
        progressive: true,
        epf: 2,
        lossyPalette: true,
        decodingSpeedTier: 2,
        photonNoiseIso: 100,
        lossyModular: true,
      };

      expect(encoder.validateOptions(validOptions)).toBe(true);
    });

    it('should reject invalid effort values', () => {
      expect(encoder.validateOptions({ effort: 0 })).toBe(false);
      expect(encoder.validateOptions({ effort: 10 })).toBe(false);
      expect(encoder.validateOptions({ effort: 'invalid' as any })).toBe(false);
    });

    it('should reject invalid epf values', () => {
      expect(encoder.validateOptions({ epf: -2 })).toBe(false);
      expect(encoder.validateOptions({ epf: 4 })).toBe(false);
      expect(encoder.validateOptions({ epf: 'invalid' as any })).toBe(false);
    });

    it('should reject invalid decodingSpeedTier values', () => {
      expect(encoder.validateOptions({ decodingSpeedTier: -1 })).toBe(false);
      expect(encoder.validateOptions({ decodingSpeedTier: 5 })).toBe(false);
      expect(encoder.validateOptions({ decodingSpeedTier: 'invalid' as any })).toBe(false);
    });

    it('should reject invalid photonNoiseIso values', () => {
      expect(encoder.validateOptions({ photonNoiseIso: -1 })).toBe(false);
      expect(encoder.validateOptions({ photonNoiseIso: 'invalid' as any })).toBe(false);
    });

    it('should reject invalid boolean options', () => {
      expect(encoder.validateOptions({ progressive: 'invalid' as any })).toBe(false);
      expect(encoder.validateOptions({ lossyPalette: 'invalid' as any })).toBe(false);
      expect(encoder.validateOptions({ lossyModular: 'invalid' as any })).toBe(false);
    });

    it('should accept valid effort range', () => {
      for (let effort = 1; effort <= 9; effort++) {
        expect(encoder.validateOptions({ effort })).toBe(true);
      }
    });

    it('should accept valid epf range', () => {
      for (let epf = -1; epf <= 3; epf++) {
        expect(encoder.validateOptions({ epf })).toBe(true);
      }
    });

    it('should accept valid decodingSpeedTier range', () => {
      for (let tier = 0; tier <= 4; tier++) {
        expect(encoder.validateOptions({ decodingSpeedTier: tier })).toBe(true);
      }
    });
  });

  describe('encode', () => {
    const mockImageData = new ImageData(100, 100);

    it('should throw ValidationError for invalid ImageData', async () => {
      const invalidImageData = {} as ImageData;

      await expect(encoder.encode(invalidImageData)).rejects.toThrow(ValidationError);
    });

    it('should throw EncodingError for invalid options', async () => {
      const invalidOptions = { effort: 0 };

      await expect(encoder.encode(mockImageData, invalidOptions)).rejects.toThrow(EncodingError);
      await expect(encoder.encode(mockImageData, invalidOptions)).rejects.toThrow('Invalid JPEG XL encoding options');
    });
  });

  describe('isSupported', () => {
    it('should return false when WebAssembly is not supported', async () => {
      // Mock WebAssembly as undefined
      const originalWebAssembly = global.WebAssembly;
      (global as any).WebAssembly = undefined;

      const supported = await encoder.isSupported();
      expect(supported).toBe(false);

      // Restore WebAssembly
      global.WebAssembly = originalWebAssembly;
    });
  });
});