/**
 * JPEG XL encoder implementation
 */

import { AbstractEncoder } from '../base-codec.js';
import { ImageFormat, EncodeOptions } from '../../types/index.js';
import { EncodingError } from '../../errors/index.js';
import type { JXLModule, EncodeOptions as JXLEncodeOptions } from './enc/jxl_enc.js';

/**
 * JPEG XL-specific encoding options
 */
export interface JXLOptions extends EncodeOptions {
  quality?: number;
  effort?: number;
  progressive?: boolean;
  epf?: number;
  lossyPalette?: boolean;
  decodingSpeedTier?: number;
  photonNoiseIso?: number;
  lossyModular?: boolean;
}

/**
 * JPEG XL encoder class
 */
export class JXLEncoder extends AbstractEncoder {
  readonly format: ImageFormat = 'jpeg-xl';
  readonly mimeType = 'image/jxl';
  readonly extension = '.jxl';

  private modulePromise: Promise<JXLModule> | null = null;

  /**
   * Initialize the WebAssembly module
   */
  private async initModule(): Promise<JXLModule> {
    if (!this.modulePromise) {
      this.modulePromise = this.loadModule();
    }
    return this.modulePromise;
  }

  /**
   * Load the WebAssembly module
   */
  private async loadModule(): Promise<JXLModule> {
    try {
      const moduleFactory = await import('./enc/jxl_enc.js');
      return moduleFactory.default({
        noInitialRun: true,
      });
    } catch (error) {
      throw new EncodingError('Failed to load JPEG XL encoder module', { error });
    }
  }

  /**
   * Get default JPEG XL encoding options
   */
  getDefaultOptions(): JXLOptions {
    return {
      quality: 75,
      effort: 7,
      progressive: false,
      epf: -1,
      lossyPalette: false,
      decodingSpeedTier: 0,
      photonNoiseIso: 0,
      lossyModular: false,
    };
  }

  /**
   * Validate JPEG XL-specific encoding options
   */
  protected validateFormatSpecificOptions(options: EncodeOptions): boolean {
    const jxlOptions = options as JXLOptions;

    // Validate effort (encoding speed vs compression efficiency trade-off)
    if (jxlOptions.effort !== undefined) {
      if (typeof jxlOptions.effort !== 'number' || 
          jxlOptions.effort < 1 || jxlOptions.effort > 9) {
        return false;
      }
    }

    // Validate EPF (edge-preserving filter)
    if (jxlOptions.epf !== undefined) {
      if (typeof jxlOptions.epf !== 'number' || 
          jxlOptions.epf < -1 || jxlOptions.epf > 3) {
        return false;
      }
    }

    // Validate decoding speed tier
    if (jxlOptions.decodingSpeedTier !== undefined) {
      if (typeof jxlOptions.decodingSpeedTier !== 'number' || 
          jxlOptions.decodingSpeedTier < 0 || jxlOptions.decodingSpeedTier > 4) {
        return false;
      }
    }

    // Validate photon noise ISO
    if (jxlOptions.photonNoiseIso !== undefined) {
      if (typeof jxlOptions.photonNoiseIso !== 'number' || 
          jxlOptions.photonNoiseIso < 0) {
        return false;
      }
    }

    // Validate boolean options
    if (jxlOptions.progressive !== undefined && typeof jxlOptions.progressive !== 'boolean') {
      return false;
    }

    if (jxlOptions.lossyPalette !== undefined && typeof jxlOptions.lossyPalette !== 'boolean') {
      return false;
    }

    if (jxlOptions.lossyModular !== undefined && typeof jxlOptions.lossyModular !== 'boolean') {
      return false;
    }

    return true;
  }

  /**
   * Convert library options to JPEG XL module options
   */
  private convertToJXLOptions(options: JXLOptions): JXLEncodeOptions {
    const defaults = this.getDefaultOptions();
    const merged = { ...defaults, ...options };

    return {
      quality: merged.quality!,
      effort: merged.effort!,
      progressive: merged.progressive!,
      epf: merged.epf!,
      lossyPalette: merged.lossyPalette!,
      decodingSpeedTier: merged.decodingSpeedTier!,
      photonNoiseIso: merged.photonNoiseIso!,
      lossyModular: merged.lossyModular!,
    };
  }

  /**
   * Encode ImageData to JPEG XL format
   */
  async encode(imageData: ImageData, options?: EncodeOptions): Promise<ArrayBuffer> {
    this.validateImageData(imageData);

    const jxlOptions = options as JXLOptions || {};
    
    if (!this.validateOptions(jxlOptions)) {
      throw new EncodingError('Invalid JPEG XL encoding options');
    }

    try {
      const module = await this.initModule();
      const moduleOptions = this.convertToJXLOptions(jxlOptions);
      
      const result = module.encode(
        imageData.data,
        imageData.width,
        imageData.height,
        moduleOptions
      );

      if (!result) {
        throw new EncodingError('JPEG XL encoding failed - unable to encode image data');
      }

      return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
    } catch (error) {
      if (error instanceof EncodingError) {
        throw error;
      }
      throw new EncodingError('JPEG XL encoding failed', { error });
    }
  }

  /**
   * Check if JPEG XL encoder is supported in the current environment
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