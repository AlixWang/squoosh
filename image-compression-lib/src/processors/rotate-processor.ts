/**
 * Rotate processor implementation
 */

import { BaseProcessor } from './base-processor.js';
import { ProcessorOptions } from '../types/index.js';

// Rotation options interface
interface RotateOptions {
  angle: number; // 0, 90, 180, or 270 degrees
}

// WASM module interface
interface RotateWasmModule {
  rotate(width: number, height: number, angle: 0 | 90 | 180 | 270): void;
  memory: WebAssembly.Memory;
}

// Import the rotate WASM module
let rotateWasm: RotateWasmModule | null = null;
let rotateWasmReady: Promise<void> | null = null;

export class RotateProcessor extends BaseProcessor {
  readonly name = 'rotate';
  
  // Allow injecting WASM module for testing
  private wasmModule?: RotateWasmModule;
  
  /**
   * Set WASM module for testing purposes
   */
  setWasmModule(module: RotateWasmModule): void {
    this.wasmModule = module;
  }

  async process(imageData: ImageData, options: ProcessorOptions): Promise<ImageData> {
    this.validateImageData(imageData);
    
    if (!this.validateOptions(options)) {
      throw new Error('Invalid rotate options provided');
    }

    const rotateOptions = options as RotateOptions;
    
    // Normalize angle to 0, 90, 180, or 270
    const normalizedAngle = this.normalizeAngle(rotateOptions.angle);
    
    // If angle is 0, return copy of original
    if (normalizedAngle === 0) {
      return this.copyImageData(imageData);
    }

    // Get WASM module
    const wasmToUse = this.wasmModule || (await this.getWasmModule());

    // Perform rotation using WASM
    try {
      const result = this.performRotation(imageData, normalizedAngle, wasmToUse);
      return result;
    } catch (error) {
      throw new Error(`Rotation operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateOptions(options: ProcessorOptions): boolean {
    if (!options || typeof options !== 'object') {
      return false;
    }

    const rotateOptions = options as RotateOptions;

    // Check if angle is provided and is a number
    if (typeof rotateOptions.angle !== 'number') {
      return false;
    }

    // Check if angle is valid (must be multiple of 90)
    if (rotateOptions.angle % 90 !== 0) {
      return false;
    }

    return true;
  }

  /**
   * Get the WASM module, initializing if needed
   */
  private async getWasmModule(): Promise<RotateWasmModule> {
    if (this.wasmModule) {
      return this.wasmModule;
    }
    
    await this.initializeWasm();
    return rotateWasm!;
  }

  /**
   * Initialize the WASM module
   */
  private async initializeWasm(): Promise<void> {
    if (rotateWasmReady) {
      return rotateWasmReady;
    }

    rotateWasmReady = this.loadWasmModule();
    return rotateWasmReady;
  }

  /**
   * Load the rotate WASM module
   */
  private async loadWasmModule(): Promise<void> {
    try {
      // Try to load the rotate WASM module
      const possiblePaths = [
        '../../../../codecs/rotate/rotate.wasm',
        '../../../codecs/rotate/rotate.wasm'
      ];
      
      let wasmBuffer;
      let lastError;
      
      for (const path of possiblePaths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            wasmBuffer = await response.arrayBuffer();
            break;
          }
        } catch (error) {
          lastError = error;
          continue;
        }
      }
      
      if (!wasmBuffer) {
        throw lastError || new Error('Could not load WASM module from any path');
      }
      
      const wasmModule = await WebAssembly.instantiate(wasmBuffer);
      rotateWasm = wasmModule.instance as unknown as RotateWasmModule;
    } catch (error) {
      throw new Error(`Failed to load rotate WASM module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize angle to 0, 90, 180, or 270
   */
  private normalizeAngle(angle: number): 0 | 90 | 180 | 270 {
    // Normalize to positive angle
    let normalized = ((angle % 360) + 360) % 360;
    
    // Round to nearest 90 degrees
    normalized = Math.round(normalized / 90) * 90;
    
    // Ensure it's one of the valid values
    if (normalized === 360) normalized = 0;
    
    return normalized as 0 | 90 | 180 | 270;
  }

  /**
   * Perform the actual rotation using WASM
   */
  private performRotation(
    imageData: ImageData, 
    angle: 0 | 90 | 180 | 270, 
    wasmModule: RotateWasmModule
  ): ImageData {
    const { width, height, data } = imageData;
    const bytesPerPixel = 4;
    const bytesPerImage = width * height * bytesPerPixel;
    
    // Calculate required memory pages (64KB each)
    const totalBytes = bytesPerImage * 2 + 8; // Input + output + header
    const pagesNeeded = Math.ceil(totalBytes / (64 * 1024));
    
    // Grow memory if needed
    const currentPages = wasmModule.memory.buffer.byteLength / (64 * 1024);
    if (currentPages < pagesNeeded) {
      wasmModule.memory.grow(pagesNeeded - currentPages);
    }
    
    // Create view of WASM memory
    const view = new Uint8ClampedArray(wasmModule.memory.buffer);
    
    // Write image dimensions at the beginning
    const dimensionsView = new Uint32Array(wasmModule.memory.buffer);
    dimensionsView[0] = width;
    dimensionsView[1] = height;
    
    // Copy input image data after the header (8 bytes)
    view.set(data, 8);
    
    // Perform rotation
    wasmModule.rotate(width, height, angle);
    
    // Determine output dimensions
    const flipDimensions = angle % 180 !== 0;
    const outputWidth = flipDimensions ? height : width;
    const outputHeight = flipDimensions ? width : height;
    
    // Extract output data
    const outputData = view.slice(bytesPerImage + 8, bytesPerImage * 2 + 8);
    
    // Create result ImageData
    const result = this.createImageData(outputWidth, outputHeight);
    result.data.set(outputData);
    
    return result;
  }
}