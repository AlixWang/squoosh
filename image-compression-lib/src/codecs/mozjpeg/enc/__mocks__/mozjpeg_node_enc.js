// Mock for MozJPEG Node encoder WASM module

export default function moduleFactory() {
  return Promise.resolve({
    encode(data, width, height, options) {
      // Return a mock JPEG buffer with valid signature
      const mockJpegBuffer = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, // JPEG signature
        0x00, 0x10, 0x4A, 0x46, // APP0 marker
        0x49, 0x46, 0x00, 0x01, // JFIF
        0x01, 0x01, 0x01, 0x00, // Version, units, density
        0x00, 0x48, 0x00, 0x48, // X/Y density
        0x00, 0x00, // Thumbnail dimensions
        0xFF, 0xD9 // End of image
      ]);
      return mockJpegBuffer;
    }
  });
}