/**
 * Resize processor implementation
 */

import { BaseProcessor } from './base-processor.js';
import { ResizeOptions, ProcessorOptions } from '../types/index.js';

// Import the resize WASM module
let resizeWasm: any;
let resizeWasmReady: Promise<void> | null = null;

// Interface for WASM module
interface ResizeWasmModule {
  resize(
    input: Uint8Array,
    inputWidth: number,
    inputHeight: number,
    outputWidth: number,
    outputHeight: number,
    methodIndex: number,
    premultiply: boolean,
    linearRGB: boolean
  ): Uint8ClampedArray;
}

// Resize methods mapping to indices (matching Squoosh implementation)
const RESIZE_METHODS = ['triangle', 'catrom', 'mitchell', 'lanczos3', 'hqx'] as const;

export class ResizeProcessor extends BaseProcessor {
  readonly name = 'resize';
  
  // Allow injecting WASM module for testing
  private wasmModule?: ResizeWasmModule;
  
  /**
   * Set WASM module for testing purposes
   */
  setWasmModule(module: ResizeWasmModule): void {
    this.wasmModule = module;
  }

  async process(imageData: ImageData, options: ProcessorOptions): Promise<ImageData> {
    this.validateImageData(imageData);
    
    if (!this.validateOptions(options)) {
      throw new Error('Invalid resize options provided');
    }

    const resizeOptions = options as ResizeOptions;

    // Initialize WASM module if needed (skip if mock module is provided)
    const wasmToUse = this.wasmModule || (await this.getWasmModule());

    // Handle contain fit method
    let sourceData = imageData;
    let sx = 0, sy = 0, sw = imageData.width, sh = imageData.height;

    if (resizeOptions.fitMethod === 'contain') {
      const containOffsets = this.getContainOffsets(
        imageData.width,
        imageData.height,
        resizeOptions.width,
        resizeOptions.height
      );
      sx = containOffsets.sx;
      sy = containOffsets.sy;
      sw = containOffsets.sw;
      sh = containOffsets.sh;
    }

    // Extract the region to resize if using contain
    if (resizeOptions.fitMethod === 'contain' && (sx !== 0 || sy !== 0 || sw !== imageData.width || sh !== imageData.height)) {
      sourceData = this.extractRegion(imageData, sx, sy, sw, sh);
    }

    // Perform the resize using WASM
    const methodIndex = RESIZE_METHODS.indexOf(resizeOptions.method || 'lanczos3');
    if (methodIndex === -1) {
      throw new Error(`Unsupported resize method: ${resizeOptions.method}`);
    }

    try {
      const resizedData = wasmToUse.resize(
        new Uint8Array(sourceData.data.buffer),
        sourceData.width,
        sourceData.height,
        resizeOptions.width,
        resizeOptions.height,
        methodIndex,
        resizeOptions.premultiply ?? true,
        resizeOptions.linearRGB ?? true
      );

      // Create new ImageData with resized data
      const result = this.createImageData(resizeOptions.width, resizeOptions.height);
      result.data.set(resizedData);
      return result;
    } catch (error) {
      throw new Error(`Resize operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateOptions(options: ProcessorOptions): boolean {
    if (!options || typeof options !== 'object') {
      return false;
    }

    const resizeOptions = options as ResizeOptions;

    // Check required properties
    if (typeof resizeOptions.width !== 'number' || resizeOptions.width <= 0) {
      return false;
    }

    if (typeof resizeOptions.height !== 'number' || resizeOptions.height <= 0) {
      return false;
    }

    // Check optional properties
    if (resizeOptions.method && !RESIZE_METHODS.includes(resizeOptions.method as any)) {
      return false;
    }

    if (resizeOptions.fitMethod && !['stretch', 'contain'].includes(resizeOptions.fitMethod)) {
      return false;
    }

    if (resizeOptions.premultiply !== undefined && typeof resizeOptions.premultiply !== 'boolean') {
      return false;
    }

    if (resizeOptions.linearRGB !== undefined && typeof resizeOptions.linearRGB !== 'boolean') {
      return false;
    }

    return true;
  }

  /**
   * Get the WASM module, initializing if needed
   */
  private async getWasmModule(): Promise<ResizeWasmModule> {
    if (this.wasmModule) {
      return this.wasmModule;
    }
    
    await this.initializeWasm();
    return resizeWasm;
  }

  /**
   * Initialize the WASM module
   */
  private async initializeWasm(): Promise<void> {
    if (resizeWasmReady) {
      return resizeWasmReady;
    }

    resizeWasmReady = this.loadWasmModule();
    return resizeWasmReady;
  }

  /**
   * Load the resize WASM module
   */
  private async loadWasmModule(): Promise<void> {
    try {
      // Try to import the resize WASM module using dynamic import
      const possiblePaths = [
        '../../../../codecs/resize/pkg/squoosh_resize.js',
        '../../../codecs/resize/pkg/squoosh_resize.js'
      ];
      
      let wasmModule;
      let lastError;
      
      for (const path of possiblePaths) {
        try {
          wasmModule = await import(/* webpackIgnore: true */ path);
          break;
        } catch (error) {
          lastError = error;
          continue;
        }
      }
      
      if (!wasmModule) {
        throw lastError || new Error('Could not load WASM module from any path');
      }
      
      await wasmModule.default();
      resizeWasm = wasmModule;
    } catch (error) {
      throw new Error(`Failed to load resize WASM module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate contain offsets (adapted from Squoosh)
   */
  private getContainOffsets(sw: number, sh: number, dw: number, dh: number) {
    const currentAspect = sw / sh;
    const endAspect = dw / dh;

    if (endAspect > currentAspect) {
      const newSh = sw / endAspect;
      const newSy = (sh - newSh) / 2;
      return { sw, sh: newSh, sx: 0, sy: newSy };
    }

    const newSw = sh * endAspect;
    const newSx = (sw - newSw) / 2;
    return { sh, sw: newSw, sx: newSx, sy: 0 };
  }

  /**
   * Extract a region from ImageData
   */
  private extractRegion(imageData: ImageData, sx: number, sy: number, sw: number, sh: number): ImageData {
    const result = this.createImageData(Math.floor(sw), Math.floor(sh));
    const sourceData = imageData.data;
    const targetData = result.data;

    const sourceWidth = imageData.width;
    const targetWidth = result.width;

    for (let y = 0; y < result.height; y++) {
      for (let x = 0; x < result.width; x++) {
        const sourceX = Math.floor(sx + x);
        const sourceY = Math.floor(sy + y);
        
        const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
        const targetIndex = (y * targetWidth + x) * 4;

        targetData[targetIndex] = sourceData[sourceIndex] || 0;
        targetData[targetIndex + 1] = sourceData[sourceIndex + 1] || 0;
        targetData[targetIndex + 2] = sourceData[sourceIndex + 2] || 0;
        targetData[targetIndex + 3] = sourceData[sourceIndex + 3] || 0;
      }
    }

    return result;
  }
}