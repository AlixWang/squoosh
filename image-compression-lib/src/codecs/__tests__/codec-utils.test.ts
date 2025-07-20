/**
 * Tests for codec utilities
 */

import { FormatDetector, FeatureDetector, CodecValidator } from '../codec-utils.js';
import { ImageFormat } from '../../types/index.js';

describe('FormatDetector', () => {
  describe('detectFormat', () => {
    it('should detect WebP format', () => {
      const buffer = new ArrayBuffer(12);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46; // RIFF
      bytes[8] = 0x57; bytes[9] = 0x45; bytes[10] = 0x42; bytes[11] = 0x50; // WEBP
      
      expect(FormatDetector.detectFormat(buffer)).toBe('webp');
    });

    it('should detect PNG format', () => {
      const buffer = new ArrayBuffer(8);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0x89; bytes[1] = 0x50; bytes[2] = 0x4E; bytes[3] = 0x47;
      bytes[4] = 0x0D; bytes[5] = 0x0A; bytes[6] = 0x1A; bytes[7] = 0x0A;
      
      expect(FormatDetector.detectFormat(buffer)).toBe('png');
    });

    it('should detect JPEG format', () => {
      const buffer = new ArrayBuffer(2);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0xFF; bytes[1] = 0xD8;
      
      expect(FormatDetector.detectFormat(buffer)).toBe('jpeg');
    });

    it('should detect AVIF format', () => {
      const buffer = new ArrayBuffer(12);
      const bytes = new Uint8Array(buffer);
      bytes[4] = 0x66; bytes[5] = 0x74; bytes[6] = 0x79; bytes[7] = 0x70; // ftyp
      bytes[8] = 0x61; bytes[9] = 0x76; bytes[10] = 0x69; bytes[11] = 0x66; // avif
      
      expect(FormatDetector.detectFormat(buffer)).toBe('avif');
    });

    it('should detect JPEG XL format (short signature)', () => {
      const buffer = new ArrayBuffer(2);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0xFF; bytes[1] = 0x0A;
      
      expect(FormatDetector.detectFormat(buffer)).toBe('jpeg-xl');
    });

    it('should detect JPEG XL format (long signature)', () => {
      const buffer = new ArrayBuffer(12);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0x00; bytes[1] = 0x00; bytes[2] = 0x00; bytes[3] = 0x0C;
      bytes[4] = 0x4A; bytes[5] = 0x58; bytes[6] = 0x4C; bytes[7] = 0x20;
      bytes[8] = 0x0D; bytes[9] = 0x0A; bytes[10] = 0x87; bytes[11] = 0x0A;
      
      expect(FormatDetector.detectFormat(buffer)).toBe('jpeg-xl');
    });

    it('should detect QOI format', () => {
      const buffer = new ArrayBuffer(4);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0x71; bytes[1] = 0x6F; bytes[2] = 0x69; bytes[3] = 0x66; // qoif
      
      expect(FormatDetector.detectFormat(buffer)).toBe('qoi');
    });

    it('should detect WP2 format', () => {
      const buffer = new ArrayBuffer(12);
      const bytes = new Uint8Array(buffer);
      bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46; // RIFF
      bytes[8] = 0x57; bytes[9] = 0x50; bytes[10] = 0x32; bytes[11] = 0x20; // WP2 
      
      expect(FormatDetector.detectFormat(buffer)).toBe('wp2');
    });

    it('should return null for unknown format', () => {
      const buffer = new ArrayBuffer(12);
      // Leave buffer with zeros - unknown format
      
      expect(FormatDetector.detectFormat(buffer)).toBe(null);
    });

    it('should return null for empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      expect(FormatDetector.detectFormat(buffer)).toBe(null);
    });

    it('should return null for null buffer', () => {
      expect(FormatDetector.detectFormat(null as any)).toBe(null);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types', () => {
      expect(FormatDetector.getMimeType('webp')).toBe('image/webp');
      expect(FormatDetector.getMimeType('avif')).toBe('image/avif');
      expect(FormatDetector.getMimeType('jpeg-xl')).toBe('image/jxl');
      expect(FormatDetector.getMimeType('png')).toBe('image/png');
      expect(FormatDetector.getMimeType('jpeg')).toBe('image/jpeg');
      expect(FormatDetector.getMimeType('qoi')).toBe('image/qoi');
      expect(FormatDetector.getMimeType('wp2')).toBe('image/wp2');
    });
  });

  describe('getExtension', () => {
    it('should return correct file extensions', () => {
      expect(FormatDetector.getExtension('webp')).toBe('.webp');
      expect(FormatDetector.getExtension('avif')).toBe('.avif');
      expect(FormatDetector.getExtension('jpeg-xl')).toBe('.jxl');
      expect(FormatDetector.getExtension('png')).toBe('.png');
      expect(FormatDetector.getExtension('jpeg')).toBe('.jpg');
      expect(FormatDetector.getExtension('qoi')).toBe('.qoi');
      expect(FormatDetector.getExtension('wp2')).toBe('.wp2');
    });
  });

  describe('supportsLossless', () => {
    it('should correctly identify lossless support', () => {
      expect(FormatDetector.supportsLossless('png')).toBe(true);
      expect(FormatDetector.supportsLossless('webp')).toBe(true);
      expect(FormatDetector.supportsLossless('avif')).toBe(true);
      expect(FormatDetector.supportsLossless('jpeg-xl')).toBe(true);
      expect(FormatDetector.supportsLossless('qoi')).toBe(true);
      expect(FormatDetector.supportsLossless('wp2')).toBe(true);
      expect(FormatDetector.supportsLossless('jpeg')).toBe(false);
    });
  });

  describe('supportsTransparency', () => {
    it('should correctly identify transparency support', () => {
      expect(FormatDetector.supportsTransparency('png')).toBe(true);
      expect(FormatDetector.supportsTransparency('webp')).toBe(true);
      expect(FormatDetector.supportsTransparency('avif')).toBe(true);
      expect(FormatDetector.supportsTransparency('jpeg-xl')).toBe(true);
      expect(FormatDetector.supportsTransparency('qoi')).toBe(true);
      expect(FormatDetector.supportsTransparency('wp2')).toBe(true);
      expect(FormatDetector.supportsTransparency('jpeg')).toBe(false);
    });
  });
});

