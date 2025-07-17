/**
 * Test setup file for Jest
 */

// Mock ImageData for Node.js environment
if (typeof ImageData === 'undefined') {
  global.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(
      data: Uint8ClampedArray | number,
      width?: number,
      height?: number,
    ) {
      if (typeof data === 'number') {
        this.width = data;
        this.height = width!;
        this.data = new Uint8ClampedArray(data * width! * 4);
      } else {
        this.data = data;
        this.width = width!;
        this.height = height!;
      }
    }
  } as any;
}

// Mock ArrayBuffer if needed
if (typeof ArrayBuffer === 'undefined') {
  global.ArrayBuffer = ArrayBuffer;
}

// Mock Uint8Array if needed
if (typeof Uint8Array === 'undefined') {
  global.Uint8Array = Uint8Array;
}

// Mock Uint8ClampedArray if needed
if (typeof Uint8ClampedArray === 'undefined') {
  global.Uint8ClampedArray = Uint8ClampedArray;
}
