/**
 * Quantize processor tests
 */

import { QuantizeProcessor } from '../quantize-processor';
import { QuantizeOptions } from '../../types';

// Mock quantize functions
const mockQuantize = jest.fn((
  data: BufferSource,
  width: number,
  height: number,
  maxColors: number,
  dither: number
) => {
  // Mock implementation that returns quantized RGBA data
  const outputSize = width * height * 4;
  const output = new Uint8ClampedArray(outputSize);
  
  // Fill with a simple quantized pattern
  for (let i = 0; i < outputSize; i += 4) {
    output[i] = Math.floor((i / 4) % maxColors) * (255 / (maxColors - 1));     // Red
    output[i + 1] = 128; // Green
    output[i + 2] = 64;  // Blue
    output[i + 3] = 255; // Alpha
  }
  
  return output;
});

const mockZxQuantize = jest.fn((
  data: BufferSource,
  width: number,
  height: number,
  dither: number
) => {
  // Mock ZX Spectrum quantization
  const outputSize = width * height * 4;
  const output = new Uint8ClampedArray(outputSize);
  
  // Fill with ZX Spectrum-like colors
  for (let i = 0; i < outputSize; i += 4) {
    output[i] = 255;     // Red
    output[i + 1] = 0;   // Green
    output[i + 2] = 0;   // Blue
    output[i + 3] = 255; // Alpha
  }
  
  return output;
});

// Mock WASM module
const mockWasmModule = {
  quantize: mockQuantize,
  zx_quantize: mockZxQuantize,
  version: jest.fn(() => 0x020000) // Version 2.0.0
};