describe('FeatureDetector', () => {
  describe('hasWebAssembly', () => {
    it('should detect WebAssembly support', () => {
      // WebAssembly should be available in test environment
      expect(FeatureDetector.hasWebAssembly()).toBe(true);
    });
  });

  describe('hasWebWorkers', () => {
    it('should detect Web Workers support', () => {
      // In Node.js test environment, Worker might not be available
      const hasWorkers = FeatureDetector.hasWebWorkers();
      expect(typeof hasWorkers).toBe('boolean');
    });
  });

  describe('hasSharedArrayBuffer', () => {
    it('should detect SharedArrayBuffer support', () => {
      const hasSharedArrayBuffer = FeatureDetector.hasSharedArrayBuffer();
      expect(typeof hasSharedArrayBuffer).toBe('boolean');
    });
  });

  describe('isNodeEnvironment', () => {
    it('should detect Node.js environment', () => {
      // Should be true in Jest test environment
      expect(FeatureDetector.isNodeEnvironment()).toBe(true);
    });
  });

  describe('isBrowserEnvironment', () => {
    it('should detect browser environment', () => {
      // Jest with jsdom makes it think it's in a browser
      const isBrowser = FeatureDetector.isBrowserEnvironment();
      expect(typeof isBrowser).toBe('boolean');
    });
  });

  describe('getCapabilities', () => {
    it('should return capabilities object', () => {
      const capabilities = FeatureDetector.getCapabilities();
      
      expect(capabilities).toHaveProperty('webAssembly');
      expect(capabilities).toHaveProperty('webWorkers');
      expect(capabilities).toHaveProperty('sharedArrayBuffer');
      expect(capabilities).toHaveProperty('isNode');
      expect(capabilities).toHaveProperty('isBrowser');
      
      expect(typeof capabilities.webAssembly).toBe('boolean');
      expect(typeof capabilities.webWorkers).toBe('boolean');
      expect(typeof capabilities.sharedArrayBuffer).toBe('boolean');
      expect(typeof capabilities.isNode).toBe('boolean');
      expect(typeof capabilities.isBrowser).toBe('boolean');
    });
  });
});

