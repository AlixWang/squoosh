/**
 * Test WASM module loading for image-compression-lib (CommonJS version)
 */

const { ImageCompressor } = require('./dist/node/index.cjs');

async function testWasmLoading() {
  console.log('🧪 Testing WASM module loading (CommonJS)...\n');

  try {
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

    // Test 1: Create ImageCompressor instance
    console.log('1️⃣ Creating ImageCompressor instance...');
    const compressor = new ImageCompressor();
    console.log('✅ ImageCompressor created successfully');

    // Test 2: Check supported formats
    console.log('\n2️⃣ Checking supported formats...');
    const formats = compressor.getSupportedFormats();
    console.log('✅ Supported formats:', formats);

    // Test 3: Create test image data
    console.log('\n3️⃣ Creating test image data...');
    const testImageData = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
    console.log('✅ Test ImageData created:', {
      width: testImageData.width,
      height: testImageData.height,
      dataLength: testImageData.data.length
    });

    // Test 4: Test format detection
    console.log('\n4️⃣ Testing format detection...');
    
    // Create a minimal WebP header for testing
    const webpHeader = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x20, 0x00, 0x00, 0x00, // file size (32 bytes)
      0x57, 0x45, 0x42, 0x50, // "WEBP"
      0x56, 0x50, 0x38, 0x20, // "VP8 "
      0x10, 0x00, 0x00, 0x00, // chunk size
      // Minimal VP8 data
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    
    const detectedFormat = compressor.detectFormat(webpHeader);
    console.log('✅ Format detection result:', detectedFormat);

    // Test 5: Try direct codec access
    console.log('\n5️⃣ Testing direct codec access...');
    try {
      const codecManager = compressor.codecManager;
      console.log('✅ CodecManager accessible');
      
      const webpEncoder = codecManager.getEncoder('webp');
      console.log('✅ WebP encoder retrieved');
      
      console.log('\n6️⃣ Testing WebP encoder support...');
      const isSupported = await webpEncoder.isSupported();
      console.log('✅ WebP encoder support check:', isSupported);
      
      if (isSupported) {
        console.log('\n7️⃣ Testing actual WebP encoding...');
        const webpBuffer = await webpEncoder.encode(testImageData, { quality: 80 });
        console.log('✅ WebP encoding successful!');
        console.log('   Buffer size:', webpBuffer.byteLength, 'bytes');
        console.log('   Buffer type:', webpBuffer.constructor.name);
        
        // Check if it's a valid WebP file
        const headerBytes = new Uint8Array(webpBuffer.slice(0, 12));
        const isValidWebP = (
          headerBytes[0] === 0x52 && headerBytes[1] === 0x49 && 
          headerBytes[2] === 0x46 && headerBytes[3] === 0x46 && // "RIFF"
          headerBytes[8] === 0x57 && headerBytes[9] === 0x45 && 
          headerBytes[10] === 0x42 && headerBytes[11] === 0x50   // "WEBP"
        );
        console.log('✅ Valid WebP header:', isValidWebP);
      }
    } catch (error) {
      console.log('❌ Codec test failed:', error.message);
      console.log('   Error type:', error.constructor.name);
      if (error.stack) {
        console.log('   Stack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
      }
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error type:', error.constructor.name);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

testWasmLoading().catch(console.error);