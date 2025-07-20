/**
 * AVIF encoder implementation
 */

import { AbstractEncoder } from '../base-codec.js';
import { ImageFormat, EncodeOptions } from '../../types/index.js';
import { EncodingError } from '../../errors/index.js';
import type { AVIFModule, EncodeOptions as AVIFEncodeOptions, AVIFTune } from './enc/avif_enc.js';

/**
 * AVIF-specific encoding options
 */
export interface AVIFOptions extends EncodeOptions {
  quality?: number;
  qualityAlpha?: number;
  denoiseLevel?: number;
  tileRowsLog2?: number;
  tileColsLog2?: number;
  speed?: number;
  subsample?: number;
  chromaDeltaQ?: boolean;
  sharpness?: number;
  enableSharpYUV?: boolean;
  tune?: AVIFTune;
}

/**
 * AVIF encoder class
 */
export class AVIFEncoder extends AbstractEncoder {
  readonly format: ImageFormat = 'avif';
  readonly mimeType = 'image/avif';
  readonly extension = '.avif';

  private modulePromise: Promise<AVIFModule> | null = null;

  /**
   * Initialize the WebAssembly module
   */
  private async initModule(): Promise<AVIFModule> {
    if (!this.modulePromise) {
      this.modulePromise = this.loadModule();
    }
    return this.modulePromise;
  }

  /**
   * Load the WebAssembly module
   */
  private async loadModule(): Promise<AVIFModule> {
    try {
      const moduleFactory = await import('./enc/avif_enc.js');
      return moduleFactory.default({
        noInitialRun: true,
      });
    } catch (error) {
      throw new EncodingError('Failed to load AVIF encoder module', { error });
    }
  }

  /**
   * Get default AVIF encoding options
   */
  getDefaultOptions(): AVIFOptions {
    return {
      quality: 50,
      qualityAlpha: 50,
      denoiseLevel: 0,
      tileRowsLog2: 0,
      tileColsLog2: 0,
      speed: 6,
      subsample: 1,
      chromaDeltaQ: false,
      sharpness: 0,
      enableSharpYUV: false,
      tune: 0, // AVIFTune.auto
    };
  }

  /**
   * Validate AVIF-specific encoding options
   */
  protected validateFormatSpecificOptions(options: EncodeOptions): boolean {
    const avifOptions = options as AVIFOptions;

    // Validate quality ranges
    if (avifOptions.qualityAlpha !== undefined) {
      if (typeof avifOptions.qualityAlpha !== 'number' || 
          avifOptions.qualityAlpha < 0 || avifOptions.qualityAlpha > 100) {
        return false;
      }
    }

    // Validate denoise level
    if (avifOptions.denoiseLevel !== undefined) {
      if (typeof avifOptions.denoiseLevel !== 'number' || 
          avifOptions.denoiseLevel < 0 || avifOptions.denoiseLevel > 50) {
        return false;
      }
    }

    // Validate tile settings
    if (avifOptions.tileRowsLog2 !== undefined) {
      if (typeof avifOptions.tileRowsLog2 !== 'number' || 
          avifOptions.tileRowsLog2 < 0 || avifOptions.tileRowsLog2 > 6) {
        return false;
      }
    }

    if (avifOptions.tileColsLog2 !== undefined) {
      if (typeof avifOptions.tileColsLog2 !== 'number' || 
          avifOptions.tileColsLog2 < 0 || avifOptions.tileColsLog2 > 6) {
        return false;
      }
    }

    // Validate speed
    if (avifOptions.speed !== undefined) {
      if (typeof avifOptions.speed !== 'number' || 
          avifOptions.speed < 0 || avifOptions.speed > 10) {
        return false;
      }
    }

    // Validate subsample
    if (avifOptions.subsample !== undefined) {
      if (typeof avifOptions.subsample !== 'number' || 
          (avifOptions.subsample !== 0 && avifOptions.subsample !== 1 && avifOptions.subsample !== 2)) {
        return false;
      }
    }

    // Validate sharpness
    if (avifOptions.sharpness !== undefined) {
      if (typeof avifOptions.sharpness !== 'number' || 
          avifOptions.sharpness < 0 || avifOptions.sharpness > 7) {
        return false;
      }
    }

    // Validate tune
    if (avifOptions.tune !== undefined) {
      if (typeof avifOptions.tune !== 'number' || 
          (avifOptions.tune !== 0 && avifOptions.tune !== 1 && avifOptions.tune !== 2)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Convert library options to AVIF module options
   */
  private convertToAVIFOptions(options: AVIFOptions): AVIFEncodeOptions {
    const defaults = this.getDefaultOptions();
    const merged = { ...defaults, ...options };

    return {
      quality: merged.quality!,
      qualityAlpha: merged.qualityAlpha!,
      denoiseLevel: merged.denoiseLevel!,
      tileRowsLog2: merged.tileRowsLog2!,
      tileColsLog2: merged.tileColsLog2!,
      speed: merged.speed!,
      subsample: merged.subsample!,
      chromaDeltaQ: merged.chromaDeltaQ!,
      sharpness: merged.sharpness!,
      enableSharpYUV: merged.enableSharpYUV!,
      tune: merged.tune!,
    };
  }

  /**
   * Encode ImageData to AVIF format
   */
  async encode(imageData: ImageData, options?: EncodeOptions): Promise<ArrayBuffer> {
    this.validateImageData(imageData);

    const avifOptions = options as AVIFOptions || {};
    
    if (!this.validateOptions(avifOptions)) {
      throw new EncodingError('Invalid AVIF encoding options');
    }

    try {
      const module = await this.initModule();
      const moduleOptions = this.convertToAVIFOptions(avifOptions);
      
      const result = module.encode(
        imageData.data,
        imageData.width,
        imageData.height,
        moduleOptions
      );

      if (!result) {
        throw new EncodingError('AVIF encoding failed - unable to encode image data');
      }

      return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
    } catch (error) {
      if (error instanceof EncodingError) {
        throw error;
      }
      throw new EncodingError('AVIF encoding failed', { error });
    }
  }

  /**
   * Check if AVIF encoder is supported in the current environment
   */
  async isSupported(): Promise<boolean> {
    try {
      const baseSupported = await super.isSupported();
      if (!baseSupported) {
        return false;
      }

      // Try to initialize the module to verify it works
      await this.initModule();
      return true;
    } catch {
      return false;
    }
  }
}