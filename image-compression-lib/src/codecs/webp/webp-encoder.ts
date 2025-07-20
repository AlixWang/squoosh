/**
 * WebP encoder implementation
 */

import { AbstractEncoder } from '../base-codec.js';
import { ImageFormat, EncodeOptions } from '../../types/index.js';
import { EncodingError } from '../../errors/index.js';
import type { WebPModule, EncodeOptions as WebPEncodeOptions } from './enc/webp_enc.js';

/**
 * WebP-specific encoding options
 */
export interface WebPOptions extends EncodeOptions {
  quality?: number;
  target_size?: number;
  target_PSNR?: number;
  method?: number;
  sns_strength?: number;
  filter_strength?: number;
  filter_sharpness?: number;
  filter_type?: number;
  partitions?: number;
  segments?: number;
  pass?: number;
  show_compressed?: number;
  preprocessing?: number;
  autofilter?: number;
  partition_limit?: number;
  alpha_compression?: number;
  alpha_filtering?: number;
  alpha_quality?: number;
  lossless?: number;
  exact?: number;
  image_hint?: number;
  emulate_jpeg_size?: number;
  thread_level?: number;
  low_memory?: number;
  near_lossless?: number;
  use_delta_palette?: number;
  use_sharp_yuv?: number;
}

/**
 * WebP encoder class
 */
export class WebPEncoder extends AbstractEncoder {
  readonly format: ImageFormat = 'webp';
  readonly mimeType = 'image/webp';
  readonly extension = '.webp';

  private modulePromise: Promise<WebPModule> | null = null;

  /**
   * Initialize the WebAssembly module
   */
  private async initModule(): Promise<WebPModule> {
    if (!this.modulePromise) {
      this.modulePromise = this.loadModule();
    }
    return this.modulePromise;
  }

  /**
   * Load the WebAssembly module
   */
  private async loadModule(): Promise<WebPModule> {
    try {
      const moduleFactory = await import('./enc/webp_enc.js');
      return moduleFactory.default({
        noInitialRun: true,
      });
    } catch (error) {
      throw new EncodingError('Failed to load WebP encoder module', { error });
    }
  }

  /**
   * Get default WebP encoding options
   */
  getDefaultOptions(): WebPOptions {
    return {
      quality: 75,
      target_size: 0,
      target_PSNR: 0,
      method: 4,
      sns_strength: 50,
      filter_strength: 60,
      filter_sharpness: 0,
      filter_type: 1,
      partitions: 0,
      segments: 4,
      pass: 1,
      show_compressed: 0,
      preprocessing: 0,
      autofilter: 0,
      partition_limit: 0,
      alpha_compression: 1,
      alpha_filtering: 1,
      alpha_quality: 100,
      lossless: 0,
      exact: 0,
      image_hint: 0,
      emulate_jpeg_size: 0,
      thread_level: 0,
      low_memory: 0,
      near_lossless: 100,
      use_delta_palette: 0,
      use_sharp_yuv: 0,
    };
  }

  /**
   * Validate WebP-specific encoding options
   */
  protected validateFormatSpecificOptions(options: EncodeOptions): boolean {
    const webpOptions = options as WebPOptions;

    // Validate numeric ranges for WebP-specific options
    if (webpOptions.method !== undefined) {
      if (typeof webpOptions.method !== 'number' || webpOptions.method < 0 || webpOptions.method > 6) {
        return false;
      }
    }

    if (webpOptions.sns_strength !== undefined) {
      if (typeof webpOptions.sns_strength !== 'number' || webpOptions.sns_strength < 0 || webpOptions.sns_strength > 100) {
        return false;
      }
    }

    if (webpOptions.filter_strength !== undefined) {
      if (typeof webpOptions.filter_strength !== 'number' || webpOptions.filter_strength < 0 || webpOptions.filter_strength > 100) {
        return false;
      }
    }

    if (webpOptions.alpha_quality !== undefined) {
      if (typeof webpOptions.alpha_quality !== 'number' || webpOptions.alpha_quality < 0 || webpOptions.alpha_quality > 100) {
        return false;
      }
    }

    if (webpOptions.lossless !== undefined) {
      if (typeof webpOptions.lossless !== 'number' || (webpOptions.lossless !== 0 && webpOptions.lossless !== 1)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Convert library options to WebP module options
   */
  private convertToWebPOptions(options: WebPOptions): WebPEncodeOptions {
    const defaults = this.getDefaultOptions();
    const merged = { ...defaults, ...options };

    return {
      quality: merged.quality!,
      target_size: merged.target_size!,
      target_PSNR: merged.target_PSNR!,
      method: merged.method!,
      sns_strength: merged.sns_strength!,
      filter_strength: merged.filter_strength!,
      filter_sharpness: merged.filter_sharpness!,
      filter_type: merged.filter_type!,
      partitions: merged.partitions!,
      segments: merged.segments!,
      pass: merged.pass!,
      show_compressed: merged.show_compressed!,
      preprocessing: merged.preprocessing!,
      autofilter: merged.autofilter!,
      partition_limit: merged.partition_limit!,
      alpha_compression: merged.alpha_compression!,
      alpha_filtering: merged.alpha_filtering!,
      alpha_quality: merged.alpha_quality!,
      lossless: merged.lossless!,
      exact: merged.exact!,
      image_hint: merged.image_hint!,
      emulate_jpeg_size: merged.emulate_jpeg_size!,
      thread_level: merged.thread_level!,
      low_memory: merged.low_memory!,
      near_lossless: merged.near_lossless!,
      use_delta_palette: merged.use_delta_palette!,
      use_sharp_yuv: merged.use_sharp_yuv!,
    };
  }

  /**
   * Encode ImageData to WebP format
   */
  async encode(imageData: ImageData, options?: EncodeOptions): Promise<ArrayBuffer> {
    this.validateImageData(imageData);

    const webpOptions = options as WebPOptions || {};
    
    if (!this.validateOptions(webpOptions)) {
      throw new EncodingError('Invalid WebP encoding options');
    }

    try {
      const module = await this.initModule();
      const moduleOptions = this.convertToWebPOptions(webpOptions);
      
      const result = module.encode(
        imageData.data,
        imageData.width,
        imageData.height,
        moduleOptions
      );

      if (!result) {
        throw new EncodingError('WebP encoding failed - unable to encode image data');
      }

      return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
    } catch (error) {
      if (error instanceof EncodingError) {
        throw error;
      }
      throw new EncodingError('WebP encoding failed', { error });
    }
  }

  /**
   * Check if WebP encoder is supported in the current environment
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