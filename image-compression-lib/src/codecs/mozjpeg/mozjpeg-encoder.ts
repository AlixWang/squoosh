/**
 * MozJPEG encoder implementation
 */

import { AbstractEncoder } from '../base-codec.js';
import { ImageFormat, EncodeOptions } from '../../types/index.js';
import { EncodingError } from '../../errors/index.js';
import type { MozJPEGModule, EncodeOptions as MozJpegEncodeOptions, MozJpegColorSpace } from './enc/mozjpeg_enc.js';

/**
 * MozJPEG encoder options
 */
export interface MozJpegEncoderOptions {
  quality?: number;
  baseline?: boolean;
  arithmetic?: boolean;
  progressive?: boolean;
  optimize_coding?: boolean;
  smoothing?: number;
  color_space?: MozJpegColorSpace;
  quant_table?: number;
  trellis_multipass?: boolean;
  trellis_opt_zero?: boolean;
  trellis_opt_table?: boolean;
  trellis_loops?: number;
  auto_subsample?: boolean;
  chroma_subsample?: number;
  separate_chroma_quality?: boolean;
  chroma_quality?: number;
}

/**
 * MozJPEG encoder class
 */
export class MozJpegEncoder extends AbstractEncoder {
  readonly format: ImageFormat = 'jpeg';
  readonly mimeType = 'image/jpeg';
  readonly extension = '.jpg';

  private modulePromise: Promise<MozJPEGModule> | null = null;

  /**
   * Initialize the WebAssembly module
   */
  private async initModule(): Promise<MozJPEGModule> {
    if (!this.modulePromise) {
      this.modulePromise = this.loadModule();
    }
    return this.modulePromise;
  }

  /**
   * Load the WebAssembly module
   */
  private async loadModule(): Promise<MozJPEGModule> {
    try {
      const moduleFactory = await import('./enc/mozjpeg_enc.js');
      return moduleFactory.default({
        noInitialRun: true,
      });
    } catch (error) {
      throw new EncodingError('Failed to load MozJPEG encoder module', { error });
    }
  }

  /**
   * Get default encoding options
   */
  getDefaultOptions(): MozJpegEncoderOptions {
    return {
      quality: 75,
      baseline: false,
      arithmetic: false,
      progressive: true,
      optimize_coding: true,
      smoothing: 0,
      color_space: 3, // YCbCr
      quant_table: 3,
      trellis_multipass: false,
      trellis_opt_zero: false,
      trellis_opt_table: false,
      trellis_loops: 1,
      auto_subsample: true,
      chroma_subsample: 2,
      separate_chroma_quality: false,
      chroma_quality: 75,
    };
  }

  /**
   * Validate format-specific options
   */
  protected validateFormatSpecificOptions(options: EncodeOptions): boolean {
    const mozjpegOptions = options as MozJpegEncoderOptions;

    // Validate smoothing
    if (mozjpegOptions.smoothing !== undefined) {
      if (typeof mozjpegOptions.smoothing !== 'number' || mozjpegOptions.smoothing < 0 || mozjpegOptions.smoothing > 100) {
        return false;
      }
    }

    // Validate color space
    if (mozjpegOptions.color_space !== undefined) {
      if (![1, 2, 3].includes(mozjpegOptions.color_space)) {
        return false;
      }
    }

    // Validate chroma quality
    if (mozjpegOptions.chroma_quality !== undefined) {
      if (typeof mozjpegOptions.chroma_quality !== 'number' || mozjpegOptions.chroma_quality < 0 || mozjpegOptions.chroma_quality > 100) {
        return false;
      }
    }

    return true;
  }

  /**
   * Convert options to internal format
   */
  private prepareOptions(options: MozJpegEncoderOptions): MozJpegEncodeOptions {
    const defaults = this.getDefaultOptions();
    const merged = { ...defaults, ...options };

    return {
      quality: merged.quality!,
      baseline: merged.baseline!,
      arithmetic: merged.arithmetic!,
      progressive: merged.progressive!,
      optimize_coding: merged.optimize_coding!,
      smoothing: merged.smoothing!,
      color_space: merged.color_space!,
      quant_table: merged.quant_table!,
      trellis_multipass: merged.trellis_multipass!,
      trellis_opt_zero: merged.trellis_opt_zero!,
      trellis_opt_table: merged.trellis_opt_table!,
      trellis_loops: merged.trellis_loops!,
      auto_subsample: merged.auto_subsample!,
      chroma_subsample: merged.chroma_subsample!,
      separate_chroma_quality: merged.separate_chroma_quality!,
      chroma_quality: merged.chroma_quality!,
    };
  }

  /**
   * Encode ImageData to JPEG buffer
   */
  async encode(imageData: ImageData, options: MozJpegEncoderOptions = {}): Promise<ArrayBuffer> {
    this.validateImageData(imageData);
    
    if (!this.validateOptions(options)) {
      throw new EncodingError('Invalid MozJPEG encoding options');
    }

    try {
      const module = await this.initModule();
      const { data, width, height } = imageData;
      const preparedOptions = this.prepareOptions(options);
      
      const result = module.encode(data, width, height, preparedOptions);
      
      if (!result) {
        throw new EncodingError('JPEG encoding failed');
      }

      return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
    } catch (error) {
      if (error instanceof EncodingError) {
        throw error;
      }
      throw new EncodingError('JPEG encoding failed', { error });
    }
  }

  /**
   * Check if MozJPEG is supported in the current environment
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