# Image Compression Library Documentation

A comprehensive TypeScript library for image compression, format conversion, and processing operations.

## Table of Contents

- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Supported Formats](#supported-formats)
- [Processing Operations](#processing-operations)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)
- [Migration from Squoosh](#migration-from-squoosh)

## Quick Start

### Installation

```bash
npm install image-compression-lib
```

### Basic Usage

```typescript
import { ImageCompressor } from 'image-compression-lib';

const compressor = new ImageCompressor();

// Convert PNG to WebP
const webpBuffer = await compressor.convert(pngBuffer, 'webp', { quality: 80 });

// Decode image to ImageData
const imageData = await compressor.decode(jpegBuffer);

// Process and encode
const result = await compressor
  .pipeline()
  .input(imageBuffer)
  .resize({ width: 800, height: 600 })
  .rotate(90)
  .encode('avif', { quality: 90 })
  .execute();
```

## API Reference

### ImageCompressor Class

The main class providing all image compression functionality.

#### Constructor

```typescript
new ImageCompressor(codecManager?, processorRegistry?)
```

Creates a new ImageCompressor instance with optional custom codec manager and processor registry.

#### Methods

##### convert(input, targetFormat, options?)

Convert an image from one format to another.

**Parameters:**

- `input: ImageInput` - The input image (ArrayBuffer, Uint8Array, Blob, File, or ImageData)
- `targetFormat: ImageFormat` - Target format ('webp', 'avif', 'jpeg-xl', 'png', 'jpeg', 'qoi', 'wp2')
- `options?: EncodeOptions` - Optional encoding options

**Returns:** `Promise<ArrayBuffer>` - The converted image

**Example:**

```typescript
const webpBuffer = await compressor.convert(pngBuffer, 'webp', { quality: 85 });
```

##### decode(input)

Decode an image to ImageData format.

**Parameters:**

- `input: ImageInput` - The input image

**Returns:** `Promise<ImageData>` - The decoded image data

**Example:**

```typescript
const imageData = await compressor.decode(jpegBuffer);
console.log(`Dimensions: ${imageData.width}x${imageData.height}`);
```

##### encode(imageData, format, options?)

Encode ImageData to a specific format.

**Parameters:**

- `imageData: ImageData` - The image data to encode
- `format: ImageFormat` - Target format
- `options?: EncodeOptions` - Optional encoding options

**Returns:** `Promise<ArrayBuffer>` - The encoded image

**Example:**

```typescript
const avifBuffer = await compressor.encode(imageData, 'avif', { quality: 90 });
```

##### process(input, operations)

Apply processing operations to an image.

**Parameters:**

- `input: ImageInput` - The input image
- `operations: ProcessingOperation[]` - Array of operations to apply

**Returns:** `Promise<ImageData>` - The processed image data

**Example:**

```typescript
const processed = await compressor.process(inputBuffer, [
  { type: 'resize', options: { width: 800, height: 600 } },
  { type: 'rotate', options: { angle: 90 } },
]);
```

##### pipeline()

Create a new pipeline for chaining operations.

**Returns:** `ImagePipeline` - A new pipeline instance

**Example:**

```typescript
const result = await compressor
  .pipeline()
  .input(buffer)
  .resize({ width: 400, height: 300 })
  .encode('webp')
  .execute();
```

##### getSupportedFormats()

Get information about supported formats.

**Returns:** `SupportedFormats` - Object with arrays of supported encoders, decoders, and processors

##### getFormatInfo(format)

Get detailed information about a specific format.

**Parameters:**

- `format: ImageFormat` - The format to query

**Returns:** `FormatInfo` - Detailed format information

##### detectFormat(buffer)

Detect the format of an image from its binary data.

**Parameters:**

- `buffer: ArrayBuffer` - The image data to analyze

**Returns:** `ImageFormat | null` - The detected format or null

### ImagePipeline Class

Provides a fluent API for chaining image operations.

#### Methods

##### input(source)

Set the input source for the pipeline.

**Parameters:**

- `source: ImageInput` - The input image

**Returns:** `ImagePipeline` - The pipeline instance for chaining

##### decode()

Add a decode operation to the pipeline.

**Returns:** `ImagePipeline` - The pipeline instance for chaining

##### resize(options)

Add a resize operation to the pipeline.

**Parameters:**

- `options: ResizeOptions` - Resize configuration

**Returns:** `ImagePipeline` - The pipeline instance for chaining

##### rotate(angle)

Add a rotation operation to the pipeline.

**Parameters:**

- `angle: number` - Rotation angle in degrees (positive = clockwise)

**Returns:** `ImagePipeline` - The pipeline instance for chaining

##### quantize(options)

Add a quantization operation to the pipeline.

**Parameters:**

- `options: QuantizeOptions` - Quantization configuration

**Returns:** `ImagePipeline` - The pipeline instance for chaining

##### encode(format, options?)

Add an encoding operation to the pipeline.

**Parameters:**

- `format: ImageFormat` - Target format
- `options?: EncodeOptions` - Optional encoding options

**Returns:** `ImagePipeline` - The pipeline instance for chaining

##### execute()

Execute the pipeline and return the result.

**Returns:** `Promise<ArrayBuffer | ImageData>` - The result (ImageData if no encoding, ArrayBuffer if encoded)

##### reset()

Reset the pipeline to initial state.

**Returns:** `ImagePipeline` - The pipeline instance for chaining

##### clone()

Create a copy of the current pipeline state.

**Returns:** `ImagePipeline` - A new pipeline instance with the same configuration

## Supported Formats

### Input Formats (Decoding)

| Format  | Extension   | MIME Type  | Notes                                  |
| ------- | ----------- | ---------- | -------------------------------------- |
| WebP    | .webp       | image/webp | Lossy and lossless                     |
| AVIF    | .avif       | image/avif | Next-gen format, excellent compression |
| JPEG XL | .jxl        | image/jxl  | Next-gen format, backward compatible   |
| PNG     | .png        | image/png  | Lossless, transparency support         |
| JPEG    | .jpg, .jpeg | image/jpeg | Lossy, universal support               |
| QOI     | .qoi        | image/qoi  | Simple, fast lossless                  |
| WebP2   | .wp2        | image/wp2  | Experimental next-gen WebP             |

### Output Formats (Encoding)

All input formats are also supported for encoding with format-specific options.

## Processing Operations

### Resize

Resize images with various algorithms and fit methods.

```typescript
{
  type: 'resize',
  options: {
    width: 800,
    height: 600,
    method: 'lanczos3', // 'triangle', 'catrom', 'mitchell', 'lanczos3', 'hqx'
    fitMethod: 'stretch', // 'stretch', 'contain'
    premultiply: false,
    linearRGB: false
  }
}
```

### Rotate

Rotate images by specified angles.

```typescript
{
  type: 'rotate',
  options: {
    angle: 90 // Degrees (positive = clockwise)
  }
}
```

### Quantize

Reduce color palette for smaller file sizes.

```typescript
{
  type: 'quantize',
  options: {
    maxColors: 256, // 2-256
    dither: 0.5 // 0-1
  }
}
```

## Error Handling

The library provides specific error types for different failure scenarios:

### Error Types

- `ValidationError` - Invalid input parameters
- `UnsupportedFormatError` - Unsupported image format
- `EncodingError` - Encoding operation failed
- `DecodingError` - Decoding operation failed
- `ProcessingError` - Image processing failed
- `WorkerError` - Worker-related errors

### Error Handling Example

```typescript
import {
  ImageCompressor,
  ValidationError,
  UnsupportedFormatError,
} from 'image-compression-lib';

try {
  const result = await compressor.convert(input, 'webp');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  } else if (error instanceof UnsupportedFormatError) {
    console.error('Format not supported:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Performance Considerations

### Memory Management

- The library automatically manages memory and cleans up resources
- Use the pipeline API for complex operations to optimize memory usage
- Large images are processed efficiently using streaming where possible

### Worker Usage

- Web Workers are used automatically when available for CPU-intensive operations
- In Node.js, worker_threads are used for parallel processing
- Worker usage can be controlled through environment detection

### Optimization Tips

1. **Use appropriate quality settings** - Higher quality = larger files
2. **Choose the right format** - AVIF for photos, PNG for graphics with transparency
3. **Resize before encoding** - Smaller images encode faster
4. **Use pipeline for multiple operations** - More efficient than separate calls

## Migration from Squoosh

This library is designed to be a drop-in replacement for Squoosh with a cleaner API.

### Key Differences

1. **Unified API** - Single `ImageCompressor` class instead of separate codec imports
2. **Pipeline Support** - Fluent API for chaining operations
3. **Better Error Handling** - Specific error types with detailed messages
4. **TypeScript First** - Complete type definitions and IntelliSense support
5. **Environment Agnostic** - Works in both browser and Node.js

### Migration Example

**Squoosh (old):**

```typescript
import { ImagePool } from '@squoosh/lib';

const imagePool = new ImagePool();
const image = imagePool.ingestImage(buffer);
await image.decoded;
await image.encode({ webp: { quality: 80 } });
const { binary } = await image.encodedWith.webp;
```

**Image Compression Library (new):**

```typescript
import { ImageCompressor } from 'image-compression-lib';

const compressor = new ImageCompressor();
const binary = await compressor.convert(buffer, 'webp', { quality: 80 });
```

### Feature Mapping

| Squoosh Feature          | Library Equivalent          |
| ------------------------ | --------------------------- |
| `ImagePool`              | `ImageCompressor`           |
| `ingestImage()`          | `decode()`                  |
| `image.encode()`         | `encode()` or `convert()`   |
| Codec imports            | Built-in codec registry     |
| Manual worker management | Automatic worker management |

For more detailed examples and advanced usage, see the [examples directory](./examples/).
