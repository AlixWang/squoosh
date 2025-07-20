// Mock for PNG WASM module

export function encode(data, width, height) {
  // Return a mock PNG buffer with valid signature
  const mockPngBuffer = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR chunk type
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND chunk type
    0xAE, 0x42, 0x60, 0x82  // IEND CRC
  ]);
  return mockPngBuffer;
}

export function decode(data) {
  // Return mock ImageData
  const mockData = new Uint8ClampedArray([255, 0, 0, 255]); // Red pixel
  return new ImageData(mockData, 1, 1);
}

export default async function init() {
  return {
    encode,
    decode,
  };
}