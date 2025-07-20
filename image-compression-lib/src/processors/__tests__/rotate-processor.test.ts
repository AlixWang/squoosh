/**
 * Rotate processor tests
 */

import { RotateProcessor } from '../rotate-processor';

// Mock rotate function
const mockRotate = jest.fn((width: number, height: number, angle: 0 | 90 | 180 | 270) => {
  // Mock implementation - just record the call
});

// Mock WASM module
const mockWasmModule = {
  rotate: mockRotate,
  memory: {
    buffer: new ArrayBuffer(1024 * 1024), // 1MB buffer
    grow: jest.fn()
  } as WebAssembly.Memory
};

describe('RotateProcessor', () => {
  let processor: RotateProcessor;

  beforeEach(() => {
    processor = new RotateProcessor();
    jest.clearAllMocks();
    
    // Set up mock WASM module
    processor.setWasmModule(mockWasmModule);
  });

  describe('name', () => {
    it('should have correct name', () => {
      expect(processor.name).toBe('rotate');
    });
  });

  describe('validateOptions', () => {
    it('should validate correct rotate options', () => {
      expect(processor.validateOptions({ angle: 0 })).toBe(true);
      expect(processor.validateOptions({ angle: 90 })).toBe(true);
      expect(processor.validateOptions({ angle: 180 })).toBe(true);
      expect(processor.validateOptions({ angle: 270 })).toBe(true);
      expect(processor.validateOptions({ angle: 360 })).toBe(true);
      expect(processor.validateOptions({ angle: -90 })).toBe(true);
    });

    it('should reject null/undefined options', () => {
      expect(processor.validateOptions(null as any)).toBe(false);
      expect(processor.validateOptions(undefined as any)).toBe(false);
    });

    it('should reject options without angle', () => {
      expect(processor.validateOptions({} as any)).toBe(false);
    });

    it('should reject non-number angles', () => {
      expect(processor.validateOptions({ angle: '90' } as any)).toBe(false);
      expect(processor.validateOptions({ angle: null } as any)).toBe(false);
      expect(processor.validateOptions({ angle: undefined } as any)).toBe(false);
    });

    it('should reject angles that are not multiples of 90', () => {
      expect(processor.validateOptions({ angle: 45 })).toBe(false);
      expect(processor.validateOptions({ angle: 30 })).toBe(false);
      expect(processor.validateOptions({ angle: 135 })).toBe(false);
      expect(processor.validateOptions({ angle: 91 })).toBe(false);
    });
  });

  describe('process', () => {
    it('should return copy for 0 degree rotation', async () => {
      const imageData = new ImageData(10, 10);
      // Set some test data
      imageData.data[0] = 255;
      imageData.data[1] = 128;
      imageData.data[2] = 64;
      imageData.data[3] = 255;

      const result = await processor.process(imageData, { angle: 0 });

      expect(result.width).toBe(10);
      expect(result.height).toBe(10);
      expect(result.data[0]).toBe(255);
      expect(result.data[1]).toBe(128);
      expect(result.data[2]).toBe(64);
      expect(result.data[3]).toBe(255);
      
      // Should not call WASM rotate for 0 degrees
      expect(mockRotate).not.toHaveBeenCalled();
    });

    it('should process 90 degree rotation', async () => {
      const imageData = new ImageData(10, 20);
      const result = await processor.process(imageData, { angle: 90 });

      // Dimensions should be flipped for 90 degree rotation
      expect(result.width).toBe(20);
      expect(result.height).toBe(10);
      expect(mockRotate).toHaveBeenCalledWith(10, 20, 90);
    });

    it('should process 180 degree rotation', async () => {
      const imageData = new ImageData(10, 20);
      const result = await processor.process(imageData, { angle: 180 });

      // Dimensions should remain the same for 180 degree rotation
      expect(result.width).toBe(10);
      expect(result.height).toBe(20);
      expect(mockRotate).toHaveBeenCalledWith(10, 20, 180);
    });

    it('should process 270 degree rotation', async () => {
      const imageData = new ImageData(10, 20);
      const result = await processor.process(imageData, { angle: 270 });

      // Dimensions should be flipped for 270 degree rotation
      expect(result.width).toBe(20);
      expect(result.height).toBe(10);
      expect(mockRotate).toHaveBeenCalledWith(10, 20, 270);
    });

    it('should normalize angles correctly', async () => {
      const imageData = new ImageData(10, 10);
      
      // Test 360 degrees (should become 0)
      await processor.process(imageData, { angle: 360 });
      expect(mockRotate).not.toHaveBeenCalled();
      
      jest.clearAllMocks();
      
      // Test 450 degrees (should become 90)
      await processor.process(imageData, { angle: 450 });
      expect(mockRotate).toHaveBeenCalledWith(10, 10, 90);
      
      jest.clearAllMocks();
      
      // Test -90 degrees (should become 270)
      await processor.process(imageData, { angle: -90 });
      expect(mockRotate).toHaveBeenCalledWith(10, 10, 270);
    });

    it('should throw for invalid ImageData', async () => {
      await expect(processor.process(null as any, { angle: 90 })).rejects.toThrow('Invalid ImageData provided');
    });

    it('should throw for invalid options', async () => {
      const imageData = new ImageData(10, 10);
      await expect(processor.process(imageData, { angle: 45 })).rejects.toThrow('Invalid rotate options provided');
    });
  });

  describe('normalizeAngle', () => {
    it('should normalize positive angles', () => {
      expect((processor as any).normalizeAngle(0)).toBe(0);
      expect((processor as any).normalizeAngle(90)).toBe(90);
      expect((processor as any).normalizeAngle(180)).toBe(180);
      expect((processor as any).normalizeAngle(270)).toBe(270);
      expect((processor as any).normalizeAngle(360)).toBe(0);
      expect((processor as any).normalizeAngle(450)).toBe(90);
    });

    it('should normalize negative angles', () => {
      expect((processor as any).normalizeAngle(-90)).toBe(270);
      expect((processor as any).normalizeAngle(-180)).toBe(180);
      expect((processor as any).normalizeAngle(-270)).toBe(90);
      expect((processor as any).normalizeAngle(-360)).toBe(0);
    });

    it('should round to nearest 90 degrees', () => {
      expect((processor as any).normalizeAngle(45)).toBe(90);  // 45 rounds to 90
      expect((processor as any).normalizeAngle(135)).toBe(180);
      expect((processor as any).normalizeAngle(225)).toBe(270); // 225 rounds to 270
      expect((processor as any).normalizeAngle(315)).toBe(0);   // 315 rounds to 360, which becomes 0
    });
  });

  describe('performRotation', () => {
    it('should handle memory allocation', async () => {
      const imageData = new ImageData(10, 10); // Smaller image to avoid memory issues
      
      // Mock memory with adequate buffer
      const mockMemoryWithBuffer = {
        buffer: new ArrayBuffer(1024 * 1024), // 1MB buffer
        grow: jest.fn()
      } as WebAssembly.Memory;
      
      const mockWasmWithMemory = {
        ...mockWasmModule,
        memory: mockMemoryWithBuffer
      };
      
      processor.setWasmModule(mockWasmWithMemory);
      
      await processor.process(imageData, { angle: 90 });
      
      // Should have processed successfully
      expect(mockRotate).toHaveBeenCalledWith(10, 10, 90);
    });

    it('should set up WASM memory correctly', async () => {
      const imageData = new ImageData(10, 20);
      
      await processor.process(imageData, { angle: 90 });
      
      // Should have called rotate with correct parameters
      expect(mockRotate).toHaveBeenCalledWith(10, 20, 90);
    });
  });
});