describe('CodecValidator', () => {
  describe('validateImageData', () => {
    it('should return true for valid ImageData', () => {
      const imageData = new ImageData(100, 100);
      expect(CodecValidator.validateImageData(imageData)).toBe(true);
    });

    it('should return false for null ImageData', () => {
      expect(CodecValidator.validateImageData(null as any)).toBe(false);
    });

    it('should return false for ImageData with no pixel data', () => {
      const imageData = { width: 100, height: 100, data: new Uint8ClampedArray(0) } as ImageData;
      expect(CodecValidator.validateImageData(imageData)).toBe(false);
    });

    it('should return false for ImageData with invalid dimensions', () => {
      const imageData = { width: 0, height: 100, data: new Uint8ClampedArray(100) } as ImageData;
      expect(CodecValidator.validateImageData(imageData)).toBe(false);
    });

    it('should return false for ImageData with mismatched data length', () => {
      const imageData = { 
        width: 100, 
        height: 100, 
        data: new Uint8ClampedArray(100) // Should be 100 * 100 * 4 = 40000
      } as ImageData;
      expect(CodecValidator.validateImageData(imageData)).toBe(false);
    });
  });

  describe('validateBuffer', () => {
    it('should return true for valid buffer', () => {
      const buffer = new ArrayBuffer(100);
      expect(CodecValidator.validateBuffer(buffer)).toBe(true);
    });

    it('should return false for empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      expect(CodecValidator.validateBuffer(buffer)).toBe(false);
    });

    it('should return false for null buffer', () => {
      expect(CodecValidator.validateBuffer(null as any)).toBe(false);
    });
  });

  describe('validateEncodeOptions', () => {
    it('should return true for valid options', () => {
      expect(CodecValidator.validateEncodeOptions({ quality: 80 })).toBe(true);
      expect(CodecValidator.validateEncodeOptions({})).toBe(true);
      expect(CodecValidator.validateEncodeOptions(null)).toBe(true);
      expect(CodecValidator.validateEncodeOptions(undefined)).toBe(true);
    });

    it('should return false for invalid quality', () => {
      expect(CodecValidator.validateEncodeOptions({ quality: -1 })).toBe(false);
      expect(CodecValidator.validateEncodeOptions({ quality: 101 })).toBe(false);
      expect(CodecValidator.validateEncodeOptions({ quality: 'high' })).toBe(false);
    });
  });

  describe('sanitizeEncodeOptions', () => {
    it('should return empty object for null/undefined', () => {
      expect(CodecValidator.sanitizeEncodeOptions(null)).toEqual({});
      expect(CodecValidator.sanitizeEncodeOptions(undefined)).toEqual({});
    });

    it('should preserve valid options', () => {
      const options = { quality: 80, lossless: true };
      expect(CodecValidator.sanitizeEncodeOptions(options)).toEqual(options);
    });

    it('should remove invalid quality', () => {
      expect(CodecValidator.sanitizeEncodeOptions({ quality: -1, lossless: true }))
        .toEqual({ lossless: true });
      expect(CodecValidator.sanitizeEncodeOptions({ quality: 101, lossless: true }))
        .toEqual({ lossless: true });
      expect(CodecValidator.sanitizeEncodeOptions({ quality: 'high', lossless: true }))
        .toEqual({ lossless: true });
    });

    it('should preserve other valid options', () => {
      const options = { quality: 80, lossless: true, effort: 6 };
      expect(CodecValidator.sanitizeEncodeOptions(options)).toEqual(options);
    });
  });
});