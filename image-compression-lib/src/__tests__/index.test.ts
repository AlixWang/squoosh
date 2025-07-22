/**
 * Tests for main library exports
 */

import * as ImageCompressionLib from '../index.js';

describe('Library Exports', () => {
  describe('Main Classes', () => {
    it('should export ImageCompressor', () => {
      expect(ImageCompressionLib.ImageCompressor).toBeDefined();
      expect(typeof ImageCompressionLib.ImageCompressor).toBe('function');
    });

    it('should export CodecManager', () => {
      expect(ImageCompressionLib.CodecManager).toBeDefined();
      expect(typeof ImageCompressionLib.CodecManager).toBe('function');
    });

    it('should export ProcessorRegistry', () => {
      expect(ImageCompressionLib.ProcessorRegistry).toBeDefined();
      expect(typeof ImageCompressionLib.ProcessorRegistry).toBe('function');
    });

    it('should export processorRegistry instance', () => {
      expect(ImageCompressionLib.processorRegistry).toBeDefined();
      expect(ImageCompressionLib.processorRegistry).toBeInstanceOf(
        ImageCompressionLib.ProcessorRegistry,
      );
    });
  });

  describe('Error Classes', () => {
    it('should export all error classes', () => {
      expect(ImageCompressionLib.ImageCompressionError).toBeDefined();
      expect(ImageCompressionLib.ValidationError).toBeDefined();
      expect(ImageCompressionLib.UnsupportedFormatError).toBeDefined();
      expect(ImageCompressionLib.DecodingError).toBeDefined();
      expect(ImageCompressionLib.EncodingError).toBeDefined();
      expect(ImageCompressionLib.ProcessingError).toBeDefined();
      expect(ImageCompressionLib.WorkerError).toBeDefined();
      expect(ImageCompressionLib.ModuleError).toBeDefined();
    });
  });

  describe('Type Definitions', () => {
    it('should export type definitions', () => {
      // These are TypeScript types, so we can't test them at runtime
      // But we can verify the module structure
      expect(typeof ImageCompressionLib).toBe('object');
    });
  });

  describe('Utility Classes', () => {
    it('should export FormatDetector', () => {
      expect(ImageCompressionLib.FormatDetector).toBeDefined();
      expect(typeof ImageCompressionLib.FormatDetector).toBe('function');
    });
  });

  describe('Main Exports', () => {
    it('should export ImageCompressor as main class', () => {
      expect(ImageCompressionLib.ImageCompressor).toBeDefined();
      expect(typeof ImageCompressionLib.ImageCompressor).toBe('function');
    });
  });

  describe('Library Instantiation', () => {
    it('should create ImageCompressor instance', () => {
      const compressor = new ImageCompressionLib.ImageCompressor();
      expect(compressor).toBeInstanceOf(ImageCompressionLib.ImageCompressor);
    });

    it('should create CodecManager instance', () => {
      const manager = new ImageCompressionLib.CodecManager();
      expect(manager).toBeInstanceOf(ImageCompressionLib.CodecManager);
    });

    it('should create ProcessorRegistry instance', () => {
      const registry = new ImageCompressionLib.ProcessorRegistry();
      expect(registry).toBeInstanceOf(ImageCompressionLib.ProcessorRegistry);
    });
  });

  describe('Error Instantiation', () => {
    it('should create error instances', () => {
      const error = new ImageCompressionLib.ValidationError('Test error');
      expect(error).toBeInstanceOf(ImageCompressionLib.ValidationError);
      expect(error).toBeInstanceOf(ImageCompressionLib.ImageCompressionError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
    });
  });
});
