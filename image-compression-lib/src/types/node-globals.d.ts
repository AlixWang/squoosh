// Global type definitions for Node.js environment

declare global {
  // ImageData polyfill for Node.js
  class ImageData {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;

    constructor(data: Uint8ClampedArray, width: number, height?: number);
    constructor(width: number, height: number);
  }

  // WebAssembly types for Node.js
  namespace WebAssembly {
    class Module {
      constructor(bytes: BufferSource);
      static customSections(module: Module, sectionName: string): ArrayBuffer[];
    }

    class Instance {
      readonly exports: any;
      constructor(module: Module, importObject?: Imports);
    }

    class Memory {
      readonly buffer: ArrayBuffer;
      constructor(descriptor: MemoryDescriptor);
      grow(delta: number): number;
    }

    interface MemoryDescriptor {
      initial: number;
      maximum?: number;
      shared?: boolean;
    }

    interface Imports {
      [module: string]: {
        [name: string]: any;
      };
    }

    interface WebAssemblyInstantiatedSource {
      instance: Instance;
      module: Module;
    }

    function compile(bytes: BufferSource): Promise<Module>;
    function instantiate(
      bytes: BufferSource,
      importObject?: Imports,
    ): Promise<WebAssemblyInstantiatedSource>;
    function instantiate(
      module: Module,
      importObject?: Imports,
    ): Promise<Instance>;
  }

  // Browser globals that should be undefined in Node.js
  const window: any;
  const document: any;
  const navigator: any;
  const Worker: any;
  const OffscreenCanvas: any;
  const HTMLCanvasElement: any;
  const MessageEvent: any;
  const ErrorEvent: any;

  // BufferSource type for Node.js
  type BufferSource = ArrayBufferView | ArrayBuffer;

  // Global namespace extension
  namespace NodeJS {
    interface Global {
      ImageData: typeof ImageData;
    }
  }
}

export {};
