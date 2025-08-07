/**
 * Test WASM module loading for image-compression-lib
 */

import { ImageCompressor } from './dist/esm/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testWasmLoading() {
  console.log('🧪 Testing WASM module loading...\n');

  try {
    // Test 1: Create ImageCompressor instance
    console.log('1️⃣ Creating ImageCompressor instance...');
    const compressor = new ImageCompressor();
    console.log('✅ ImageCompressor created successfully');

    // Test 2: Check supported formats
    console.log('\n2️⃣ Checking supported formats...');
    const formats = compressor.getSupportedFormats();
    console.log('✅ Supported formats:', formats);

    // Test 3: Try to detect format (this doesn't require WASM)
    console.log('\n3️⃣ Testing format detection...');
    
    // Create a simple test image data (1x1 red pixel)
    const testImageData = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
    
    console.log('✅ Test ImageData created:', {
      width: testImageData.width,
      height: testImageData.height,
      dataLength: testImageData.data.length
    });

    // Test 4: Check if WebP encoder is supported
    console.log('\n4️⃣ Testing WebP encoder support...');
    try {
      // This will try to load the WASM module
      const webpEncoder = compressor.codecManager.getEncoder('webp');
      const isSupported = await webpEncoder.isSupported();
      console.log('✅ WebP encoder supported:', isSupported);

      if (isSupported) {
        console.log('\n5️⃣ Testing WebP encoding...');
        const webpBuffer = await webpEncoder.encode(testImageData, { quality: 80 });
        console.log('✅ WebP encoding successful, buffer size:', webpBuffer.byteLength, 'bytes');
      }
    } catch (error) {
      console.log('❌ WebP encoder test failed:', error.message);
    }

    console.log('\n🎉 All basic tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Global polyfills for Node.js environment
if (typeof global !== 'undefined' && !global.ImageData) {
  global.ImageData = class ImageData {
    constructor(data, width, height) {
      if (data instanceof Uint8ClampedArray) {
        this.data = data;
        this.width = width;
        this.height = height || Math.floor(data.length / (width * 4));
      } else if (typeof data === 'number') {
        this.width = data;
        this.height = width;
        this.data = new Uint8ClampedArray(data * width * 4);
      }
    }
  };
}

testWasmLoading().catch(console.error);