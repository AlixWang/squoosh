/**
 * Image processor interfaces
 */

import { ProcessorOptions } from '../types/index.js';

// Base processor interface
export interface Processor {
  readonly name: string;
  process(imageData: ImageData, options: ProcessorOptions): Promise<ImageData>;
  validateOptions(options: ProcessorOptions): boolean;
}

// Registry interface for managing processors
export interface ProcessorRegistry {
  register(processor: Processor): void;
  unregister(name: string): void;
  get(name: string): Processor | undefined;
  getAll(): Processor[];
}
