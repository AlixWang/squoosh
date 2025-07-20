/**
 * Processor registry tests
 */

import { ProcessorRegistry } from '../processor-registry';
import { BaseProcessor } from '../base-processor';
import { ProcessorOptions } from '../../types';

// Mock processors for testing
class MockProcessor1 extends BaseProcessor {
  readonly name = 'mock1';

  async process(imageData: ImageData, options: ProcessorOptions): Promise<ImageData> {
    return imageData;
  }

  validateOptions(options: ProcessorOptions): boolean {
    return true;
  }
}

class MockProcessor2 extends BaseProcessor {
  readonly name = 'mock2';

  async process(imageData: ImageData, options: ProcessorOptions): Promise<ImageData> {
    return imageData;
  }

  validateOptions(options: ProcessorOptions): boolean {
    return true;
  }
}

describe('ProcessorRegistry', () => {
  let registry: ProcessorRegistry;
  let processor1: MockProcessor1;
  let processor2: MockProcessor2;

  beforeEach(() => {
    registry = new ProcessorRegistry();
    processor1 = new MockProcessor1();
    processor2 = new MockProcessor2();
  });

  describe('register', () => {
    it('should register a processor', () => {
      registry.register(processor1);
      expect(registry.has('mock1')).toBe(true);
      expect(registry.get('mock1')).toBe(processor1);
    });

    it('should allow registering multiple processors', () => {
      registry.register(processor1);
      registry.register(processor2);
      
      expect(registry.has('mock1')).toBe(true);
      expect(registry.has('mock2')).toBe(true);
    });

    it('should overwrite existing processor with same name', () => {
      const anotherProcessor1 = new MockProcessor1();
      
      registry.register(processor1);
      registry.register(anotherProcessor1);
      
      expect(registry.get('mock1')).toBe(anotherProcessor1);
      expect(registry.get('mock1')).not.toBe(processor1);
    });
  });

  describe('unregister', () => {
    it('should unregister a processor', () => {
      registry.register(processor1);
      expect(registry.has('mock1')).toBe(true);
      
      registry.unregister('mock1');
      expect(registry.has('mock1')).toBe(false);
      expect(registry.get('mock1')).toBeUndefined();
    });

    it('should not throw when unregistering non-existent processor', () => {
      expect(() => registry.unregister('nonexistent')).not.toThrow();
    });
  });

  describe('get', () => {
    it('should return registered processor', () => {
      registry.register(processor1);
      expect(registry.get('mock1')).toBe(processor1);
    });

    it('should return undefined for non-existent processor', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no processors registered', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered processors', () => {
      registry.register(processor1);
      registry.register(processor2);
      
      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(processor1);
      expect(all).toContain(processor2);
    });
  });

  describe('has', () => {
    it('should return true for registered processor', () => {
      registry.register(processor1);
      expect(registry.has('mock1')).toBe(true);
    });

    it('should return false for non-existent processor', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('getNames', () => {
    it('should return empty array when no processors registered', () => {
      expect(registry.getNames()).toEqual([]);
    });

    it('should return all processor names', () => {
      registry.register(processor1);
      registry.register(processor2);
      
      const names = registry.getNames();
      expect(names).toHaveLength(2);
      expect(names).toContain('mock1');
      expect(names).toContain('mock2');
    });
  });

  describe('clear', () => {
    it('should remove all processors', () => {
      registry.register(processor1);
      registry.register(processor2);
      
      expect(registry.getAll()).toHaveLength(2);
      
      registry.clear();
      
      expect(registry.getAll()).toHaveLength(0);
      expect(registry.has('mock1')).toBe(false);
      expect(registry.has('mock2')).toBe(false);
    });
  });
});