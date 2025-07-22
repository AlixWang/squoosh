/**
 * Advanced usage examples for the Image Compression Library
 */

import {
  ImageCompressor,
  ImageFormat,
  WebPOptions,
  AVIFOptions,
  JXLOptions,
  ValidationError,
  UnsupportedFormatError,
  EncodingError,
} from 'image-compression-lib';

/**
 * Example 1: Batch processing with different formats
 */
export class BatchImageProcessor {
  private compressor = new ImageCompressor();

  async processBatch(
    images: ArrayBuffer[],
    targetFormat: ImageFormat,
    options?: any,
  ): Promise<ArrayBuffer[]> {
    return Promise.all(
      images.map((image) =>
        this.compressor.convert(image, targetFormat, options),
      ),
    );
  }

  async processWithMultipleFormats(
    image: ArrayBuffer,
  ): Promise<Record<ImageFormat, ArrayBuffer>> {
    const formats: ImageFormat[] = ['webp', 'avif', 'jpeg-xl', 'png'];
    const results: Partial<Record<ImageFormat, ArrayBuffer>> = {};

    await Promise.all(
      formats.map(async (format) => {
        try {
          results[format] = await this.compressor.convert(image, format, {
            quality: 85,
          });
        } catch (error) {
          console.warn(`Failed to convert to ${format}:`, error);
        }
      }),
    );

    return results as Record<ImageFormat, ArrayBuffer>;
  }
}

/**
 * Example 2: Format-specific optimization
 */
export class FormatOptimizer {
  private compressor = new ImageCompressor();

  async optimizeForWeb(imageBuffer: ArrayBuffer): Promise<{
    webp: ArrayBuffer;
    avif: ArrayBuffer;
    fallback: ArrayBuffer;
  }> {
    const webpOptions: WebPOptions = {
      quality: 85,
      method: 6,
      lossless: false,
    };

    const avifOptions: AVIFOptions = {
      quality: 70,
      speed: 6,
      lossless: false,
    };

    const jxlOptions: JXLOptions = {
      quality: 80,
      effort: 7,
      progressive: true,
    };

    const [webp, avif, fallback] = await Promise.all([
      this.compressor.convert(imageBuffer, 'webp', webpOptions),
      this.compressor.convert(imageBuffer, 'avif', avifOptions),
      this.compressor.convert(imageBuffer, 'jpeg-xl', jxlOptions),
    ]);

    return { webp, avif, fallback };
  }

  async optimizeForSize(
    imageBuffer: ArrayBuffer,
    maxSizeBytes: number,
  ): Promise<ArrayBuffer> {
    const formats: Array<{ format: ImageFormat; options: any }> = [
      { format: 'avif', options: { quality: 60 } },
      { format: 'webp', options: { quality: 70 } },
      { format: 'jpeg-xl', options: { quality: 75 } },
      { format: 'jpeg', options: { quality: 80 } },
    ];

    for (const { format, options } of formats) {
      try {
        const result = await this.compressor.convert(
          imageBuffer,
          format,
          options,
        );
        if (result.byteLength <= maxSizeBytes) {
          return result;
        }
      } catch (error) {
        console.warn(`Failed to encode as ${format}:`, error);
      }
    }

    throw new Error(`Unable to compress image to ${maxSizeBytes} bytes`);
  }
}

/**
 * Example 3: Responsive image generation
 */
export class ResponsiveImageGenerator {
  private compressor = new ImageCompressor();

  async generateResponsiveSet(
    originalImage: ArrayBuffer,
    sizes: Array<{ width: number; height: number; suffix: string }>,
  ): Promise<Record<string, ArrayBuffer>> {
    const results: Record<string, ArrayBuffer> = {};

    for (const size of sizes) {
      const resized = (await this.compressor
        .pipeline()
        .input(originalImage)
        .resize({
          width: size.width,
          height: size.height,
          method: 'lanczos3',
          fitMethod: 'contain',
        })
        .encode('webp', { quality: 85 })
        .execute()) as ArrayBuffer;

      results[size.suffix] = resized;
    }

    return results;
  }

  async generateWebPSet(originalImage: ArrayBuffer): Promise<{
    small: ArrayBuffer;
    medium: ArrayBuffer;
    large: ArrayBuffer;
    original: ArrayBuffer;
  }> {
    const basePipeline = this.compressor.pipeline().input(originalImage);

    const [small, medium, large, original] = await Promise.all([
      basePipeline
        .clone()
        .resize({ width: 400, height: 300 })
        .encode('webp', { quality: 80 })
        .execute(),
      basePipeline
        .clone()
        .resize({ width: 800, height: 600 })
        .encode('webp', { quality: 85 })
        .execute(),
      basePipeline
        .clone()
        .resize({ width: 1200, height: 900 })
        .encode('webp', { quality: 90 })
        .execute(),
      basePipeline.clone().encode('webp', { quality: 95 }).execute(),
    ]);

    return {
      small: small as ArrayBuffer,
      medium: medium as ArrayBuffer,
      large: large as ArrayBuffer,
      original: original as ArrayBuffer,
    };
  }
}

