# Migration Guide from Squoosh

This guide helps you migrate from the Squoosh library to the Image Compression Library, which provides a cleaner, more modern API while maintaining all the core functionality.

## Table of Contents

- [Overview](#overview)
- [Key Differences](#key-differences)
- [Installation](#installation)
- [API Migration](#api-migration)
- [Feature Mapping](#feature-mapping)
- [Common Patterns](#common-patterns)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

The Image Compression Library is built on the same proven WebAssembly codecs as Squoosh but provides:

- **Unified API**: Single `ImageCompressor` class instead of separate codec imports
- **Pipeline Support**: Fluent API for chaining operations
- **Better Error Handling**: Specific error types with detailed messages
- **TypeScript First**: Complete type definitions and IntelliSense support
- **Environment Agnostic**: Works seamlessly in both browser and Node.js
- **Automatic Resource Management**: No manual worker or memory management

## Key Differences

### Architecture

| Aspect             | Squoosh                | Image Compression Library      |
| ------------------ | ---------------------- | ------------------------------ |
| API Design         | Codec-specific imports | Unified ImageCompressor class  |
| Worker Management  | Manual ImagePool       | Automatic worker management    |
| Error Handling     | Generic errors         | Specific error types           |
| TypeScript Support | Basic types            | Comprehensive type definitions |
| Operation Chaining | Manual                 | Built-in pipeline API          |

### Dependencies

**Squoosh:**

```json
{
  "@squoosh/lib": "^0.4.0",
  "@squoosh/cli": "^0.7.0"
}
```

**Image Compression Library:**

```json
{
  "image-compression-lib": "^1.0.0"
}
```

## Installation

### Remove Squoosh

```bash
npm uninstall @squoosh/lib @squoosh/cli
```

### Install Image Compression Library

```bash
npm install image-compression-lib
```

## API Migration

### Basic Image Conversion

**Squoosh (old):**

```typescript
import { ImagePool } from '@squoosh/lib';

const imagePool = new ImagePool();
const image = imagePool.ingestImage(buffer);
await image.decoded;

await image.encode({
  webp: { quality: 80 },
});

const { binary } = await image.encodedWith.webp;
await imagePool.close();
```

**Image Compression Library (new):**

```typescript
import { ImageCompressor } from 'image-compression-lib';

const compressor = new ImageCompressor();
const binary = await compressor.convert(buffer, 'webp', { quality: 80 });
// No manual cleanup needed
```

### Multiple Format Encoding

**Squoosh (old):**

```typescript
import { ImagePool } from '@squoosh/lib';

const imagePool = new ImagePool();
const image = imagePool.ingestImage(buffer);
await image.decoded;

// Encode to multiple formats
await image.encode({
  webp: { quality: 80 },
  avif: { quality: 70 },
  'jpeg-xl': { quality: 85 },
});

const webpBinary = await image.encodedWith.webp.binary;
const avifBinary = await image.encodedWith.avif.binary;
const jxlBinary = await image.encodedWith['jpeg-xl'].binary;

await imagePool.close();
```

**Image Compression Library (new):**

```typescript
import { ImageCompressor } from 'image-compression-lib';

const compressor = new ImageCompressor();

// Parallel encoding
const [webpBinary, avifBinary, jxlBinary] = await Promise.all([
  compressor.convert(buffer, 'webp', { quality: 80 }),
  compressor.convert(buffer, 'avif', { quality: 70 }),
  compressor.convert(buffer, 'jpeg-xl', { quality: 85 }),
]);
```

### Image Processing

**Squoosh (old):**

```typescript
import { ImagePool } from '@squoosh/lib';

const imagePool = new ImagePool();
const image = imagePool.ingestImage(buffer);
await image.decoded;

// Resize
await image.preprocess({
  resize: {
    width: 800,
    height: 600,
  },
});

// Rotate
await image.preprocess({
  rotate: { numRotations: 1 }, // 90 degrees
});

// Encode
await image.encode({ webp: { quality: 80 } });
const { binary } = await image.encodedWith.webp;

await imagePool.close();
```

**Image Compression Library (new):**

```typescript
import { ImageCompressor } from 'image-compression-lib';

const compressor = new ImageCompressor();

// Using process method
const processed = await compressor.process(buffer, [
  { type: 'resize', options: { width: 800, height: 600 } },
  { type: 'rotate', options: { angle: 90 } },
]);
const binary = await compressor.encode(processed, 'webp', { quality: 80 });

// Or using pipeline (recommended)
const binary = await compressor
  .pipeline()
  .input(buffer)
  .resize({ width: 800, height: 600 })
  .rotate(90)
  .encode('webp', { quality: 80 })
  .execute();
```

## Feature Mapping

### Codecs

| Format  | Squoosh Import     | Library Usage             |
| ------- | ------------------ | ------------------------- |
| WebP    | `@squoosh/webp`    | Built-in, use `'webp'`    |
| AVIF    | `@squoosh/avif`    | Built-in, use `'avif'`    |
| JPEG XL | `@squoosh/jxl`     | Built-in, use `'jpeg-xl'` |
| PNG     | `@squoosh/oxipng`  | Built-in, use `'png'`     |
| JPEG    | `@squoosh/mozjpeg` | Built-in, use `'jpeg'`    |

### Processing Operations

| Operation | Squoosh                                    | Library                             |
| --------- | ------------------------------------------ | ----------------------------------- |
| Resize    | `preprocess({ resize: {...} })`            | `resize({ width, height, method })` |
| Rotate    | `preprocess({ rotate: { numRotations } })` | `rotate(angle)`                     |
| Quantize  | `preprocess({ quantize: {...} })`          | `quantize({ maxColors, dither })`   |

### Options

**WebP Options:**

```typescript
// Squoosh
{ webp: { quality: 80, target_size: 0, method: 4 } }

// Library
{ quality: 80, target_size: 50000, method: 4 }
```

**AVIF Options:**

```typescript
// Squoosh
{ avif: { cqLevel: 33, cqAlphaLevel: -1, speed: 6 } }

// Library
{ quality: 67, qualityAlpha: 67, speed: 6 }
```

## Common Patterns

### Batch Processing

**Squoosh (old):**

```typescript
import { ImagePool } from '@squoosh/lib';

const imagePool = new ImagePool();

async function processBatch(buffers: ArrayBuffer[]) {
  const results = [];

  for (const buffer of buffers) {
    const image = imagePool.ingestImage(buffer);
    await image.decoded;
    await image.encode({ webp: { quality: 80 } });
    results.push(await image.encodedWith.webp.binary);
  }

  await imagePool.close();
  return results;
}
```

**Image Compression Library (new):**

```typescript
import { ImageCompressor } from 'image-compression-lib';

const compressor = new ImageCompressor();

async function processBatch(buffers: ArrayBuffer[]) {
  return Promise.all(
    buffers.map((buffer) =>
      compressor.convert(buffer, 'webp', { quality: 80 }),
    ),
  );
}
```

### Conditional Processing

**Squoosh (old):**

```typescript
import { ImagePool } from '@squoosh/lib';

const imagePool = new ImagePool();
const image = imagePool.ingestImage(buffer);
await image.decoded;

if (image.bitmap.width > 1920) {
  await image.preprocess({
    resize: { width: 1920, height: 1080 },
  });
}

await image.encode({ webp: { quality: 80 } });
const { binary } = await image.encodedWith.webp;
await imagePool.close();
```

**Image Compression Library (new):**

```typescript
import { ImageCompressor } from 'image-compression-lib';

const compressor = new ImageCompressor();
const imageData = await compressor.decode(buffer);

let pipeline = compressor.pipeline().input(buffer);

if (imageData.width > 1920) {
  pipeline = pipeline.resize({ width: 1920, height: 1080 });
}

const binary = await pipeline.encode('webp', { quality: 80 }).execute();
```

### Error Handling

**Squoosh (old):**

```typescript
import { ImagePool } from '@squoosh/lib';

try {
  const imagePool = new ImagePool();
  const image = imagePool.ingestImage(buffer);
  await image.decoded;
  await image.encode({ webp: { quality: 80 } });
  const { binary } = await image.encodedWith.webp;
  await imagePool.close();
  return binary;
} catch (error) {
  console.error('Processing failed:', error.message);
  return null;
}
```

**Image Compression Library (new):**

```typescript
import {
  ImageCompressor,
  ValidationError,
  UnsupportedFormatError,
  EncodingError,
} from 'image-compression-lib';

try {
  const compressor = new ImageCompressor();
  return await compressor.convert(buffer, 'webp', { quality: 80 });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  } else if (error instanceof UnsupportedFormatError) {
    console.error('Format not supported:', error.format);
  } else if (error instanceof EncodingError) {
    console.error('Encoding failed:', error.message);
  }
  return null;
}
```

## Performance Considerations

### Memory Management

**Squoosh:**

- Manual `ImagePool` lifecycle management
- Explicit `close()` calls required
- Memory leaks possible if not properly closed

**Image Compression Library:**

- Automatic resource management
- No manual cleanup required
- Built-in memory optimization

### Worker Usage

**Squoosh:**

- Manual worker pool configuration
- Limited to browser environments
- Complex setup for Node.js

**Image Compression Library:**

- Automatic worker detection and usage
- Cross-platform (browser and Node.js)
- Optimal worker pool sizing

### Codec Loading

**Squoosh:**

- Manual codec imports
- Bundle size includes all codecs
- No lazy loading

**Image Compression Library:**

- Automatic codec registration
- Lazy loading of codec modules
- Smaller initial bundle size

## Troubleshooting

### Common Migration Issues

#### 1. Import Errors

**Problem:**

```typescript
import { webp_encode } from '@squoosh/webp/encode';
// Module not found
```

**Solution:**

```typescript
import { ImageCompressor } from 'image-compression-lib';
const compressor = new ImageCompressor();
```

#### 2. API Method Changes

**Problem:**

```typescript
const image = imagePool.ingestImage(buffer);
await image.decoded; // Property doesn't exist
```

**Solution:**

```typescript
const imageData = await compressor.decode(buffer);
```

#### 3. Option Format Changes

**Problem:**

```typescript
// Squoosh AVIF options don't work
await compressor.encode(imageData, 'avif', { cqLevel: 33 });
```

**Solution:**

```typescript
// Use quality instead of cqLevel
await compressor.encode(imageData, 'avif', { quality: 67 });
```

#### 4. Worker Management

**Problem:**

```typescript
// Manual worker management no longer needed
const imagePool = new ImagePool(4); // Worker count
await imagePool.close(); // Manual cleanup
```

**Solution:**

```typescript
// Automatic worker management
const compressor = new ImageCompressor();
// No manual cleanup needed
```

### Performance Tips

1. **Reuse ImageCompressor instances** - Create once, use multiple times
2. **Use pipeline for complex operations** - More efficient than separate calls
3. **Leverage parallel processing** - Use `Promise.all()` for batch operations
4. **Choose appropriate quality settings** - Balance file size and quality

### Getting Help

If you encounter issues during migration:

1. Check the [API documentation](./README.md)
2. Review [TypeScript examples](./typescript-examples.md)
3. Compare with the [feature mapping](#feature-mapping) above
4. Look for similar patterns in the [common patterns](#common-patterns) section

The Image Compression Library is designed to be a drop-in replacement for most Squoosh use cases while providing a more modern and developer-friendly API.
