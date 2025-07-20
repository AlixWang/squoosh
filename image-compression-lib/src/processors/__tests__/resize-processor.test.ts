/**
 * Resize processor tests
 */

import { ResizeProcessor } from '../resize-processor';
import { ResizeOptions } from '../../types';

// Mock the WASM module by mocking the ResizeProcessor's loadWasmModule method
const mockResize = jest.fn((
  input: Uint8Array,
  inputWidth: number,
  inputHeight: number,
  outputWidth: number,
  outputHeight: number,
  methodIndex: number,
  premultiply: boolean,
  linearRGB: boolean
) => {
  // Mock resize function that creates a simple resized output
  const outputSize = outputWidth * outputHeight * 4;
  const output = new Uint8ClampedArray(outputSize);
  
  // Fill with a simple pattern for testing
  for (let i = 0; i < outputSize; i += 4) {
    output[i] = 255;     // Red
    output[i + 1] = 128; // Green
    output[i + 2] = 64;  // Blue
    output[i + 3] = 255; // Alpha
  }
  
  return output;
});

describe('ResizeProcessor', () => {
  let processor: ResizeProcessor;

  beforeEach(() => {
    processor = new ResizeProcessor();
    jest.clearAllMocks();
    
    // Set up mock WASM module
    processor.setWasmModule({
      resize: mockResize
    });
  });

  describe('name', () => {
    it('should have correct name', () => {
      expect(processor.name).toBe('resize');
    });
  });

  describe('validateOptions', () => {
    it('should validate correct resize options', () => {
      const validOptions: ResizeOptions = {
        width: 100,
        height: 200
      };
      
      expect(processor.validateOptions(validOptions)).toBe(true);
    });

    it('should validate options with all properties', () => {
      const validOptions: ResizeOptions = {
        width: 100,
        height: 200,
        method: 'lanczos3',
        fitMethod: 'contain',
        premultiply: true,
        linearRGB: false
      };
      
      expect(processor.validateOptions(validOptions)).toBe(true);
    });

    it('should reject null/undefined options', () => {
      expect(processor.validateOptions(null as any)).toBe(false);
      expect(processor.validateOptions(undefined as any)).toBe(false);
    });

    it('should reject options without width', () => {
      const invalidOptions = { height: 200 } as ResizeOptions;
      expect(processor.validateOptions(invalidOptions)).toBe(false);
    });

    it('should reject options without height', () => {
      const invalidOptions = { width: 100 } as ResizeOptions;
      expect(processor.validateOptions(invalidOptions)).toBe(false);
    });

    it('should reject zero or negative dimensions', () => {
      expect(processor.validateOptions({ width: 0, height: 100 })).toBe(false);
      expect(processor.validateOptions({ width: 100, height: 0 })).toBe(false);
      expect(processor.validateOptions({ width: -10, height: 100 })).toBe(false);
      expect(processor.validateOptions({ width: 100, height: -10 })).toBe(false);
    });

    it('should reject invalid method', () => {
      const invalidOptions: ResizeOptions = {
        width: 100,
        height: 200,
        method: 'invalid' as any
      };
      
      expect(processor.validateOptions(invalidOptions)).toBe(false);
    });

    it('should reject invalid fitMethod', () => {
      const invalidOptions: ResizeOptions = {
        width: 100,
        height: 200,
        fitMethod: 'invalid' as any
      };
      
      expect(processor.validateOptions(invalidOptions)).toBe(false);
    });

    it('should reject non-boolean premultiply', () => {
      const invalidOptions: ResizeOptions = {
        width: 100,
        height: 200,
        premultiply: 'true' as any
      };
      
      expect(processor.validateOptions(invalidOptions)).toBe(false);
    });

    it('should reject non-boolean linearRGB', () => {
      const invalidOptions: ResizeOptions = {
        width: 100,
        height: 200,
        linearRGB: 'false' as any
      };
      
      expect(processor.validateOptions(invalidOptions)).toBe(false);
    });

    it('should accept valid resize methods', () => {
      const methods = ['triangle', 'catrom', 'mitchell', 'lanczos3', 'hqx'];
      
      methods.forEach(method => {
        const options: ResizeOptions = {
          width: 100,
          height: 200,
          method: method as any
        };
        
        expect(processor.validateOptions(options)).toBe(true);
      });
    });

    it('should accept valid fit methods', () => {
      const fitMethods = ['stretch', 'contain'];
      
      fitMethods.forEach(fitMethod => {
        const options: ResizeOptions = {
          width: 100,
          height: 200,
          fitMethod: fitMethod as any
        };
        
        expect(processor.validateOptions(options)).toBe(true);
      });
    });
  });

  describe('process', () => {
    it('should process valid ImageData with basic options', async () => {
      const imageData = new ImageData(50, 50);
      const options: ResizeOptions = {
        width: 100,
        height: 100
      };

      const result = await processor.process(imageData, options);

      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
      expect(result.data.length).toBe(100 * 100 * 4);
    });

    it('should throw for invalid ImageData', async () => {
      const options: ResizeOptions = { width: 100, height: 100 };
      
      await expect(processor.process(null as any, options)).rejects.toThrow('Invalid ImageData provided');
    });

    it('should throw for invalid options', async () => {
      const imageData = new ImageData(50, 50);
      const invalidOptions = { width: 0, height: 100 };
      
      await expect(processor.process(imageData, invalidOptions)).rejects.toThrow('Invalid resize options provided');
    });

    it('should handle stretch fit method', async () => {
      const imageData = new ImageData(50, 50);
      const options: ResizeOptions = {
        width: 100,
        height: 200,
        fitMethod: 'stretch'
      };

      const result = await processor.process(imageData, options);

      expect(result.width).toBe(100);
      expect(result.height).toBe(200);
    });

    it('should handle contain fit method', async () => {
      const imageData = new ImageData(100, 50);
      const options: ResizeOptions = {
        width: 100,
        height: 100,
        fitMethod: 'contain'
      };

      const result = await processor.process(imageData, options);

      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it('should use default method when not specified', async () => {
      const imageData = new ImageData(50, 50);
      const options: ResizeOptions = {
        width: 100,
        height: 100
      };

      await processor.process(imageData, options);

      // Should not throw and should use lanczos3 as default
    });

    it('should throw for unsupported method', async () => {
      const imageData = new ImageData(50, 50);
      const options = {
        width: 100,
        height: 100,
        method: 'unsupported'
      } as any;

      await expect(processor.process(imageData, options)).rejects.toThrow('Invalid resize options provided');
    });

    it('should handle premultiply and linearRGB options', async () => {
      const imageData = new ImageData(50, 50);
      const options: ResizeOptions = {
        width: 100,
        height: 100,
        premultiply: false,
        linearRGB: false
      };

      const result = await processor.process(imageData, options);

      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });
  });

  describe('getContainOffsets', () => {
    it('should calculate correct offsets for landscape to square', () => {
      // Access private method for testing
      const offsets = (processor as any).getContainOffsets(200, 100, 100, 100);
      
      expect(offsets.sw).toBe(100);
      expect(offsets.sh).toBe(100);
      expect(offsets.sx).toBe(50);
      expect(offsets.sy).toBe(0);
    });

    it('should calculate correct offsets for portrait to square', () => {
      const offsets = (processor as any).getContainOffsets(100, 200, 100, 100);
      
      expect(offsets.sw).toBe(100);
      expect(offsets.sh).toBe(100);
      expect(offsets.sx).toBe(0);
      expect(offsets.sy).toBe(50);
    });

    it('should handle same aspect ratio', () => {
      const offsets = (processor as any).getContainOffsets(100, 100, 200, 200);
      
      expect(offsets.sw).toBe(100);
      expect(offsets.sh).toBe(100);
      expect(offsets.sx).toBe(0);
      expect(offsets.sy).toBe(0);
    });
  });

  describe('extractRegion', () => {
    it('should extract correct region from ImageData', () => {
      const imageData = new ImageData(10, 10);
      
      // Set a specific pixel value for testing
      const pixelIndex = (5 * 10 + 5) * 4; // Middle pixel
      imageData.data[pixelIndex] = 255;     // Red
      imageData.data[pixelIndex + 1] = 128; // Green
      imageData.data[pixelIndex + 2] = 64;  // Blue
      imageData.data[pixelIndex + 3] = 255; // Alpha

      const region = (processor as any).extractRegion(imageData, 2, 2, 6, 6);

      expect(region.width).toBe(6);
      expect(region.height).toBe(6);
      
      // Check that the middle pixel from original is now at position (3,3) in region
      const regionPixelIndex = (3 * 6 + 3) * 4;
      expect(region.data[regionPixelIndex]).toBe(255);
      expect(region.data[regionPixelIndex + 1]).toBe(128);
      expect(region.data[regionPixelIndex + 2]).toBe(64);
      expect(region.data[regionPixelIndex + 3]).toBe(255);
    });

    it('should handle fractional coordinates', () => {
      const imageData = new ImageData(10, 10);
      const region = (processor as any).extractRegion(imageData, 2.7, 3.2, 4.8, 5.1);

      expect(region.width).toBe(4); // Math.floor(4.8)
      expect(region.height).toBe(5); // Math.floor(5.1)
    });
  });
});