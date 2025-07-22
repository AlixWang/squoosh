/**
 * Test utilities for image comparison and validation
 * @jest-environment node
 */

import { ImageFormat } from '../types/index.js';

/**
 * Creates a test image buffer with the specified format signature
 */
export function createTestImageBuffer(
  format: ImageFormat,
  width = 100,
  height = 100,
): ArrayBuffer {
  const signatures: Record<ImageFormat, number[]> = {
    webp: [
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ],
    avif: [
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
    ],
    'jpeg-xl': [0xff, 0x0a], // JXL signature
    png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    jpeg: [0xff, 0xd8, 0xff],
    qoi: [0x71, 0x6f, 0x69, 0x66], // "qoif"
    wp2: [
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x50, 0x32, 0x20,
    ],
  };

  const signature = signatures[format];
  if (!signature) {
    throw new Error(`Unknown format: ${format}`);
  }

  // Create buffer with signature + minimal header data
  const buffer = new ArrayBuffer(Math.max(signature.length, 32));
  const view = new Uint8Array(buffer);

  // Set format signature
  view.set(signature);

  // Add width/height for formats that need it (simplified)
  if (format === 'png') {
    // PNG IHDR chunk with width/height
    view.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8); // IHDR chunk
    view.set(
      [
        (width >> 24) & 0xff,
        (width >> 16) & 0xff,
        (width >> 8) & 0xff,
        width & 0xff,
      ],
      16,
    ); // width
    view.set(
      [
        (height >> 24) & 0xff,
        (height >> 16) & 0xff,
        (height >> 8) & 0xff,
        height & 0xff,
      ],
      20,
    ); // height
  }

  return buffer;
}

/**
 * Creates test ImageData with specified dimensions and optional pattern
 */
export function createTestImageData(
  width = 100,
  height = 100,
  pattern?: 'solid' | 'gradient' | 'checkerboard',
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;

      switch (pattern) {
        case 'solid':
          data[index] = 255; // R
          data[index + 1] = 0; // G
          data[index + 2] = 0; // B
          data[index + 3] = 255; // A
          break;
        case 'gradient':
          data[index] = (x / width) * 255; // R
          data[index + 1] = (y / height) * 255; // G
          data[index + 2] = 128; // B
          data[index + 3] = 255; // A
          break;
        case 'checkerboard':
          const isBlack = (Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0;
          const color = isBlack ? 0 : 255;
          data[index] = color; // R
          data[index + 1] = color; // G
          data[index + 2] = color; // B
          data[index + 3] = 255; // A
          break;
        default:
          // Random pattern
          data[index] = Math.floor(Math.random() * 256); // R
          data[index + 1] = Math.floor(Math.random() * 256); // G
          data[index + 2] = Math.floor(Math.random() * 256); // B
          data[index + 3] = 255; // A
      }
    }
  }

  return new ImageData(data, width, height);
}

/**
 * Compares two ImageData objects for similarity
 */
export function compareImageData(
  imageData1: ImageData,
  imageData2: ImageData,
  tolerance = 0,
): { similar: boolean; difference: number; maxDifference: number } {
  if (
    imageData1.width !== imageData2.width ||
    imageData1.height !== imageData2.height
  ) {
    return { similar: false, difference: Infinity, maxDifference: Infinity };
  }

  let totalDifference = 0;
  let maxDifference = 0;
  const pixelCount = imageData1.width * imageData1.height;

  for (let i = 0; i < imageData1.data.length; i += 4) {
    const r1 = imageData1.data[i] ?? 0;
    const g1 = imageData1.data[i + 1] ?? 0;
    const b1 = imageData1.data[i + 2] ?? 0;
    const a1 = imageData1.data[i + 3] ?? 0;

    const r2 = imageData2.data[i] ?? 0;
    const g2 = imageData2.data[i + 1] ?? 0;
    const b2 = imageData2.data[i + 2] ?? 0;
    const a2 = imageData2.data[i + 3] ?? 0;

    const pixelDifference = Math.sqrt(
      Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2) +
        Math.pow(a1 - a2, 2),
    );

    totalDifference += pixelDifference;
    maxDifference = Math.max(maxDifference, pixelDifference);
  }

  const averageDifference = totalDifference / pixelCount;
  const similar = averageDifference <= tolerance;

  return {
    similar,
    difference: averageDifference,
    maxDifference,
  };
}

/**
 * Validates that a buffer has the correct format signature
 */
