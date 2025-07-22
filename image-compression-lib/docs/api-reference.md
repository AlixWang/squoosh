# API Reference

Complete API reference for the Image Compression Library.

## Table of Contents

- [Classes](#classes)
- [Interfaces](#interfaces)
- [Types](#types)
- [Error Classes](#error-classes)
- [Constants](#constants)

## Classes

### ImageCompressor

The main class providing all image compression functionality.

```typescript
class ImageCompressor implements IImageCompressor
```

#### Constructor

```typescript
constructor(codecManager?: CodecManager, processorRegistry?: ProcessorRegistry)
```

Creates a new ImageCompressor instance.

**Parameters:**

- `codecManager` (optional): Custom codec manager
- `processorRegistry` (optional): Custom processor registry

#### Methods

##### convert()

```typescript
convert(input: ImageInput, targetFormat: ImageFormat, options?: EncodeOptions): Promise<ArrayBuffer>
```

Convert an image from one format to another.

**Parameters:**

- `input`: The input image data
- `targetFormat`: Target format for conversion
- `options`: Optional encoding options

**Returns:** Promise resolving to converted image buffer

**Throws:**

- `ValidationError`: Invalid input parameters
- `UnsupportedFormatError`: Unsupported target format
- `EncodingError`: Conversion failed

##### decode()

```typescript
decode(input: ImageInput): Promise<ImageData>
```

Decode an image to ImageData format.

**Parameters:**

- `input`: The input image data

**Returns:** Promise resolving to ImageData

**Throws:**

- `ValidationError`: Invalid input
- `UnsupportedFormatError`: Unsupported input format
- `DecodingError`: Decoding failed

##### encode()

```typescript
encode(imageData: ImageData, format: ImageFormat, options?: EncodeOptions): Promise<ArrayBuffer>
```

Encode ImageData to a specific format.

**Parameters:**

- `imageData`: ImageData to encode
- `format`: Target format
- `options`: Optional encoding options

**Returns:** Promise resolving to encoded image buffer

**Throws:**

- `ValidationError`: Invalid parameters
- `UnsupportedFormatError`: Unsupported format
- `EncodingError`: Encoding failed

##### process()

```typescript
process(input: ImageInput, operations: ProcessingOperation[]): Promise<ImageData>
```

Apply processing operations to an image.

**Parameters:**

- `input`: Input image data
- `operations`: Array of processing operations

**Returns:** Promise resolving to processed ImageData

**Throws:**

- `ValidationError`: Invalid parameters
- `ProcessingError`: Processing failed

##### pipeline()

```typescript
pipeline(): ImagePipeline
```

Create a new pipeline for chaining operations.

**Returns:** New ImagePipeline instance

##### getSupportedFormats()

```typescript
getSupportedFormats(): SupportedFormats
```

Get information about supported formats.

**Returns:** Object with supported encoders, decoders, and processors

##### getFormatInfo()

```typescript
getFormatInfo(format: ImageFormat): FormatInfo
```

Get detailed information about a format.

**Parameters:**

- `format`: Format to query

**Returns:** Detailed format information

**Throws:**

- `UnsupportedFormatError`: Format not supported

##### detectFormat()

```typescript
detectFormat(buffer: ArrayBuffer): ImageFormat | null
```

Detect image format from binary data.

**Parameters:**

- `buffer`: Image data to analyze

**Returns:** Detected format or null

### ImagePipeline

Provides fluent API for chaining operations.

```typescript
class ImagePipeline
```

#### Methods

##### input()

```typescript
input(source: ImageInput): ImagePipeline
```

Set input source for the pipeline.

##### decode()

```typescript
decode(): ImagePipeline
```

Add decode operation to the pipeline.

##### resize()

```typescript
resize(options: ResizeOptions): ImagePipeline
```

Add resize operation to the pipeline.

##### rotate()

```typescript
rotate(angle: number): ImagePipeline
```

Add rotation operation to the pipeline.

##### quantize()

```typescript
quantize(options: QuantizeOptions): ImagePipeline
```

Add quantization operation to the pipeline.

##### encode()

```typescript
encode(format: ImageFormat, options?: EncodeOptions): ImagePipeline
```

Add encoding operation to the pipeline.

##### execute()

```typescript
execute(): Promise<ArrayBuffer | ImageData>
```

Execute the pipeline and return result.

##### reset()

```typescript
reset(): ImagePipeline
```

Reset pipeline to initial state.

##### clone()

```typescript
clone(): ImagePipeline
```

Create copy of current pipeline state.

## Interfaces

### BaseCodec

Base interface for all codecs.

```typescript
interface BaseCodec {
  readonly format: ImageFormat;
  readonly mimeType: string;
  readonly extension: string;
  isSupported(): Promise<boolean>;
}
```

### Encoder

Interface for image encoders.

```typescript
interface Encoder extends BaseCodec {
  encode(imageData: ImageData, options?: EncodeOptions): Promise<ArrayBuffer>;
  getDefaultOptions(): EncodeOptions;
  validateOptions(options: EncodeOptions): boolean;
}
```

### Decoder

Interface for image decoders.

```typescript
interface Decoder extends BaseCodec {
  decode(buffer: ArrayBuffer): Promise<ImageData>;
  canDecode(buffer: ArrayBuffer): boolean;
}
```

### Processor

Interface for image processors.

```typescript
interface Processor {
  readonly name: string;
  process(imageData: ImageData, options: ProcessorOptions): Promise<ImageData>;
  validateOptions(options: ProcessorOptions): boolean;
}
```

## Types

### ImageFormat

Supported image formats.

```typescript
type ImageFormat = 'webp' | 'avif' | 'jpeg-xl' | 'png' | 'jpeg' | 'qoi' | 'wp2';
```

### ImageInput

Input types that can be processed.

```typescript
type ImageInput = ArrayBuffer | Uint8Array | Blob | File | ImageData;
```

### EncodeOptions

Base encoding options.

```typescript
interface EncodeOptions {
  quality?: number;
  [key: string]: any;
}
```

### Format-Specific Options

#### WebPOptions

```typescript
interface WebPOptions extends EncodeOptions {
  quality?: number;
  target_size?: number;
  method?: number;
  lossless?: boolean;
}
```

#### AVIFOptions

```typescript
interface AVIFOptions extends EncodeOptions {
  quality?: number;
  qualityAlpha?: number;
  speed?: number;
  lossless?: boolean;
}
```

#### JXLOptions

```typescript
interface JXLOptions extends EncodeOptions {
  quality?: number;
  effort?: number;
  lossless?: boolean;
  progressive?: boolean;
}
```

#### PNGOptions

```typescript
interface PNGOptions extends EncodeOptions {
  compressionLevel?: number;
  optimizePalette?: boolean;
}
```

#### JPEGOptions

```typescript
interface JPEGOptions extends EncodeOptions {
  quality?: number;
  baseline?: boolean;
  arithmetic?: boolean;
  progressive?: boolean;
}
```

### ResizeOptions

Options for resize operations.

```typescript
interface ResizeOptions {
  width: number;
  height: number;
  method?: 'triangle' | 'catrom' | 'mitchell' | 'lanczos3' | 'hqx';
  fitMethod?: 'stretch' | 'contain';
  premultiply?: boolean;
  linearRGB?: boolean;
}
```

### QuantizeOptions

Options for quantization operations.

```typescript
interface QuantizeOptions {
  maxColors: number;
  dither?: number;
}
```

### RotateOptions

Options for rotation operations.

```typescript
interface RotateOptions {
  angle: number;
}
```

### ProcessingOperation

Definition of a processing operation.

```typescript
interface ProcessingOperation {
  type: 'resize' | 'rotate' | 'quantize';
  options: ResizeOptions | RotateOptions | QuantizeOptions;
}
```

### SupportedFormats

Information about supported formats.

```typescript
interface SupportedFormats {
  encoders: ImageFormat[];
  decoders: ImageFormat[];
  processors: string[];
}
```

### FormatInfo

Detailed format information.

```typescript
interface FormatInfo {
  format: ImageFormat;
  mimeType: string;
  extension: string;
  supportsLossless: boolean;
  supportsTransparency: boolean;
  defaultOptions: EncodeOptions;
}
```

## Error Classes

### ImageCompressionError

Base error class for all library errors.

```typescript
class ImageCompressionError extends Error {
  constructor(message: string, code?: string, context?: any);
  readonly code?: string;
  readonly context?: any;
}
```

### ValidationError

Thrown when input validation fails.

```typescript
class ValidationError extends ImageCompressionError {
  constructor(message: string, code?: string, context?: any);
}
```

### UnsupportedFormatError

Thrown when an unsupported format is requested.

```typescript
class UnsupportedFormatError extends ImageCompressionError {
  constructor(format: string, availableFormats?: string[]);
  readonly format: string;
  readonly availableFormats?: string[];
}
```

### EncodingError

Thrown when encoding operations fail.

```typescript
class EncodingError extends ImageCompressionError {
  constructor(message: string, format?: string, context?: any);
  readonly format?: string;
}
```

### DecodingError

Thrown when decoding operations fail.

```typescript
class DecodingError extends ImageCompressionError {
  constructor(message: string, context?: any);
}
```

### ProcessingError

Thrown when image processing operations fail.

```typescript
class ProcessingError extends ImageCompressionError {
  constructor(message: string, operation?: string, context?: any);
  readonly operation?: string;
}
```

### WorkerError

Thrown when worker-related operations fail.

```typescript
class WorkerError extends ImageCompressionError {
  constructor(message: string, workerId?: string, context?: any);
  readonly workerId?: string;
}
```

## Constants

### DEFAULT_QUALITY

Default quality setting for lossy compression.

```typescript
const DEFAULT_QUALITY = 75;
```

### SUPPORTED_FORMATS

Array of all supported image formats.

```typescript
const SUPPORTED_FORMATS: ImageFormat[] = [
  'webp',
  'avif',
  'jpeg-xl',
  'png',
  'jpeg',
  'qoi',
  'wp2',
];
```

### MIME_TYPES

Mapping of formats to MIME types.

```typescript
const MIME_TYPES: Record<ImageFormat, string> = {
  webp: 'image/webp',
  avif: 'image/avif',
  'jpeg-xl': 'image/jxl',
  png: 'image/png',
  jpeg: 'image/jpeg',
  qoi: 'image/qoi',
  wp2: 'image/wp2',
};
```

### FILE_EXTENSIONS

Mapping of formats to file extensions.

```typescript
const FILE_EXTENSIONS: Record<ImageFormat, string> = {
  webp: '.webp',
  avif: '.avif',
  'jpeg-xl': '.jxl',
  png: '.png',
  jpeg: '.jpg',
  qoi: '.qoi',
  wp2: '.wp2',
};
```
