# @squoosh/image-compression-lib

A TypeScript library for image compression and format conversion based on Squoosh. Supports multiple image formats with optimized performance for both Node.js and browser environments.

## Features

- 🖼️ **Multiple Formats**: WebP, AVIF, JPEG XL, PNG, MozJPEG
- 🔄 **Format Conversion**: Convert between any supported formats
- 🎛️ **Image Processing**: Resize, rotate, and quantize images
- 🌐 **Cross-Platform**: Works in Node.js and browsers
- ⚡ **Performance**: Worker-based processing and WASM optimization
- 📦 **Tree Shakable**: Optimized bundle size with tree-shaking
- 🔧 **TypeScript**: Full TypeScript support with comprehensive types
- 🧩 **Extensible**: Plugin-based architecture

## Installation

```bash
npm install @squoosh/image-compression-lib
```

## Quick Start

### Basic Usage

```typescript
import { ImageCompressor } from '@squoosh/image-compression-lib';

const compressor = new ImageCompressor();

// Convert image format
const webpBuffer = await compressor.convert(imageBuffer, 'webp', {
  quality: 80,
});

// Decode image
const imageData = await compressor.decode(imageBuffer);

// Process and encode
const resizedBuffer = await compressor
  .pipeline()
  .input(imageBuffer)
  .decode()
  .resize({ width: 800, height: 600 })
  .encode('webp', { quality: 85 })
  .execute();
```

### Advanced Usage

```typescript
import { ImageCompressor } from '@squoosh/image-compression-lib';

const compressor = new ImageCompressor({
  maxWorkers: 4,
  enableWorkers: true,
});

// Complex processing pipeline
const result = await compressor
  .pipeline()
  .input(imageBuffer)
  .decode()
  .resize({ width: 1200, height: 800, method: 'lanczos3' })
  .rotate(90)
  .quantize({ maxColors: 256 })
  .encode('avif', { quality: 70, speed: 6 })
  .execute();
```

## Supported Formats

| Format  | Encode | Decode | Description                                  |
| ------- | ------ | ------ | -------------------------------------------- |
| WebP    | ✅     | ✅     | Modern web format with excellent compression |
| AVIF    | ✅     | ✅     | Next-gen format with superior compression    |
| JPEG XL | ✅     | ✅     | Latest standard with advanced features       |
| PNG     | ✅     | ✅     | Lossless format with transparency support    |
| MozJPEG | ✅     | ✅     | Optimized JPEG encoder                       |

## API Reference

### ImageCompressor

Main class for image compression operations.

#### Methods

- `convert(input, format, options?)` - Convert image to specified format
- `decode(input)` - Decode image to ImageData
- `encode(imageData, format, options?)` - Encode ImageData to buffer
- `process(input, operations)` - Apply processing operations
- `pipeline()` - Create processing pipeline
- `getSupportedFormats()` - Get supported formats
- `detectFormat(buffer)` - Detect image format

### Processing Operations

- **Resize**: `{ width: number, height: number, method?: string }`
- **Rotate**: `90 | 180 | 270` (degrees)
- **Quantize**: `{ maxColors: number, dither?: number }`

## Browser Usage

```html
<script type="module">
  import { ImageCompressor } from '@squoosh/image-compression-lib/browser';

  const compressor = new ImageCompressor();
  // Use as shown above
</script>
```

## Node.js Usage

```javascript
const { ImageCompressor } = require('@squoosh/image-compression-lib/node');
// or
import { ImageCompressor } from '@squoosh/image-compression-lib/node';
```

## Performance Tips

1. **Enable Workers**: Use `enableWorkers: true` for CPU-intensive operations
2. **Reuse Instance**: Create one compressor instance and reuse it
3. **Optimize Settings**: Adjust quality/speed settings based on your needs
4. **Memory Management**: Process large batches in chunks

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  ImageCompressor,
  ImageFormat,
  EncodeOptions,
  ProcessingOperation,
} from '@squoosh/image-compression-lib';

const compressor: ImageCompressor = new ImageCompressor();
const format: ImageFormat = 'webp';
const options: EncodeOptions = { quality: 80 };
```

## Error Handling

```typescript
import { ImageCompressionError } from '@squoosh/image-compression-lib';

try {
  const result = await compressor.convert(buffer, 'webp');
} catch (error) {
  if (error instanceof ImageCompressionError) {
    console.error('Compression failed:', error.message);
    console.error('Error code:', error.code);
  }
}
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

Based on the excellent [Squoosh](https://github.com/GoogleChromeLabs/squoosh) project by Google Chrome Labs.
