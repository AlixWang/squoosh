/**
 * Quantize processor implementation
 */

import { BaseProcessor } from './base-processor.js';
import { QuantizeOptions, ProcessorOptions } from '../types/index.js';

// WASM module interface for imagequant
interface QuantizeWasmModule {
  quantize(
    data: BufferSource,
    width: number,
    height: number,
    maxColors: number,
    dither: number
  ): Uint8ClampedArray;
  zx_quantize(
    data: BufferSource,
    width: number,
    height: number,
    dither: number
  ): Uint8ClampedArray;
  version(): number;
}

// Import the quantize WASM module
let quantizeWasm: QuantizeWasmModule | null = null;
let quantizeWasmReady: Promise<void> | null = null;

export class QuantizeProcessor extends BaseProcessor {
  readonly name = 'quantize';
  
  // Allow injecting WASM module for testing
  private wasmModule?: QuantizeWasmModule;
  
  /**
   * Set WASM module for testing purposes
   */
  setWasmModule(module: QuantizeWasmModule): void {
    this.wasmModule = module;
  }

  async process(imageData: ImageData, options: ProcessorOptions): Promise<ImageData> {
    this.validateImageData(imageData);
    
    if (!this.validateOptions(options)) {
      throw new Error('Invalid quantize options provided');
    }

    const quantizeOptions = options as QuantizeOptions;

    // Get WASM module
    const wasmToUse = this.wasmModule || (await this.getWasmModule());

    // Perform quantization using WASM
    try {
      const result = this.performQuantization(imageData, quantizeOptions, wasmToUse);
      return result;
    } catch (error) {
      throw new Error(`Quantization operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateOptions(options: ProcessorOptions): boolean {
    if (!options || typeof options !== 'object') {
      return false;
    }

    const quantizeOptions = options as QuantizeOptions;

    // Check required maxColors property
    if (typeof quantizeOptions.maxColors !== 'number' || 
        quantizeOptions.maxColors < 2 || 
        quantizeOptions.maxColors > 256) {
      return false;
    }

    // Check optional dither property
    if (quantizeOptions.dither !== undefined) {
      if (typeof quantizeOptions.dither !== 'number' || 
          quantizeOptions.dither < 0 || 
          quantizeOptions.dither > 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the WASM module, initializing if needed
   */
  private async getWasmModule(): Promise<QuantizeWasmModule> {
    if (this.wasmModule) {
      return this.wasmModule;
    }
    
    await this.initializeWasm();
    return quantizeWasm!;
  }

  /**
   * Initialize the WASM module
   */
  private async initializeWasm(): Promise<void> {
    if (quantizeWasmReady) {
      return quantizeWasmReady;
    }

    quantizeWasmReady = this.loadWasmModule();
    return quantizeWasmReady;
  }

  /**
   * Load the quantize WASM module
   */
  private async loadWasmModule(): Promise<void> {
    try {
      // Try to import the imagequant WASM module
      const possiblePaths = [
        '../../../../codecs/imagequant/imagequant.js',
        '../../../codecs/imagequant/imagequant.js'
      ];
      
      let wasmModule;
      let lastError;
      
      for (const path of possiblePaths) {
        try {
          const moduleFactory = await import(/* webpackIgnore: true */ path);
          wasmModule = await moduleFactory.default();
          break;
        } catch (error) {
          lastError = error;
          continue;
        }
      }
      
      if (!wasmModule) {
        throw lastError || new Error('Could not load WASM module from any path');
      }
      
      quantizeWasm = wasmModule;
    } catch (error) {
      throw new Error(`Failed to load quantize WASM module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform the actual quantization using WASM
   */
  private performQuantization(
    imageData: ImageData, 
    options: QuantizeOptions, 
    wasmModule: QuantizeWasmModule
  ): ImageData {
    const { width, height, data } = imageData;
    const dither = options.dither ?? 0.5; // Default dither value

    // Perform quantization
    const quantizedData = wasmModule.quantize(
      data,
      width,
      height,
      options.maxColors,
      dither
    );

    // Convert quantized data back to RGBA format
    const result = this.createImageData(width, height);
    
    // The quantized data is in indexed format, we need to expand it back to RGBA
    // For now, we'll copy the quantized data directly (this may need adjustment based on actual output format)
    if (quantizedData.length === width * height * 4) {
      // If output is already RGBA
      result.data.set(quantizedData);
    } else {
      // If output is indexed, we need to handle palette expansion
      // This is a simplified approach - in practice, you'd need the palette
      this.expandIndexedToRGBA(quantizedData, result.data, width, height);
    }

    return result;
  }

  /**
   * Expand indexed color data to RGBA (simplified implementation)
   */
  private expandIndexedToRGBA(
    indexedData: Uint8ClampedArray, 
    rgbaData: Uint8ClampedArray, 
    width: number, 
    height: number
  ): void {
    // This is a simplified implementation
    // In practice, you'd need the actual color palette from the quantization result
    const pixelCount = width * height;
    
    if (indexedData.length === pixelCount) {
      // Single channel indexed data
      for (let i = 0; i < pixelCount; i++) {
        const index = indexedData[i];
        const rgbaIndex = i * 4;
        
        // Simple grayscale mapping (this should use actual palette)
        const gray = ((index || 0) / 255) * 255;
        rgbaData[rgbaIndex] = gray;     // Red
        rgbaData[rgbaIndex + 1] = gray; // Green
        rgbaData[rgbaIndex + 2] = gray; // Blue
        rgbaData[rgbaIndex + 3] = 255;  // Alpha
      }
    } else {
      // Fallback: copy as much as possible
      const copyLength = Math.min(indexedData.length, rgbaData.length);
      for (let i = 0; i < copyLength; i++) {
        rgbaData[i] = indexedData[i] || 0;
      }
    }
  }
}