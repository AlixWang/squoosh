/**
 * Test data with sample images in various formats
 * @jest-environment node
 */

import { ImageFormat } from '../types/index.js';
import { createTestImageBuffer, createTestImageData } from './test-utils.js';

/**
 * Sample image data for testing
 */
export const TestImages = {
  // Small test images (100x100)
  small: {
    webp: createTestImageBuffer('webp', 100, 100),
    avif: createTestImageBuffer('avif', 100, 100),
    'jpeg-xl': createTestImageBuffer('jpeg-xl', 100, 100),
    png: createTestImageBuffer('png', 100, 100),
    jpeg: createTestImageBuffer('jpeg', 100, 100),
    qoi: createTestImageBuffer('qoi', 100, 100),
    wp2: createTestImageBuffer('wp2', 100, 100),
  },

  // Medium test images (500x500)
  medium: {
    webp: createTestImageBuffer('webp', 500, 500),
    avif: createTestImageBuffer('avif', 500, 500),
    'jpeg-xl': createTestImageBuffer('jpeg-xl', 500, 500),
    png: createTestImageBuffer('png', 500, 500),
    jpeg: createTestImageBuffer('jpeg', 500, 500),
    qoi: createTestImageBuffer('qoi', 500, 500),
    wp2: createTestImageBuffer('wp2', 500, 500),
  },

  // Large test images (2000x2000)
  large: {
    webp: createTestImageBuffer('webp', 2000, 2000),
    avif: createTestImageBuffer('avif', 2000, 2000),
    'jpeg-xl': createTestImageBuffer('jpeg-xl', 2000, 2000),
    png: createTestImageBuffer('png', 2000, 2000),
    jpeg: createTestImageBuffer('jpeg', 2000, 2000),
    qoi: createTestImageBuffer('qoi', 2000, 2000),
    wp2: createTestImageBuffer('wp2', 2000, 2000),
  },

  // ImageData samples
  imageData: {
    small: createTestImageData(100, 100, 'gradient'),
    medium: createTestImageData(500, 500, 'checkerboard'),
    large: createTestImageData(2000, 2000, 'solid'),
  },
};

/**
 * Edge case test data
 */
export const EdgeCaseImages = {
  // Minimum size images (1x1)
  tiny: {
    webp: createTestImageBuffer('webp', 1, 1),
    png: createTestImageBuffer('png', 1, 1),
    imageData: createTestImageData(1, 1),
  },

  // Unusual aspect ratios
  wide: {
    webp: createTestImageBuffer('webp', 1000, 10),
    png: createTestImageBuffer('png', 1000, 10),
    imageData: createTestImageData(1000, 10),
  },

  tall: {
    webp: createTestImageBuffer('webp', 10, 1000),
    png: createTestImageBuffer('png', 10, 1000),
    imageData: createTestImageData(10, 1000),
  },

  // Square power-of-2 dimensions
  square256: {
    webp: createTestImageBuffer('webp', 256, 256),
    png: createTestImageBuffer('png', 256, 256),
    imageData: createTestImageData(256, 256),
  },

  square512: {
    webp: createTestImageBuffer('webp', 512, 512),
    png: createTestImageBuffer('png', 512, 512),
    imageData: createTestImageData(512, 512),
  },
};

/**
 * Corrupted/invalid test data
 */
export const InvalidImages = {
  // Empty buffers
  empty: new ArrayBuffer(0),

  // Too small buffers
  tooSmall: new ArrayBuffer(4),

  // Invalid signatures
  invalidSignature: (() => {
    const buffer = new ArrayBuffer(12);
    const view = new Uint8Array(buffer);
    view.set([
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    ]);
    return buffer;
  })(),

  // Truncated images (valid signature but incomplete data)
  truncatedWebP: (() => {
    const fullBuffer = createTestImageBuffer('webp', 100, 100);
    return fullBuffer.slice(0, 20); // Keep only first 20 bytes
  })(),

  truncatedPNG: (() => {
    const fullBuffer = createTestImageBuffer('png', 100, 100);
    return fullBuffer.slice(0, 20); // Keep only first 20 bytes
  })(),

  // Invalid ImageData
  invalidImageData: new ImageData(new Uint8ClampedArray(0), 0, 0),
};

/**
 * Test options for different scenarios
 */
