/**
 * Processor registry implementation
 */

import { Processor, ProcessorRegistry as IProcessorRegistry } from '../interfaces/processor.js';

export class ProcessorRegistry implements IProcessorRegistry {
  private processors = new Map<string, Processor>();

  register(processor: Processor): void {
    this.processors.set(processor.name, processor);
  }

  unregister(name: string): void {
    this.processors.delete(name);
  }

  get(name: string): Processor | undefined {
    return this.processors.get(name);
  }

  getAll(): Processor[] {
    return Array.from(this.processors.values());
  }

  /**
   * Check if a processor is registered
   */
  has(name: string): boolean {
    return this.processors.has(name);
  }

  /**
   * Get all registered processor names
   */
  getNames(): string[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Clear all registered processors
   */
  clear(): void {
    this.processors.clear();
  }
}

// Global processor registry instance
export const processorRegistry = new ProcessorRegistry();