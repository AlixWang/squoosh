/**
 * Core type definitions for the image compression library
 */

// Supported image formats
export type ImageFormat =
  | 'webp'
  | 'avif'
  | 'jpeg-xl'
  | 'png'
  | 'jpeg'
  | 'qoi'
  | 'wp2';

// Input types that can be processed
export type ImageInput = ArrayBuffer | Uint8Array | Blob | File | ImageData;

// Base encoding options
export interface EncodeOptions {
  quality?: number;
  [key: string]: any; // Format-specific options
}

// Resize operation options
export interface ResizeOptions {
  width: number;
  height: number;
  method?: 'triangle' | 'catrom' | 'mitchell' | 'lanczos3' | 'hqx';
  fitMethod?: 'stretch' | 'contain';
  premultiply?: boolean;
  linearRGB?: boolean;
}

// Quantization options
export interface QuantizeOptions {
  maxColors: number;
  dither?: number;
}

// Processing operation definition
export interface ProcessingOperation {
  type: 'resize' | 'rotate' | 'quantize';
  options: ResizeOptions | number | QuantizeOptions;
}

// Supported formats information
export interface SupportedFormats {
  encoders: ImageFormat[];
  decoders: ImageFormat[];
  processors: string[];
}

// Format information
export interface FormatInfo {
  format: ImageFormat;
  mimeType: string;
  extension: string;
  supportsLossless: boolean;
  supportsTransparency: boolean;
  defaultOptions: EncodeOptions;
}

// Worker communication types
export interface WorkerMessage {
  id: string;
  type: 'encode' | 'decode' | 'process';
  payload: {
    operation: string;
    data: ArrayBuffer | ImageData;
    options?: any;
  };
}

export interface WorkerResponse {
  id: string;
  success: boolean;
  result?: ArrayBuffer | ImageData;
  error?: string;
  timing?: number;
}

// Processor options union type
export type ProcessorOptions =
  | ResizeOptions
  | QuantizeOptions
  | { angle: number };
