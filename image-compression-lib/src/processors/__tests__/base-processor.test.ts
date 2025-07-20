/**
 * Base processor tests
 */

import { BaseProcessor } from '../base-processor';
import { ProcessorOptions } from '../../types';

// Mock implementation for testing
class MockProcessor extends BaseProcessor {
  readonly name = 'mock';

  async process(imageData: ImageData, options: ProcessorOptions): Promise<ImageData> {
    this.validateImageData(imageData);
    return this.copyImageData(imageData);
  }

  validateOptions(options: ProcessorOptions): boolean {
    return options !== null && options !== undefined;
  }
}

describe('BaseProcessor', () => {
  let processor: MockProcessor;

  beforeEach(() => {
    processor = new MockProcessor();
  });

  describe('validateImageData', () => {
    it('should pass for valid ImageData', () => {
      const imageData = new ImageData(10, 10);
      expect(() => processor['validateImageData'](imageData)).not.toThrow();
    });

    it('should throw for null ImageData', () => {
      expect(() => processor['validateImageData'](null as any)).toThrow('Invalid ImageData provided');
    });

    it('should throw for ImageData without data', () => {
      const invalidData = { width: 10, height: 10 } as ImageData;
      expect(() => processor['validateImageData'](invalidData)).toThrow('Invalid ImageData provided');
    });

    it('should throw for ImageData without width', () => {
      const invalidData = { data: new Uint8ClampedArray(400), height: 10 } as ImageData;
      expect(() => processor['validateImageData'](invalidData)).toThrow('Invalid ImageData provided');
    });

    it('should throw for ImageData without height', () => {
      const invalidData = { data: new Uint8ClampedArray(400), width: 10 } as ImageData;
      expect(() => processor['validateImageData'](invalidData)).toThrow('Invalid ImageData provided');
    });
  });

  describe('createImageData', () => {
    it('should create ImageData with correct dimensions', () => {
      const imageData = processor['createImageData'](20, 30);
      expect(imageData.width).toBe(20);
      expect(imageData.height).toBe(30);
      expect(imageData.data.length).toBe(20 * 30 * 4);
    });

    it('should create ImageData with all pixels transparent', () => {
      const imageData = processor['createImageData'](2, 2);
      // All pixels should be transparent (RGBA = 0,0,0,0)
      for (let i = 0; i < imageData.data.length; i++) {
        expect(imageData.data[i]).toBe(0);
      }
    });
  });

  describe('copyImageData', () => {
    it('should create an exact copy of ImageData', () => {
      const original = new ImageData(5, 5);
      // Set some test data
      original.data[0] = 255; // Red
      original.data[1] = 128; // Green
      original.data[2] = 64;  // Blue
      original.data[3] = 255; // Alpha

      const copy = processor['copyImageData'](original);

      expect(copy.width).toBe(original.width);
      expect(copy.height).toBe(original.height);
      expect(copy.data.length).toBe(original.data.length);
      expect(copy.data[0]).toBe(255);
      expect(copy.data[1]).toBe(128);
      expect(copy.data[2]).toBe(64);
      expect(copy.data[3]).toBe(255);
    });

    it('should create independent copy (not reference)', () => {
      const original = new ImageData(2, 2);
      original.data[0] = 100;

      const copy = processor['copyImageData'](original);
      copy.data[0] = 200;

      expect(original.data[0]).toBe(100);
      expect(copy.data[0]).toBe(200);
    });
  });

  describe('process', () => {
    it('should process valid ImageData', async () => {
      const imageData = new ImageData(10, 10);
      const mockOptions = { width: 10, height: 10 } as ProcessorOptions;
      const result = await processor.process(imageData, mockOptions);
      
      expect(result.width).toBe(10);
      expect(result.height).toBe(10);
    });

    it('should throw for invalid ImageData', async () => {
      const mockOptions = { width: 10, height: 10 } as ProcessorOptions;
      await expect(processor.process(null as any, mockOptions)).rejects.toThrow('Invalid ImageData provided');
    });
  });

  describe('validateOptions', () => {
    it('should return true for valid options', () => {
      const validOptions = { width: 10, height: 10 } as ProcessorOptions;
      expect(processor.validateOptions(validOptions)).toBe(true);
    });

    it('should return false for null/undefined options', () => {
      expect(processor.validateOptions(null as any)).toBe(false);
      expect(processor.validateOptions(undefined as any)).toBe(false);
    });
  });
});