/**
 * Example 4: Error handling and recovery
 */
export class RobustImageProcessor {
  private compressor = new ImageCompressor();
  private fallbackFormats: ImageFormat[] = ['webp', 'png', 'jpeg'];

  async processWithFallback(
    imageBuffer: ArrayBuffer,
    preferredFormat: ImageFormat,
  ): Promise<{ buffer: ArrayBuffer; format: ImageFormat }> {
    const formats = [
      preferredFormat,
      ...this.fallbackFormats.filter((f) => f !== preferredFormat),
    ];

    for (const format of formats) {
      try {
        const buffer = await this.compressor.convert(imageBuffer, format, {
          quality: 85,
        });
        return { buffer, format };
      } catch (error) {
        if (error instanceof UnsupportedFormatError) {
          console.warn(`Format ${format} not supported, trying next...`);
          continue;
        }
        console.error(`Error processing ${format}:`, error);
      }
    }

    throw new Error('All format conversions failed');
  }

  async safeProcess(
    imageBuffer: ArrayBuffer,
    operations: Array<{ type: string; options: any }>,
  ): Promise<ArrayBuffer | null> {
    try {
      const processed = await this.compressor.process(
        imageBuffer,
        operations as any,
      );
      return await this.compressor.encode(processed, 'webp', { quality: 85 });
    } catch (error) {
      if (error instanceof ValidationError) {
        console.error('Validation failed:', error.message, error.context);
      } else if (error instanceof EncodingError) {
        console.error('Encoding failed:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
      return null;
    }
  }
}

/**
 * Example 5: Performance monitoring
 */
export class PerformanceMonitor {
  private compressor = new ImageCompressor();

  async benchmarkFormats(
    imageBuffer: ArrayBuffer,
  ): Promise<Record<string, any>> {
    const formats: ImageFormat[] = ['webp', 'avif', 'jpeg-xl', 'png', 'jpeg'];
    const results: Record<string, any> = {};

    for (const format of formats) {
      const startTime = performance.now();

      try {
        const result = await this.compressor.convert(imageBuffer, format, {
          quality: 85,
        });
        const endTime = performance.now();

        results[format] = {
          success: true,
          duration: endTime - startTime,
          size: result.byteLength,
          compressionRatio: imageBuffer.byteLength / result.byteLength,
        };
      } catch (error) {
        results[format] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return results;
  }

  async measurePipelinePerformance(imageBuffer: ArrayBuffer): Promise<{
    totalTime: number;
    steps: Array<{ operation: string; duration: number }>;
    result: ArrayBuffer;
  }> {
    const steps: Array<{ operation: string; duration: number }> = [];
    const totalStart = performance.now();

    // Decode
    let stepStart = performance.now();
    const imageData = await this.compressor.decode(imageBuffer);
    steps.push({
      operation: 'decode',
      duration: performance.now() - stepStart,
    });

    // Resize
    stepStart = performance.now();
    const resized = await this.compressor.process(imageData, [
      {
        type: 'resize',
        options: { width: 800, height: 600 },
      },
    ]);
    steps.push({
      operation: 'resize',
      duration: performance.now() - stepStart,
    });

    // Encode
    stepStart = performance.now();
    const result = await this.compressor.encode(resized, 'webp', {
      quality: 85,
    });
    steps.push({
      operation: 'encode',
      duration: performance.now() - stepStart,
    });

    const totalTime = performance.now() - totalStart;

    return { totalTime, steps, result };
  }
}

/**
 * Example 6: Custom processing workflows
 */
export class CustomWorkflows {
  private compressor = new ImageCompressor();

  async createThumbnail(
    imageBuffer: ArrayBuffer,
    maxSize: number = 200,
  ): Promise<ArrayBuffer> {
    const imageData = await this.compressor.decode(imageBuffer);
    const aspectRatio = imageData.width / imageData.height;

    let width: number, height: number;
    if (aspectRatio > 1) {
      width = maxSize;
      height = Math.round(maxSize / aspectRatio);
    } else {
      height = maxSize;
      width = Math.round(maxSize * aspectRatio);
    }

    return (await this.compressor
      .pipeline()
      .input(imageBuffer)
      .resize({ width, height, method: 'lanczos3' })
      .encode('webp', { quality: 80 })
      .execute()) as ArrayBuffer;
  }

  async createProgressiveJPEG(imageBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    return await this.compressor.convert(imageBuffer, 'jpeg', {
      quality: 85,
      progressive: true,
      baseline: false,
    });
  }

  async optimizeForPrint(imageBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    return (await this.compressor
      .pipeline()
      .input(imageBuffer)
      .resize({
        width: 3000,
        height: 2000,
        method: 'lanczos3',
        linearRGB: true,
      })
      .encode('png')
      .execute()) as ArrayBuffer;
  }
}
