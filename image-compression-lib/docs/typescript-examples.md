# TypeScript Usage Examples

This document provides comprehensive TypeScript examples demonstrating the full capabilities of the Image Compression Library.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Format-Specific Options](#format-specific-options)
- [Pipeline Operations](#pipeline-operations)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)
- [Type-Safe Development](#type-safe-development)

## Basic Usage

### Simple Format Conversion

```typescript
import { ImageCompressor, ImageFormat } from 'image-compression-lib';

async function convertImage(
  inputBuffer: ArrayBuffer,
  targetFormat: ImageFormat,
): Promise<ArrayBuffer> {
  const compressor = new ImageCompressor();
  return await compressor.convert(inputBuffer, targetFormat, { quality: 85 });
}

// Usage
const pngBuffer: ArrayBuffer = await fetch('image.png').then((r) =>
  r.arrayBuffer(),
);
const webpBuffer = await convertImage(pngBuffer, 'webp');
```

### Working with Different Input Types

```typescript
import { ImageCompressor, ImageInput } from 'image-compression-lib';

class ImageProcessor {
  private compressor = new ImageCompressor();

  async processFile(file: File): Promise<ArrayBuffer> {
    return await this.compressor.convert(file, 'webp', { quality: 80 });
  }

  async processBlob(blob: Blob): Promise<ArrayBuffer> {
    return await this.compressor.convert(blob, 'avif', { quality: 90 });
  }

  async processArrayBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    return await this.compressor.convert(buffer, 'jpeg-xl', { quality: 85 });
  }

  async processImageData(imageData: ImageData): Promise<ArrayBuffer> {
    return await this.compressor.encode(imageData, 'png');
  }
}
```

## Format-Specific Options

### WebP Options

```typescript
import { ImageCompressor, WebPOptions } from 'image-compression-lib';

async function encodeWebP(imageData: ImageData): Promise<ArrayBuffer> {
  const compressor = new ImageCompressor();

  const options: WebPOptions = {
    quality: 85,
    method: 6, // Higher compression method
    lossless: false, // Use lossy compression
    target_size: 50000, // Target 50KB file size
  };

  return await compressor.encode(imageData, 'webp', options);
}
```

### AVIF Options

```typescript
import { ImageCompressor, AVIFOptions } from 'image-compression-lib';

async function encodeAVIF(imageData: ImageData): Promise<ArrayBuffer> {
  const compressor = new ImageCompressor();

  const options: AVIFOptions = {
    quality: 60, // Main image quality
    qualityAlpha: 80, // Alpha channel quality
    speed: 6, // Encoding speed (0-10)
    lossless: false,
  };

  return await compressor.encode(imageData, 'avif', options);
}
```

### JPEG XL Options

```typescript
import { ImageCompressor, JXLOptions } from 'image-compression-lib';

async function encodeJXL(imageData: ImageData): Promise<ArrayBuffer> {
  const compressor = new ImageCompressor();

  const options: JXLOptions = {
    quality: 90,
    effort: 7, // Encoding effort (1-9)
    lossless: false,
    progressive: true, // Enable progressive encoding
  };

  return await compressor.encode(imageData, 'jpeg-xl', options);
}
```

### Type-Safe Option Handling

```typescript
import {
  ImageCompressor,
  ImageFormat,
  FormatOptionsMap,
  OptionsForFormat,
} from 'image-compression-lib';

class TypeSafeEncoder {
  private compressor = new ImageCompressor();

  async encodeWithOptions<T extends ImageFormat>(
    imageData: ImageData,
    format: T,
    options: OptionsForFormat<T>,
  ): Promise<ArrayBuffer> {
    return await this.compressor.encode(imageData, format, options);
  }
}

// Usage with full type safety
const encoder = new TypeSafeEncoder();

// TypeScript will enforce WebPOptions for 'webp' format
await encoder.encodeWithOptions(imageData, 'webp', {
  quality: 85,
  lossless: false,
});

// TypeScript will enforce AVIFOptions for 'avif' format
await encoder.encodeWithOptions(imageData, 'avif', {
  quality: 70,
  qualityAlpha: 90,
});
```

## Pipeline Operations

### Basic Pipeline

```typescript
import {
  ImageCompressor,
  ResizeOptions,
  QuantizeOptions,
} from 'image-compression-lib';

async function processImagePipeline(
  inputBuffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  const compressor = new ImageCompressor();

  const resizeOptions: ResizeOptions = {
    width: 800,
    height: 600,
    method: 'lanczos3',
    fitMethod: 'contain',
    linearRGB: true,
  };

  const quantizeOptions: QuantizeOptions = {
    maxColors: 256,
    dither: 0.5,
  };

  return (await compressor
    .pipeline()
    .input(inputBuffer)
    .resize(resizeOptions)
    .quantize(quantizeOptions)
    .rotate(90)
    .encode('webp', { quality: 85 })
    .execute()) as ArrayBuffer;
}
```

### Conditional Pipeline Processing

```typescript
import { ImageCompressor, ImagePipeline } from 'image-compression-lib';

interface ProcessingConfig {
  resize?: { width: number; height: number };
  rotate?: number;
  quality?: number;
  format: 'webp' | 'avif' | 'jpeg-xl';
}

async function conditionalProcessing(
  inputBuffer: ArrayBuffer,
  config: ProcessingConfig,
): Promise<ArrayBuffer> {
  const compressor = new ImageCompressor();
  let pipeline: ImagePipeline = compressor.pipeline().input(inputBuffer);

  // Conditionally add resize
  if (config.resize) {
    pipeline = pipeline.resize({
      width: config.resize.width,
      height: config.resize.height,
      method: 'lanczos3',
    });
  }

  // Conditionally add rotation
  if (config.rotate) {
    pipeline = pipeline.rotate(config.rotate);
  }

  // Always encode with specified format and quality
  pipeline = pipeline.encode(config.format, {
    quality: config.quality ?? 80,
  });

  return (await pipeline.execute()) as ArrayBuffer;
}
```

### Pipeline Reuse and Cloning

```typescript
import { ImageCompressor } from 'image-compression-lib';

class BatchProcessor {
  private compressor = new ImageCompressor();

  async processBatch(
    images: ArrayBuffer[],
    sizes: Array<{ width: number; height: number }>,
  ): Promise<ArrayBuffer[][]> {
    const results: ArrayBuffer[][] = [];

    for (const image of images) {
      const basePipeline = this.compressor.pipeline().input(image).rotate(0); // Normalize rotation

      const imageResults: ArrayBuffer[] = [];

      for (const size of sizes) {
        const pipeline = basePipeline
          .clone()
          .resize({ width: size.width, height: size.height })
          .encode('webp', { quality: 85 });

        imageResults.push((await pipeline.execute()) as ArrayBuffer);
      }

      results.push(imageResults);
    }

    return results;
  }
}
```

## Error Handling

### Comprehensive Error Handling

```typescript
import {
  ImageCompressor,
  ValidationError,
  UnsupportedFormatError,
  EncodingError,
  DecodingError,
  ProcessingError,
  WorkerError,
} from 'image-compression-lib';

class SafeImageProcessor {
  private compressor = new ImageCompressor();

  async safeConvert(
    input: ArrayBuffer,
    format: string,
  ): Promise<ArrayBuffer | null> {
    try {
      // Type guard for format
      if (!this.isValidFormat(format)) {
        throw new ValidationError(`Invalid format: ${format}`);
      }

      return await this.compressor.convert(input, format, { quality: 85 });
    } catch (error) {
      return this.handleError(error);
    }
  }

  private isValidFormat(format: string): format is ImageFormat {
    const validFormats = [
      'webp',
      'avif',
      'jpeg-xl',
      'png',
      'jpeg',
      'qoi',
      'wp2',
    ];
    return validFormats.includes(format);
  }

  private handleError(error: unknown): null {
    if (error instanceof ValidationError) {
      console.error('Validation failed:', error.message);
      console.error('Context:', error.context);
    } else if (error instanceof UnsupportedFormatError) {
      console.error('Format not supported:', error.format);
      console.error('Available formats:', error.availableFormats);
    } else if (error instanceof EncodingError) {
      console.error('Encoding failed:', error.message);
      console.error('Format:', error.format);
    } else if (error instanceof DecodingError) {
      console.error('Decoding failed:', error.message);
    } else if (error instanceof ProcessingError) {
      console.error('Processing failed:', error.message);
      console.error('Operations:', error.operations);
    } else if (error instanceof WorkerError) {
      console.error('Worker error:', error.message);
      console.error('Worker ID:', error.workerId);
    } else {
      console.error('Unexpected error:', error);
    }

    return null;
  }
}
```

### Error Recovery Strategies

```typescript
import { ImageCompressor, UnsupportedFormatError } from 'image-compression-lib';

class ResilientProcessor {
  private compressor = new ImageCompressor();
  private fallbackFormats: ImageFormat[] = ['webp', 'png', 'jpeg'];

  async convertWithFallback(
    input: ArrayBuffer,
    preferredFormat: ImageFormat,
  ): Promise<{ buffer: ArrayBuffer; format: ImageFormat }> {
    const formats = [preferredFormat, ...this.fallbackFormats];

    for (const format of formats) {
      try {
        const buffer = await this.compressor.convert(input, format, {
          quality: 85,
        });
        return { buffer, format };
      } catch (error) {
        if (error instanceof UnsupportedFormatError) {
          console.warn(`Format ${format} not supported, trying next...`);
          continue;
        }
        throw error; // Re-throw non-format errors
      }
    }

    throw new Error('All format conversions failed');
  }
}
```

## Advanced Usage

### Custom Codec Management

```typescript
import {
  ImageCompressor,
  CodecManager,
  ProcessorRegistry,
} from 'image-compression-lib';

class CustomImageProcessor {
  private compressor: ImageCompressor;

  constructor() {
    const codecManager = new CodecManager();
    const processorRegistry = new ProcessorRegistry();

    // Custom initialization could go here
    this.compressor = new ImageCompressor(codecManager, processorRegistry);
  }

  async getCapabilities() {
    const supported = this.compressor.getSupportedFormats();

    return {
      canEncode: supported.encoders,
      canDecode: supported.decoders,
      processors: supported.processors,
    };
  }

  async analyzeFormat(buffer: ArrayBuffer) {
    const format = this.compressor.detectFormat(buffer);

    if (format) {
      const info = this.compressor.getFormatInfo(format);
      return {
        format,
        mimeType: info.mimeType,
        extension: info.extension,
        supportsLossless: info.supportsLossless,
        supportsTransparency: info.supportsTransparency,
        defaultOptions: info.defaultOptions,
      };
    }

    return null;
  }
}
```

### Performance Monitoring

```typescript
import { ImageCompressor } from 'image-compression-lib';

class PerformanceAwareProcessor {
  private compressor = new ImageCompressor();

  async timedConversion(
    input: ArrayBuffer,
    format: ImageFormat,
  ): Promise<{ result: ArrayBuffer; duration: number; size: number }> {
    const startTime = performance.now();

    const result = await this.compressor.convert(input, format, {
      quality: 85,
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      result,
      duration,
      size: result.byteLength,
    };
  }

  async benchmarkFormats(input: ArrayBuffer): Promise<Record<string, any>> {
    const formats: ImageFormat[] = ['webp', 'avif', 'jpeg-xl', 'png'];
    const results: Record<string, any> = {};

    for (const format of formats) {
      try {
        const { result, duration, size } = await this.timedConversion(
          input,
          format,
        );
        results[format] = {
          success: true,
          duration,
          size,
          compressionRatio: input.byteLength / size,
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
}
```

## Type-Safe Development

### Generic Processing Functions

```typescript
import {
  ImageCompressor,
  ImageFormat,
  FormatOptionsMap,
  ProcessingOperation,
} from 'image-compression-lib';

// Generic function with format constraints
async function processAndEncode<T extends ImageFormat>(
  input: ArrayBuffer,
  operations: ProcessingOperation[],
  format: T,
  options: FormatOptionsMap[T],
): Promise<ArrayBuffer> {
  const compressor = new ImageCompressor();

  const processed = await compressor.process(input, operations);
  return await compressor.encode(processed, format, options);
}

// Usage with full type safety
const result = await processAndEncode(
  inputBuffer,
  [{ type: 'resize', options: { width: 800, height: 600 } }],
  'webp',
  { quality: 85, lossless: false }, // TypeScript enforces WebPOptions
);
```

### Type Guards and Validation

```typescript
import { ImageFormat, ImageInput } from 'image-compression-lib';

// Type guards
function isImageFormat(value: string): value is ImageFormat {
  const formats: ImageFormat[] = [
    'webp',
    'avif',
    'jpeg-xl',
    'png',
    'jpeg',
    'qoi',
    'wp2',
  ];
  return formats.includes(value as ImageFormat);
}

function isArrayBuffer(value: any): value is ArrayBuffer {
  return value instanceof ArrayBuffer;
}

function isImageInput(value: any): value is ImageInput {
  return (
    value instanceof ArrayBuffer ||
    value instanceof Uint8Array ||
    value instanceof Blob ||
    value instanceof File ||
    value instanceof ImageData
  );
}

// Usage in validation
function validateInput(
  format: unknown,
  input: unknown,
): { format: ImageFormat; input: ImageInput } {
  if (typeof format !== 'string' || !isImageFormat(format)) {
    throw new Error('Invalid format');
  }

  if (!isImageInput(input)) {
    throw new Error('Invalid input type');
  }

  return { format, input };
}
```

### Interface Extensions

```typescript
import { ImageCompressor, EncodeOptions } from 'image-compression-lib';

// Extend base options for custom use cases
interface CustomWebPOptions extends EncodeOptions {
  quality: number;
  customSetting?: boolean;
  metadata?: {
    title?: string;
    description?: string;
  };
}

class ExtendedProcessor {
  private compressor = new ImageCompressor();

  async encodeWithMetadata(
    imageData: ImageData,
    options: CustomWebPOptions,
  ): Promise<ArrayBuffer> {
    // Process metadata if needed
    if (options.metadata) {
      console.log('Processing metadata:', options.metadata);
    }

    // Use base options for encoding
    const baseOptions: EncodeOptions = {
      quality: options.quality,
    };

    return await this.compressor.encode(imageData, 'webp', baseOptions);
  }
}
```

This comprehensive TypeScript guide demonstrates how to leverage the full type safety and features of the Image Compression Library. The examples show best practices for error handling, performance monitoring, and type-safe development patterns.
