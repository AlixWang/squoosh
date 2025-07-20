/**
 * Integration tests for JPEG XL codec with the main library
 */

import { ImageCompressor } from '../../../image-compressor.js';
import { CodecManager } from '../../codec-registry.js';
import { registerJXLCodecs } from '../register.js';

// Mock the WASM modules
jest.mock('../dec/jxl_dec.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../enc/jxl_enc.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('JPEG XL Integration', () => {
  let compressor: ImageCompressor;
  let codecManager: CodecManager;

  beforeEach(() => {
    codecManager = new CodecManager();
    registerJXLCodecs(codecManager);
    compressor = new ImageCompressor(codecManager);
  });

  describe('format support', () => {
    it('should support JPEG XL format', () => {
      const supportedFormats = compressor.getSupportedFormats();

      expect(supportedFormats.encoders).toContain('jpeg-xl');
      expect(supportedFormats.decoders).toContain('jpeg-xl');
    });

    it('should provide JPEG XL format info', () => {
      const formatInfo = compressor.getFormatInfo('jpeg-xl');

      expect(formatInfo).toBeDefined();
      expect(formatInfo.format).toBe('jpeg-xl');
      expect(formatInfo.mimeType).toBe('image/jxl');
      expect(formatInfo.extension).toBe('.jxl');
      expect(formatInfo.supportsLossless).toBe(true);
      expect(formatInfo.supportsTransparency).toBe(true);
    });
  });

  describe('format detection', () => {
    it('should detect JPEG XL naked codestream format', () => {
      const buffer = new ArrayBuffer(12);
      const view = new Uint8Array(buffer);
      view[0] = 0xFF;
      view[1] = 0x0A;

      const detectedFormat = compressor.detectFormat(buffer);
      expect(detectedFormat).toBe('jpeg-xl');
    });

    it('should detect JPEG XL container format', () => {
      const buffer = new ArrayBuffer(12);
      const view = new Uint8Array(buffer);
      // Container format signature
      view[0] = 0x00; view[1] = 0x00; view[2] = 0x00; view[3] = 0x0C;
      view[4] = 0x4A; view[5] = 0x58; view[6] = 0x4C; view[7] = 0x20;
      view[8] = 0x0D; view[9] = 0x0A; view[10] = 0x87; view[11] = 0x0A;

      const detectedFormat = compressor.detectFormat(buffer);
      expect(detectedFormat).toBe('jpeg-xl');
    });

    it('should not detect non-JPEG XL formats as JPEG XL', () => {
      const buffer = new ArrayBuffer(12);
      const view = new Uint8Array(buffer);
      // WebP signature
      view[0] = 0x52; view[1] = 0x49; view[2] = 0x46; view[3] = 0x46;
      view[8] = 0x57; view[9] = 0x45; view[10] = 0x42; view[11] = 0x50;

      const detectedFormat = compressor.detectFormat(buffer);
      expect(detectedFormat).not.toBe('jpeg-xl');
    });
  });

  describe('codec access', () => {
    it('should provide access to JPEG XL encoder', () => {
      const encoder = codecManager.encoders.get('jpeg-xl');

      expect(encoder).toBeDefined();
      expect(encoder?.format).toBe('jpeg-xl');
      expect(encoder?.mimeType).toBe('image/jxl');
      expect(encoder?.extension).toBe('.jxl');
    });

    it('should provide access to JPEG XL decoder', () => {
      const decoder = codecManager.decoders.get('jpeg-xl');

      expect(decoder).toBeDefined();
      expect(decoder?.format).toBe('jpeg-xl');
      expect(decoder?.mimeType).toBe('image/jxl');
      expect(decoder?.extension).toBe('.jxl');
    });
  });

  describe('options validation', () => {
    it('should validate JPEG XL encoding options', () => {
      const encoder = codecManager.encoders.get('jpeg-xl');

      expect(encoder?.validateOptions({ quality: 75, effort: 7 })).toBe(true);
      expect(encoder?.validateOptions({ effort: 0 })).toBe(false); // Invalid effort
      expect(encoder?.validateOptions({ epf: 5 })).toBe(false); // Invalid EPF
    });

    it('should provide default JPEG XL options', () => {
      const encoder = codecManager.encoders.get('jpeg-xl');
      const defaultOptions = encoder?.getDefaultOptions();

      expect(defaultOptions).toEqual({
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
});