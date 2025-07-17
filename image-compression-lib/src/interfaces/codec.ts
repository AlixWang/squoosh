/**
 * Core codec interfaces for encoders and decoders
 */

import { ImageFormat, EncodeOptions } from '../types/index.js';

// Base codec interface
export interface BaseCodec {
  readonly format: ImageFormat;
  readonly mimeType: string;
  readonly extension: string;
  isSupported(): Promise<boolean>;
}

// Encoder interface
export interface Encoder extends BaseCodec {
  encode(imageData: ImageData, options?: EncodeOptions): Promise<ArrayBuffer>;
  getDefaultOptions(): EncodeOptions;
  validateOptions(options: EncodeOptions): boolean;
}

// Decoder interface
export interface Decoder extends BaseCodec {
  decode(buffer: ArrayBuffer): Promise<ImageData>;
  canDecode(buffer: ArrayBuffer): boolean;
}

// Registry interface for managing codecs
export interface CodecRegistry<T extends BaseCodec> {
  register(codec: T): void;
  unregister(format: ImageFormat): void;
  get(format: ImageFormat): T | undefined;
  getAll(): T[];
  isSupported(format: ImageFormat): Promise<boolean>;
}
