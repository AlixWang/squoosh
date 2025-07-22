/**
 * Comprehensive tests for codec utilities
 */

import { FormatDetector } from '../codec-utils.js';
import { ImageFormat } from '../../types/index.js';
import { createTestImageBuffer } from '../../__tests__/test-utils.js';

describe('FormatDetector Comprehensive Tests', () => {
  describe('Format Detection', () => {
    it('should detect WebP format correctly', () => {
      const webpBuffer = createTestImageBuffer('webp');
      const format = FormatDetector.detectFormat(webpBuffer);
      expect(format).toBe('webp');
    });

    it('should detect PNG format correctly', () => {
      const pngBuffer = createTestImageBuffer('png');
      const format = FormatDetector.detectFormat(pngBuffer);
      expect(format).toBe('png');
    });

    it('should detect AVIF format correctly', () => {
      const avifBuffer = createTestImageBuffer('avif');
      const format = FormatDetector.detectFormat(avifBuffer);
      expect(format).toBe('avif');
    });

    it('should detect JPEG XL format correctly', () => {
      const jxlBuffer = createTestImageBuffer('jpeg-xl');
      const format = FormatDetector.detectFormat(jxlBuffer);
      expect(format).toBe('jpeg-xl');
    });

    it('should detect JPEG format correctly', () => {
      const jpegBuffer = createTestImageBuffer('jpeg');
      const format = FormatDetector.detectFormat(jpegBuffer);
      expect(format).toBe('jpeg');
    });

    it('should detect QOI format correctly', () => {
      const qoiBuffer = createTestImageBuffer('qoi');
      const format = FormatDetector.detectFormat(qoiBuffer);
      expect(format).toBe('qoi');
    });

    it('should detect WP2 format correctly', () => {
      const wp2Buffer = createTestImageBuffer('wp2');
      const format = FormatDetector.detectFormat(wp2Buffer);
      expect(format).toBe('wp2');
    });
  });

  describe('Edge Cases', () => {
    it('should return null for empty buffer', () => {
      const emptyBuffer = new ArrayBuffer(0);
      const format = FormatDetector.detectFormat(emptyBuffer);
      expect(format).toBeNull();
    });

    it('should return null for too small buffer', () => {
      const smallBuffer = new ArrayBuffer(4);
      const format = FormatDetector.detectFormat(smallBuffer);
      expect(format).toBeNull();
    });

    it('should return null for unrecognized format', () => {
      const unknownBuffer = new ArrayBuffer(20);
      const view = new Uint8Array(unknownBuffer);
      view.fill(0xFF); // Fill with invalid signature
      const format = FormatDetector.detectFormat(unknownBuffer);
      expect(format).toBeNull();
    });

    it('should handle buffer with partial signature', () => {
      const partialBuffer = new ArrayBuffer(8);
      const view = new Uint8Array(partialBuffer);
      view.set([0x52, 0x49, 0x46, 0x46]); // Partial WebP signature
      const format = FormatDetector.detectFormat(partialBuffer);
      expect(format).toBeNull();
    });

    it('should handle very large buffer', () => {
      const largeBuffer = new ArrayBuffer(1024 * 1024);
      const view = new Uint8Array(largeBuffer);
      // Add PNG signature at the beginning
      view.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const format = FormatDetector.detectFormat(largeBuffer);
      expect(format).toBe('png');
    });
  });

  describe('MIME Type Utilities', () => {
    it('should get correct MIME type for WebP', () => {
      const mimeType = FormatDetector.getMimeType('webp');
      expect(mimeType).toBe('image/webp');
    });

    it('should get correct MIME type for PNG', () => {
      const mimeType = FormatDetector.getMimeType('png');
      expect(mimeType).toBe('image/png');
    });

    it('should get correct MIME type for AVIF', () => {
      const mimeType = FormatDetector.getMimeType('avif');
      expect(mimeType).toBe('image/avif');
    });

    it('should get correct MIME type for JPEG XL', () => {
      const mimeType = FormatDetector.getMimeType('jpeg-xl');
      expect(mimeType).toBe('image/jxl');
    });

    it('should get correct MIME type for JPEG', () => {
      const mimeType = FormatDetector.getMimeType('jpeg');
      expect(mimeType).toBe('image/jpeg');
    });

    it('should return null for unknown format', () => {
      const mimeType = FormatDetector.getMimeType('unknown' as ImageFormat);
      expect(mimeType).toBeNull();
    });
  });

  describe('File Extension Utilities', () => {
    it('should get correct extension for WebP', () => {
      const extension = FormatDetector.getFileExtension('webp');
      expect(extension).toBe('.webp');
    });

    it('should get correct extension for PNG', () => {
      const extension = FormatDetector.getFileExtension('png');
      expect(extension).toBe('.png');
    });

    it('should get correct extension for AVIF', () => {
      const extension = FormatDetector.getFileExtension('avif');
      expect(extension).toBe('.avif');
    });

    it('should get correct extension for JPEG XL', () => {
      const extension = FormatDetector.getFileExtension('jpeg-xl');
      expect(extension).toBe('.jxl');
    });

    it('should get correct extension for JPEG', () => {
      const extension = FormatDetector.getFileExtension('jpeg');
      expect(extension).toBe('.jpg');
    });

    it('should return null for unknown format', () => {
      const extension = FormatDetector.getFileExtension('unknown' as ImageFormat);
      expect(extension).toBeNull();
    });
  });

  describe('Format Validation', () => {
    it('should validate known formats', () => {
      const formats: ImageFormat[] = ['webp', 'png', 'avif', 'jpeg-xl', 'jpeg', 'qoi', 'wp2'];
      formats.forEach(format => {
        expect(FormatDetector.isValidFormat(format)).toBe(true);
      });
    });

    it('should reject unknown formats', () => {
      const invalidFormats = ['gif', 'bmp', 'tiff', 'svg', 'unknown'];
      invalidFormats.forEach(format => {
        expect(FormatDetector.isValidFormat(format as ImageFormat)).toBe(false);
      });
    });

    it('should reject null and undefined', () => {
      expect(FormatDetector.isValidFormat(null as any)).toBe(false);
      expect(FormatDetector.isValidFormat(undefined as any)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(FormatDetector.isValidFormat('' as ImageFormat)).toBe(false);
    });
  });

  describe('Format Capabilities', () => {
    it('should identify lossless formats', () => {
      expect(FormatDetector.supportsLossless('png')).toBe(true);
      expect(FormatDetector.supportsLossless('webp')).toBe(true);
      expect(FormatDetector.supportsLossless('avif')).toBe(true);
      expect(FormatDetector.supportsLossless('jpeg-xl')).toBe(true);
      expect(FormatDetector.supportsLossless('qoi')).toBe(true);
      expect(FormatDetector.supportsLossless('wp2')).toBe(true);
    });

    it('should identify lossy-only formats', () => {
      expect(FormatDetector.supportsLossless('jpeg')).toBe(false);
    });

    it('should identify transparency support', () => {
      expect(FormatDetector.supportsTransparency('png')).toBe(true);
      expect(FormatDetector.supportsTransparency('webp')).toBe(true);
      expect(FormatDetector.supportsTransparency('avif')).toBe(true);
      expect(FormatDetector.supportsTransparency('jpeg-xl')).toBe(true);
      expect(FormatDetector.supportsTransparency('qoi')).toBe(true);
      expect(FormatDetector.supportsTransparency('wp2')).toBe(true);
    });

    it('should identify formats without transparency', () => {
      expect(FormatDetector.supportsTransparency('jpeg')).toBe(false);
    });
  });

  describe('Buffer Analysis', () => {
    it('should analyze buffer size correctly', () => {
      const buffer = new ArrayBuffer(1024);
      const analysis = FormatDetector.analyzeBuffer(buffer);
      expect(analysis.size).toBe(1024);
      expect(analysis.isEmpty).toBe(false);
      expect(analysis.isTooSmall).toBe(false);
    });

    it('should detect empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      const analysis = FormatDetector.analyzeBuffer(buffer);
      expect(analysis.size).toBe(0);
      expect(analysis.isEmpty).toBe(true);
      expect(analysis.isTooSmall).toBe(true);
    });

    it('should detect too small buffer', () => {
      const buffer = new ArrayBuffer(4);
      const analysis = FormatDetector.analyzeBuffer(buffer);
      expect(analysis.size).toBe(4);
      expect(analysis.isEmpty).toBe(false);
      expect(analysis.isTooSmall).toBe(true);
    });

    it('should include format detection in analysis', () => {
      const webpBuffer = createTestImageBuffer('webp');
      const analysis = FormatDetector.analyzeBuffer(webpBuffer);
      expect(analysis.detectedFormat).toBe('webp');
      expect(analysis.hasValidSignature).toBe(true);
    });

    it('should handle unrecognized format in analysis', () => {
      const unknownBuffer = new ArrayBuffer(20);
      const view = new Uint8Array(unknownBuffer);
      view.fill(0xAA);
      const analysis = FormatDetector.analyzeBuffer(unknownBuffer);
      expect(analysis.detectedFormat).toBeNull();
      expect(analysis.hasValidSignature).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should detect format quickly for small buffers', () => {
      const buffer = createTestImageBuffer('webp', 100, 100);
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        FormatDetector.detectFormat(buffer);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should complete 1000 detections in under 100ms
    });

    it('should handle large buffers efficiently', () => {
      const largeBuffer = new ArrayBuffer(10 * 1024 * 1024); // 10MB
      const view = new Uint8Array(largeBuffer);
      view.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG signature
      
      const start = performance.now();
      const format = FormatDetector.detectFormat(largeBuffer);
      const duration = performance.now() - start;
      
      expect(format).toBe('png');
      expect(duration).toBeLessThan(10); // Should detect quickly regardless of buffer size
    });
  });

  describe('Signature Validation', () => {
    it('should validate complete signatures only', () => {
      // Test WebP signature validation
      const completeWebP = new ArrayBuffer(12);
      const completeView = new Uint8Array(completeWebP);
      completeView.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
      expect(FormatDetector.detectFormat(completeWebP)).toBe('webp');

      // Test partial WebP signature
      const partialWebP = new ArrayBuffer(8);
      const partialView = new Uint8Array(partialWebP);
      partialView.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
      expect(FormatDetector.detectFormat(partialWebP)).toBeNull();
    });

    it('should handle corrupted signatures', () => {
      const corruptedBuffer = new ArrayBuffer(12);
      const view = new Uint8Array(corruptedBuffer);
      // Almost WebP signature but with one wrong byte
      view.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x51]);
      expect(FormatDetector.detectFormat(corruptedBuffer)).toBeNull();
    });

    it('should prioritize earlier signatures in buffer', () => {
      const mixedBuffer = new ArrayBuffer(24);
      const view = new Uint8Array(mixedBuffer);
      // PNG signature first
      view.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], 0);
      // WebP signature later
      view.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50], 12);
      
      expect(FormatDetector.detectFormat(mixedBuffer)).toBe('png');
    });
  });
});