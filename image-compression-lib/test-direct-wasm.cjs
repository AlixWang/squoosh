/**
 * Direct WASM module loading test
 */

const path = require('path');

async function testDirectWasm() {
  console.log('🔍 Direct WASM module loading test...\n');

  try {
    // Test 1: Check if WASM file exists
    const wasmPath = path.join(__dirname, 'dist/node/codecs/webp/enc/webp_enc.wasm');
    const jsPath = path.join(__dirname, 'dist/node/codecs/webp/enc/webp_enc.js');
    
    const fs = require('fs');
    
    console.log('1️⃣ Checking file existence...');
    console.log('   WASM file exists:', fs.existsSync(wasmPath));
    console.log('   JS file exists:', fs.existsSync(jsPath));
    
    if (fs.existsSync(wasmPath)) {
      const wasmSize = fs.statSync(wasmPath).size;
      console.log('   WASM file size:', wasmSize, 'bytes');
    }

    // Test 2: Try to load the JS module
    console.log('\n2️⃣ Testing JS module loading...');
    try {
      // First try requiring the JS file directly
      const moduleFactory = require(jsPath);
      console.log('✅ JS module loaded successfully');
      console.log('   Module type:', typeof moduleFactory);
      console.log('   Module properties:', Object.keys(moduleFactory).slice(0, 5));
      
      // Test 3: Try to initialize the WASM module
      console.log('\n3️⃣ Testing WASM module initialization...');
      
      if (typeof moduleFactory === 'function') {
        const module = await moduleFactory({
          noInitialRun: true,
        });
        console.log('✅ WASM module initialized successfully');
        console.log('   Module type:', typeof module);
        console.log('   Module properties:', Object.keys(module).slice(0, 10));
        
        // Test 4: Check if encode function exists
        if (module.encode) {
          console.log('✅ Encode function found');
          console.log('   Encode function type:', typeof module.encode);
        } else {
          console.log('❌ Encode function not found');
        }
        
      } else if (moduleFactory.default && typeof moduleFactory.default === 'function') {
        console.log('   Trying default export...');
        const module = await moduleFactory.default({
          noInitialRun: true,
        });
        console.log('✅ WASM module initialized via default export');
        console.log('   Module type:', typeof module);
        console.log('   Module properties:', Object.keys(module).slice(0, 10));
      } else {
        console.log('❌ Module factory is not a function');
      }
      
    } catch (jsError) {
      console.log('❌ JS module loading failed:', jsError.message);
      console.log('   Error type:', jsError.constructor.name);
      
      // Try alternative loading method
      console.log('\n   Trying dynamic import...');
      try {
        const moduleFactory = await import(jsPath);
        console.log('✅ Dynamic import successful');
        console.log('   Module type:', typeof moduleFactory);
        console.log('   Module exports:', Object.keys(moduleFactory));
        
        if (moduleFactory.default) {
          const module = await moduleFactory.default({
            noInitialRun: true,
          });
          console.log('✅ WASM module initialized via dynamic import');
        }
      } catch (importError) {
        console.log('❌ Dynamic import failed:', importError.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error type:', error.constructor.name);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testDirectWasm().catch(console.error);