export const TestOptions = {
  // Encoding options
  encoding: {
    webp: {
      lowQuality: { quality: 10 },
      mediumQuality: { quality: 50 },
      highQuality: { quality: 90 },
      lossless: { quality: 100, lossless: true },
    },
    avif: {
      lowQuality: { quality: 20 },
      mediumQuality: { quality: 60 },
      highQuality: { quality: 90 },
    },
    'jpeg-xl': {
      lowQuality: { quality: 30 },
      mediumQuality: { quality: 70 },
      highQuality: { quality: 95 },
      lossless: { lossless: true },
    },
    png: {
      default: {},
      compressed: { level: 9 },
    },
    jpeg: {
      lowQuality: { quality: 20 },
      mediumQuality: { quality: 60 },
      highQuality: { quality: 90 },
    },
  },

  // Processing options
  processing: {
    resize: {
      downscale: { width: 50, height: 50 },
      upscale: { width: 200, height: 200 },
      aspectRatio: { width: 100, height: 50 },
      methods: [
        { width: 100, height: 100, method: 'triangle' as const },
        { width: 100, height: 100, method: 'catrom' as const },
        { width: 100, height: 100, method: 'mitchell' as const },
        { width: 100, height: 100, method: 'lanczos3' as const },
      ],
    },
    rotate: {
      angles: [{ angle: 90 }, { angle: 180 }, { angle: 270 }],
      invalidAngles: [
        { angle: 45 },
        { angle: 135 },
        { angle: 225 },
        { angle: 315 },
      ], // Should be rejected
    },
    quantize: {
      lowColors: { maxColors: 16 },
      mediumColors: { maxColors: 64 },
      highColors: { maxColors: 128 },
      maxColors: { maxColors: 256 },
      withDither: { maxColors: 64, dither: 0.5 },
    },
  },

  // Invalid options for error testing
  invalid: {
    encoding: {
      negativeQuality: { quality: -10 },
      tooHighQuality: { quality: 150 },
      invalidType: { quality: 'high' as any },
    },
    resize: {
      negativeWidth: { width: -100, height: 100 },
      negativeHeight: { width: 100, height: -100 },
      zeroWidth: { width: 0, height: 100 },
      zeroHeight: { width: 100, height: 0 },
      tooLarge: { width: 50000, height: 50000 },
      invalidMethod: { width: 100, height: 100, method: 'invalid' as any },
    },
    rotate: {
      invalidAngle: { angle: 45 }, // Not a multiple of 90
      stringAngle: { angle: '90' as any },
    },
    quantize: {
      negativeColors: { maxColors: -1 },
      tooManyColors: { maxColors: 300 },
      zeroColors: { maxColors: 0 },
      invalidDither: { maxColors: 64, dither: -0.5 },
    },
  },
};

/**
 * Performance test scenarios
 */
export const PerformanceTestData = {
  // Batch processing scenarios
  smallBatch: Array.from({ length: 10 }, () =>
    createTestImageBuffer('webp', 100, 100),
  ),
  mediumBatch: Array.from({ length: 5 }, () =>
    createTestImageBuffer('webp', 500, 500),
  ),
  largeBatch: Array.from({ length: 2 }, () =>
    createTestImageBuffer('webp', 2000, 2000),
  ),

  // Memory stress test data
  memoryStress: {
    veryLarge: createTestImageBuffer('webp', 4000, 4000),
    multipleLarge: Array.from({ length: 3 }, () =>
      createTestImageBuffer('webp', 2000, 2000),
    ),
  },

  // Concurrent processing scenarios
  concurrent: {
    sameFormat: Array.from({ length: 8 }, () =>
      createTestImageBuffer('webp', 200, 200),
    ),
    mixedFormats: [
      createTestImageBuffer('webp', 200, 200),
      createTestImageBuffer('png', 200, 200),
      createTestImageBuffer('avif', 200, 200),
      createTestImageBuffer('jpeg-xl', 200, 200),
    ],
  },
};

/**
 * Cross-format conversion test matrix
 */
export const ConversionMatrix = {
  // All supported formats for conversion testing
  formats: [
    'webp',
    'avif',
    'jpeg-xl',
    'png',
    'jpeg',
    'qoi',
    'wp2',
  ] as ImageFormat[],

  // Get test data for format conversion
  getConversionPairs(): Array<{
    from: ImageFormat;
    to: ImageFormat;
    data: ArrayBuffer;
  }> {
    const pairs: Array<{
      from: ImageFormat;
      to: ImageFormat;
      data: ArrayBuffer;
    }> = [];

    for (const fromFormat of this.formats) {
      for (const toFormat of this.formats) {
        if (fromFormat !== toFormat) {
          pairs.push({
            from: fromFormat,
            to: toFormat,
            data: TestImages.small[fromFormat],
          });
        }
      }
    }

    return pairs;
  },
};

/**
 * Browser/Node.js environment test data
 */
export const EnvironmentTestData = {
  // Feature detection scenarios
  features: {
    webAssemblySupported: typeof WebAssembly !== 'undefined',
    workersSupported: typeof Worker !== 'undefined',
    nodeEnvironment: typeof process !== 'undefined' && process.versions?.node,
    browserEnvironment: typeof window !== 'undefined',
  },

  // Mock environment configurations
  mockEnvironments: {
    modernBrowser: {
      WebAssembly: true,
      Worker: true,
      OffscreenCanvas: true,
      ImageData: true,
    },
    legacyBrowser: {
      WebAssembly: false,
      Worker: false,
      OffscreenCanvas: false,
      ImageData: true,
    },
    nodeJs: {
      process: { versions: { node: '16.0.0' } },
      worker_threads: true,
      fs: true,
    },
  },
};