describe('QuantizeProcessor', () => {
  let processor: QuantizeProcessor;

  beforeEach(() => {
    processor = new QuantizeProcessor();
    jest.clearAllMocks();
    
    // Set up mock WASM module
    processor.setWasmModule(mockWasmModule);
  });

  describe('name', () => {
    it('should have correct name', () => {
      expect(processor.name).toBe('quantize');
    });
  });

  describe('validateOptions', () => {
    it('should validate correct quantize options', () => {
      const validOptions: QuantizeOptions = {
        maxColors: 16
      };
      
      expect(processor.validateOptions(validOptions)).toBe(true);
    });

    it('should validate options with dither', () => {
      const validOptions: QuantizeOptions = {
        maxColors: 32,
        dither: 0.5
      };
      
      expect(processor.validateOptions(validOptions)).toBe(true);
    });

    it('should validate edge cases for maxColors', () => {
      expect(processor.validateOptions({ maxColors: 2 })).toBe(true);
      expect(processor.validateOptions({ maxColors: 256 })).toBe(true);
    });

    it('should validate edge cases for dither', () => {
      expect(processor.validateOptions({ maxColors: 16, dither: 0 })).toBe(true);
      expect(processor.validateOptions({ maxColors: 16, dither: 1 })).toBe(true);
    });

    it('should reject null/undefined options', () => {
      expect(processor.validateOptions(null as any)).toBe(false);
      expect(processor.validateOptions(undefined as any)).toBe(false);
    });

    it('should reject options without maxColors', () => {
      expect(processor.validateOptions({} as any)).toBe(false);
    });

    it('should reject invalid maxColors', () => {
      expect(processor.validateOptions({ maxColors: 1 })).toBe(false);
      expect(processor.validateOptions({ maxColors: 257 })).toBe(false);
      expect(processor.validateOptions({ maxColors: 0 })).toBe(false);
      expect(processor.validateOptions({ maxColors: -1 })).toBe(false);
      expect(processor.validateOptions({ maxColors: 'invalid' } as any)).toBe(false);
    });

    it('should reject invalid dither values', () => {
      expect(processor.validateOptions({ maxColors: 16, dither: -0.1 })).toBe(false);
      expect(processor.validateOptions({ maxColors: 16, dither: 1.1 })).toBe(false);
      expect(processor.validateOptions({ maxColors: 16, dither: 'invalid' } as any)).toBe(false);
    });
  });

  describe('process', () => {
    it('should process valid ImageData with basic options', async () => {
      const imageData = new ImageData(10, 10);
      const options: QuantizeOptions = {
        maxColors: 16
      };

      const result = await processor.process(imageData, options);

      expect(result.width).toBe(10);
      expect(result.height).toBe(10);
      expect(result.data.length).toBe(10 * 10 * 4);
      
      expect(mockQuantize).toHaveBeenCalledWith(
        imageData.data,
        10,
        10,
        16,
        0.5 // Default dither
      );
    });

    it('should process with custom dither value', async () => {
      const imageData = new ImageData(20, 30);
      const options: QuantizeOptions = {
        maxColors: 32,
        dither: 0.8
      };

      const result = await processor.process(imageData, options);

      expect(result.width).toBe(20);
      expect(result.height).toBe(30);
      
      expect(mockQuantize).toHaveBeenCalledWith(
        imageData.data,
        20,
        30,
        32,
        0.8
      );
    });

    it('should use default dither when not specified', async () => {
      const imageData = new ImageData(5, 5);
      const options: QuantizeOptions = {
        maxColors: 8
      };

      await processor.process(imageData, options);

      expect(mockQuantize).toHaveBeenCalledWith(
        imageData.data,
        5,
        5,
        8,
        0.5 // Default dither value
      );
    });

    it('should throw for invalid ImageData', async () => {
      const options: QuantizeOptions = { maxColors: 16 };
      
      await expect(processor.process(null as any, options)).rejects.toThrow('Invalid ImageData provided');
    });

    it('should throw for invalid options', async () => {
      const imageData = new ImageData(10, 10);
      const invalidOptions = { maxColors: 1 };
      
      await expect(processor.process(imageData, invalidOptions)).rejects.toThrow('Invalid quantize options provided');
    });

    it('should handle different maxColors values', async () => {
      const imageData = new ImageData(10, 10);
      
      // Test minimum
      await processor.process(imageData, { maxColors: 2 });
      expect(mockQuantize).toHaveBeenCalledWith(imageData.data, 10, 10, 2, 0.5);
      
      jest.clearAllMocks();
      
      // Test maximum
      await processor.process(imageData, { maxColors: 256 });
      expect(mockQuantize).toHaveBeenCalledWith(imageData.data, 10, 10, 256, 0.5);
    });

    it('should handle edge dither values', async () => {
      const imageData = new ImageData(10, 10);
      
      // Test minimum dither
      await processor.process(imageData, { maxColors: 16, dither: 0 });
      expect(mockQuantize).toHaveBeenCalledWith(imageData.data, 10, 10, 16, 0);
      
      jest.clearAllMocks();
      
      // Test maximum dither
      await processor.process(imageData, { maxColors: 16, dither: 1 });
      expect(mockQuantize).toHaveBeenCalledWith(imageData.data, 10, 10, 16, 1);
    });
  });

  describe('performQuantization', () => {
    it('should handle RGBA output correctly', async () => {
      const imageData = new ImageData(2, 2);
      const options: QuantizeOptions = { maxColors: 4 };

      const result = await processor.process(imageData, options);

      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
      expect(result.data.length).toBe(16); // 2x2x4 = 16 bytes
    });

    it('should call quantize with correct parameters', async () => {
      const imageData = new ImageData(15, 25);
      const options: QuantizeOptions = { maxColors: 64, dither: 0.3 };

      await processor.process(imageData, options);

      expect(mockQuantize).toHaveBeenCalledTimes(1);
      expect(mockQuantize).toHaveBeenCalledWith(
        imageData.data,
        15,
        25,
        64,
        0.3
      );
    });
  });

  describe('expandIndexedToRGBA', () => {
    it('should handle indexed data expansion', () => {
      const processor = new QuantizeProcessor();
      const indexedData = new Uint8ClampedArray([0, 85, 170, 255]); // 4 pixels
      const rgbaData = new Uint8ClampedArray(16); // 4 pixels * 4 channels
      
      (processor as any).expandIndexedToRGBA(indexedData, rgbaData, 2, 2);
      
      // Check that indexed values were expanded to grayscale RGBA
      expect(rgbaData[0]).toBe(0);   // First pixel R
      expect(rgbaData[1]).toBe(0);   // First pixel G
      expect(rgbaData[2]).toBe(0);   // First pixel B
      expect(rgbaData[3]).toBe(255); // First pixel A
      
      expect(rgbaData[4]).toBe(85);  // Second pixel R
      expect(rgbaData[5]).toBe(85);  // Second pixel G
      expect(rgbaData[6]).toBe(85);  // Second pixel B
      expect(rgbaData[7]).toBe(255); // Second pixel A
    });

    it('should handle fallback for unexpected data sizes', () => {
      const processor = new QuantizeProcessor();
      const indexedData = new Uint8ClampedArray([255, 128, 64]); // Unexpected size
      const rgbaData = new Uint8ClampedArray(16);
      
      (processor as any).expandIndexedToRGBA(indexedData, rgbaData, 2, 2);
      
      // Should copy what it can
      expect(rgbaData[0]).toBe(255);
      expect(rgbaData[1]).toBe(128);
      expect(rgbaData[2]).toBe(64);
    });
  });
});