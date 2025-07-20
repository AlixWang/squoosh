/**
 * Base processor abstract class
 */

import { Processor } from '../interfaces/processor.js';
import { ProcessorOptions } from '../types/index.js';

export abstract class BaseProcessor implements Processor {
  abstract readonly name: string;

  abstract process(imageData: ImageData, options: ProcessorOptions): Promise<ImageData>;

  abstract validateOptions(options: ProcessorOptions): boolean;

  /**
   * Helper method to validate common image data
   */
  protected validateImageData(imageData: ImageData): void {
    if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
      throw new Error('Invalid ImageData provided');
    }
  }

  /**
   * Helper method to create new ImageData
   */
  protected createImageData(width: number, height: number): ImageData {
    if (typeof ImageData !== 'undefined') {
      return new ImageData(width, height);
    }
    // Fallback for Node.js environment
    const data = new Uint8ClampedArray(width * height * 4);
    return {
      data,
      width,
      height,
      colorSpace: 'srgb'
    } as ImageData;
  }

  /**
   * Helper method to copy ImageData
   */
  protected copyImageData(source: ImageData): ImageData {
    const copy = this.createImageData(source.width, source.height);
    copy.data.set(source.data);
    return copy;
  }
}