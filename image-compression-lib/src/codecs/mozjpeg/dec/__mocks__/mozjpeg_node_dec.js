// Mock for MozJPEG Node decoder WASM module

export default function moduleFactory() {
  return Promise.resolve({
    decode(buffer) {
      // Return mock ImageData
      const mockData = new Uint8ClampedArray([255, 0, 0, 255]); // Red pixel
      return new ImageData(mockData, 1, 1);
    }
  });
}