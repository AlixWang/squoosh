/**
 * Image processor interfaces
 */

import { ProcessorOptions } from '../types/index.js';

/**
 * Base interface for image processors that apply transformations to ImageData.
 * Processors can resize, rotate, quantize, or apply other transformations.
 *
 * @public
 */
export interface Processor {
  /** Unique name identifier for this processor */
  readonly name: string;

  /**
   * Process ImageData with the given options.
   *
   * @param imageData - The ImageData to process
   * @param options - Processing options specific to this processor
   * @returns Promise that resolves to the processed ImageData
   *
   * @throws {@link ProcessingError} When processing fails
   * @throws {@link ValidationError} When options are invalid
   */
  process(imageData: ImageData, options: ProcessorOptions): Promise<ImageData>;

  /**
   * Validate options for this processor.
   *
   * @param options - Options to validate
   * @returns True if options are valid for this processor
   */
  validateOptions(options: ProcessorOptions): boolean;
}

/**
 * Registry interface for managing image processors.
 *
 * @public
 */
export interface ProcessorRegistry {
  /**
   * Register a processor in the registry.
   *
   * @param processor - The processor to register
   */
  register(processor: Processor): void;

  /**
   * Unregister a processor from the registry.
   *
   * @param name - The name of the processor to unregister
   */
  unregister(name: string): void;

  /**
   * Get a processor by name.
   *
   * @param name - The name of the processor to get
   * @returns The processor, or undefined if not found
   */
  get(name: string): Processor | undefined;

  /**
   * Get all registered processors.
   *
   * @returns Array of all registered processors
   */
  getAll(): Processor[];
}
