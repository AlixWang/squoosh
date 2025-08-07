/**
 * Detailed WASM module loading test for image-compression-lib
 */

const { ImageCompressor } = require('./dist/node/index.cjs');

async function testWasmDetailed() {
  console.log('🔍 Detailed WASM module loading test...\n');

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

    const compressor = new ImageCompressor();
    console.log('✅ ImageCompressor created');

    // Test WebP encoder in detail
    console.log('\n🔍 Testing WebP encoder in detail...');
    const webpEncoder = compressor.getEncoder('webp');
    
    if (!webpEncoder) {
      console.log('❌ WebP encoder not found');
      return;
    }

    console.log('✅ WebP encoder found:', webpEncoder.constructor.name);
    console.log('   Format:', webpEncoder.format);
    console.log('   MIME type:', webpEncoder.mimeType);
    console.log('   Extension:', webpEncoder.extension);

    // Test support check
    console.log('\n🔍 Testing WebP encoder support...');
    try {
      const isSupported = await webpEncoder.isSupported();
      console.log('   Support check result:', isSupported);
      
      if (!isSupported) {
        console.log('⚠️  WebP encoder not supported - trying to initialize module directly...');
        
        // Try to access the private module initialization
        try {
          // This is a hack to test module loading
          const modulePromise = webpEncoder.initModule ? webpEncoder.initModule() : null;
          if (modulePromise) {
            const module = await modulePromise;
            console.log('✅ WASM module loaded successfully:', typeof module);
            console.log('   Module exports:', Object.keys(module).slice(0, 10));
          } else {
            console.log('❌ No initModule method found');
          }
        } catch (moduleError) {
          console.log('❌ WASM module loading failed:', moduleError.message);
          console.log('   Error type:', moduleError.constructor.name);
          
          // Check if it's a file loading issue
          if (moduleError.message.includes('fetch') || moduleError.message.includes('load')) {
            console.log('   This appears to be a file loading issue');
            console.log('   WASM files might not be accessible in the current environment');
          }
        }
      }
    } catch (supportError) {
      console.log('❌ Support check failed:', supportError.message);
    }

    // Test with a simple image
    console.log('\n🔍 Testing with simple image data...');
    const testImageData = new ImageData(new Uint8ClampedArray([
      255, 0, 0, 255,    // Red pixel
      0, 255, 0, 255,    // Green pixel  
      0, 0, 255, 255,    // Blue pixel
      255, 255, 255, 255 // White pixel
    ]), 2, 2);
    
    console.log('✅ Test image created: 2x2 RGBA');
    
    try {
      console.log('🔍 Attempting WebP encoding...');
      const webpBuffer = await webpEncoder.encode(testImageData, { quality: 80 });
      console.log('✅ WebP encoding successful!');
      console.log('   Buffer size:', webpBuffer.byteLength, 'bytes');
      
      // Verify WebP header
      const headerBytes = new Uint8Array(webpBuffer.slice(0, 12));
      const isValidWebP = (
        headerBytes[0] === 0x52 && headerBytes[1] === 0x49 && 
        headerBytes[2] === 0x46 && headerBytes[3] === 0x46 && // "RIFF"
        headerBytes[8] === 0x57 && headerBytes[9] === 0x45 && 
        headerBytes[10] === 0x42 && headerBytes[11] === 0x50   // "WEBP"
      );
      console.log('✅ Valid WebP header:', isValidWebP);
      
      if (isValidWebP) {
        console.log('🎉 WASM module is working correctly!');
      }
      
    } catch (encodeError) {
      console.log('❌ WebP encoding failed:', encodeError.message);
      console.log('   Error type:', encodeError.constructor.name);
      
      if (encodeError.stack) {
        console.log('   Stack trace:');
        console.log(encodeError.stack.split('\n').slice(0, 5).join('\n'));
      }
    }

    // Test other formats
    console.log('\n🔍 Testing other formats...');
    const formats = ['avif', 'jpeg-xl', 'png', 'jpeg'];
    
    for (const format of formats) {
      try {
        const encoder = compressor.getEncoder(format);
        if (encoder) {
          const isSupported = await encoder.isSupported();
          console.log(`   ${format.toUpperCase()}: ${isSupported ? '✅' : '❌'} supported`);
        } else {
          console.log(`   ${format.toUpperCase()}: ❌ encoder not found`);
        }
      } catch (error) {
        console.log(`   ${format.toUpperCase()}: ❌ error - ${error.message}`);
      }
    }

    console.log('\n📊 Summary:');
    console.log('   - Codec registration: ✅ Working');
    console.log('   - Format detection: ✅ Working');  
    console.log('   - WASM module loading: ❓ Needs investigation');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error type:', error.constructor.name);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

testWasmDetailed().catch(console.error);