export function validateFormatSignature(
  buffer: ArrayBuffer,
  expectedFormat: ImageFormat,
): boolean {
  const signatures: Record<ImageFormat, number[]> = {
    webp: [
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ],
    avif: [
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
    ],
    'jpeg-xl': [0xff, 0x0a],
    png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    jpeg: [0xff, 0xd8, 0xff],
    qoi: [0x71, 0x6f, 0x69, 0x66],
    wp2: [
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x50, 0x32, 0x20,
    ],
  };

  const expectedSignature = signatures[expectedFormat];
  if (!expectedSignature) {
    return false;
  }

  const view = new Uint8Array(buffer);
  if (view.length < expectedSignature.length) {
    return false;
  }

  for (let i = 0; i < expectedSignature.length; i++) {
    if (view[i] !== expectedSignature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Creates a mock Blob with proper arrayBuffer method
 */
export function createMockBlob(buffer: ArrayBuffer, type = 'image/webp'): Blob {
  const blob = new Blob([buffer], { type });
  // Override arrayBuffer method for testing
  blob.arrayBuffer = jest.fn().mockResolvedValue(buffer);
  return blob;
}

/**
 * Creates a mock File with proper arrayBuffer method
 */
export function createMockFile(
  buffer: ArrayBuffer,
  name = 'test.webp',
  type = 'image/webp',
): File {
  const file = new File([buffer], name, { type });
  // Override arrayBuffer method for testing
  file.arrayBuffer = jest.fn().mockResolvedValue(buffer);
  return file;
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  static async measureExecutionTime<T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await operation();
    const end = performance.now();
    return { result, duration: end - start };
  }

  static async measureMemoryUsage<T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; memoryDelta: number }> {
    // Force garbage collection if available (Node.js)
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage?.()?.heapUsed || 0;
    const result = await operation();
    const finalMemory = process.memoryUsage?.()?.heapUsed || 0;

    return {
      result,
      memoryDelta: finalMemory - initialMemory,
    };
  }

  static createLargeImageData(width = 2000, height = 2000): ImageData {
    return createTestImageData(width, height, 'gradient');
  }
}

/**
 * Error testing utilities
 */
export class ErrorTestUtils {
  static createCorruptedBuffer(format: ImageFormat): ArrayBuffer {
    const buffer = createTestImageBuffer(format);
    const view = new Uint8Array(buffer);
    // Corrupt the buffer by changing some bytes
    for (
      let i = Math.floor(buffer.byteLength / 2);
      i < buffer.byteLength;
      i++
    ) {
      view[i] = Math.floor(Math.random() * 256);
    }
    return buffer;
  }

  static createTruncatedBuffer(
    format: ImageFormat,
    truncateAt = 0.5,
  ): ArrayBuffer {
    const fullBuffer = createTestImageBuffer(format);
    const truncatedLength = Math.floor(fullBuffer.byteLength * truncateAt);
    return fullBuffer.slice(0, truncatedLength);
  }

  static createInvalidImageData(): ImageData {
    // Create ImageData with invalid dimensions
    return new ImageData(new Uint8ClampedArray(0), 0, 0);
  }
}

/**
 * Mock factory for creating consistent test mocks
 */
export class MockFactory {
  static createMockEncoder(format: ImageFormat, shouldFail = false) {
    return {
      format,
      mimeType: `image/${format}`,
      extension: `.${format}`,
      isSupported: jest.fn().mockResolvedValue(!shouldFail),
      encode: jest
        .fn()
        .mockImplementation(async (imageData: ImageData, options?: any) => {
          if (shouldFail) {
            throw new Error(`Encoding failed for ${format}`);
          }
          return createTestImageBuffer(
            format,
            imageData.width,
            imageData.height,
          );
        }),
      getDefaultOptions: jest.fn().mockReturnValue({ quality: 80 }),
      validateOptions: jest.fn().mockReturnValue(true),
    };
  }

  static createMockDecoder(format: ImageFormat, shouldFail = false) {
    return {
      format,
      mimeType: `image/${format}`,
      extension: `.${format}`,
      isSupported: jest.fn().mockResolvedValue(!shouldFail),
      decode: jest.fn().mockImplementation(async (buffer: ArrayBuffer) => {
        if (shouldFail) {
          throw new Error(`Decoding failed for ${format}`);
        }
        return createTestImageData(100, 100);
      }),
      canDecode: jest.fn().mockImplementation((buffer: ArrayBuffer) => {
        return validateFormatSignature(buffer, format);
      }),
    };
  }

  static createMockProcessor(name: string, shouldFail = false) {
    return {
      name,
      process: jest
        .fn()
        .mockImplementation(async (imageData: ImageData, options?: any) => {
          if (shouldFail) {
            throw new Error(`Processing failed for ${name}`);
          }
          // Return modified ImageData based on processor type
          switch (name) {
            case 'resize':
              return createTestImageData(
                options?.width || 50,
                options?.height || 50,
              );
            case 'rotate':
              return createTestImageData(imageData.height, imageData.width); // Swap dimensions for rotation
            case 'quantize':
              return createTestImageData(
                imageData.width,
                imageData.height,
                'solid',
              );
            default:
              return imageData;
          }
        }),
      validateOptions: jest.fn().mockReturnValue(true),
    };
  }
}
