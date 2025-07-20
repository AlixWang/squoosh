/**
 * Codec validation and feature detection utilities
 */

import { ImageFormat } from '../types/index.js';

/**
 * Format detection utilities based on buffer analysis
 */
export class FormatDetector {
  /**
   * Detect image format from buffer by analyzing magic bytes/signatures
   */
  static detectFormat(buffer: ArrayBuffer): ImageFormat | null {
    if (!buffer || buffer.byteLength < 2) {
      return null;
    }

    const bytes = new Uint8Array(buffer);
    
    // WebP: "RIFF" + 4 bytes + "WEBP"
    if (bytes.length >= 12 &&
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return 'webp';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes.length >= 8 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
        bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
      return 'png';
    }

    // JPEG XL: FF 0A or 00 00 00 0C 4A 58 4C 20 0D 0A 87 0A (check before JPEG)
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0x0A) {
      return 'jpeg-xl';
    }
    if (bytes.length >= 12 &&
        bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x00 && bytes[3] === 0x0C &&
        bytes[4] === 0x4A && bytes[5] === 0x58 && bytes[6] === 0x4C && bytes[7] === 0x20 &&
        bytes[8] === 0x0D && bytes[9] === 0x0A && bytes[10] === 0x87 && bytes[11] === 0x0A) {
      return 'jpeg-xl';
    }

    // JPEG: FF D8
    if (bytes.length >= 2 &&
        bytes[0] === 0xFF && bytes[1] === 0xD8) {
      return 'jpeg';
    }

    // AVIF: Check for ftyp box with AVIF brand
    if (bytes.length >= 12 &&
        bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 &&
        bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66) {
      return 'avif';
    }

    // QOI: "qoif"
    if (bytes.length >= 4 &&
        bytes[0] === 0x71 && bytes[1] === 0x6F && bytes[2] === 0x69 && bytes[3] === 0x66) {
      return 'qoi';
    }

    // WP2: "RIFF" + 4 bytes + "WP2 "
    if (bytes.length >= 12 &&
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x50 && bytes[10] === 0x32 && bytes[11] === 0x20) {
      return 'wp2';
    }

    return null;
  }

  /**
   * Get MIME type for a given format
   */
  static getMimeType(format: ImageFormat): string {
    const mimeTypes: Record<ImageFormat, string> = {
      'webp': 'image/webp',
      'avif': 'image/avif',
      'jpeg-xl': 'image/jxl',
      'png': 'image/png',
      'jpeg': 'image/jpeg',
      'qoi': 'image/qoi',
      'wp2': 'image/wp2',
    };
    return mimeTypes[format];
  }

  /**
   * Get file extension for a given format
   */
  static getExtension(format: ImageFormat): string {
    const extensions: Record<ImageFormat, string> = {
      'webp': '.webp',
      'avif': '.avif',
      'jpeg-xl': '.jxl',
      'png': '.png',
      'jpeg': '.jpg',
      'qoi': '.qoi',
      'wp2': '.wp2',
    };
    return extensions[format];
  }

  /**
   * Check if format supports lossless compression
   */
  static supportsLossless(format: ImageFormat): boolean {
    const losslessFormats: Set<ImageFormat> = new Set([
      'png', 'webp', 'avif', 'jpeg-xl', 'qoi', 'wp2'
    ]);
    return losslessFormats.has(format);
  }

  /**
   * Check if format supports transparency
   */
  static supportsTransparency(format: ImageFormat): boolean {
    const transparencyFormats: Set<ImageFormat> = new Set([
      'png', 'webp', 'avif', 'jpeg-xl', 'qoi', 'wp2'
    ]);
    return transparencyFormats.has(format);
  }
}

/**
 * Environment feature detection utilities
 */
export class FeatureDetector {
  /**
   * Check if WebAssembly is supported
   */
  static hasWebAssembly(): boolean {
    try {
      return typeof WebAssembly !== 'undefined' && 
             typeof WebAssembly.instantiate === 'function';
    } catch {
      return false;
    }
  }

  /**
   * Check if Web Workers are supported
   */
  static hasWebWorkers(): boolean {
    try {
      return typeof Worker !== 'undefined';
    } catch {
      return false;
    }
  }

  /**
   * Check if SharedArrayBuffer is supported (for multi-threading)
   */
  static hasSharedArrayBuffer(): boolean {
    try {
      return typeof SharedArrayBuffer !== 'undefined';
    } catch {
      return false;
    }
  }

  /**
   * Check if we're running in Node.js environment
   */
  static isNodeEnvironment(): boolean {
    try {
      return typeof process !== 'undefined' && 
             process.versions != null && 
             process.versions.node != null;
    } catch {
      return false;
    }
  }

  /**
   * Check if we're running in a browser environment
   */
  static isBrowserEnvironment(): boolean {
    try {
      return typeof window !== 'undefined' && 
             typeof document !== 'undefined';
    } catch {
      return false;
    }
  }

  /**
   * Get environment capabilities summary
   */
  static getCapabilities() {
    return {
      webAssembly: this.hasWebAssembly(),
      webWorkers: this.hasWebWorkers(),
      sharedArrayBuffer: this.hasSharedArrayBuffer(),
      isNode: this.isNodeEnvironment(),
      isBrowser: this.isBrowserEnvironment(),
    };
  }
}

/**
 * Codec validation utilities
 */
export class CodecValidator {
  /**
   * Validate that ImageData is properly formatted
   */
  static validateImageData(imageData: ImageData): boolean {
    if (!imageData) return false;
    if (!imageData.data || imageData.data.length === 0) return false;
    if (imageData.width <= 0 || imageData.height <= 0) return false;
    if (imageData.data.length !== imageData.width * imageData.height * 4) return false;
    return true;
  }

  /**
   * Validate buffer contains data
   */
  static validateBuffer(buffer: ArrayBuffer): boolean {
    return buffer != null && buffer.byteLength > 0;
  }

  /**
   * Validate encoding options
   */
  static validateEncodeOptions(options: any): boolean {
    if (!options) return true;
    
    // Check quality parameter
    if (options.quality !== undefined) {
      if (typeof options.quality !== 'number' || 
          options.quality < 0 || 
          options.quality > 100) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sanitize encoding options by removing invalid values
   */
  static sanitizeEncodeOptions(options: any): any {
    if (!options) return {};

    const sanitized = { ...options };

    // Sanitize quality
    if (sanitized.quality !== undefined) {
      if (typeof sanitized.quality !== 'number' || 
          sanitized.quality < 0 || 
          sanitized.quality > 100) {
        delete sanitized.quality;
      }
    }

    return sanitized;
  }
}