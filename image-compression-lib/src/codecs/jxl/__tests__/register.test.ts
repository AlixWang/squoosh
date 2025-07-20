/**
 * Tests for JPEG XL codec registration
 */

import { CodecManager } from '../../codec-registry.js';
import { 
  registerJXLCodecs, 
  createJXLCodecManager,
  createJXLEncoder,
  createJXLDecoder
} from '../register.js';
import { JXLEncoder } from '../jxl-encoder.js';
import { JXLDecoder } from '../jxl-decoder.js';

// Mock the WASM modules to prevent actual loading
jest.mock('../dec/jxl_dec.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../enc/jxl_enc.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('JPEG XL codec registration', () => {
  describe('registerJXLCodecs', () => {
    it('should register JXL encoder and decoder with codec manager', () => {
      const manager = new CodecManager();
      const registerSpy = jest.spyOn(manager, 'registerCodec');

      registerJXLCodecs(manager);

      expect(registerSpy).toHaveBeenCalledTimes(1);
      
      // Verify the registered codecs have the correct format
      const encoder = manager.encoders.get('jpeg-xl');
      const decoder = manager.decoders.get('jpeg-xl');
      
      expect(encoder).toBeDefined();
      expect(decoder).toBeDefined();
      expect(encoder?.format).toBe('jpeg-xl');
      expect(decoder?.format).toBe('jpeg-xl');
    });
  });

  describe('createJXLCodecManager', () => {
    it('should create codec manager with JXL codecs registered', () => {
      const manager = createJXLCodecManager();

      expect(manager).toBeInstanceOf(CodecManager);
      
      // Verify JXL codecs are registered
      const encoder = manager.encoders.get('jpeg-xl');
      const decoder = manager.decoders.get('jpeg-xl');
      
      expect(encoder).toBeDefined();
      expect(decoder).toBeDefined();
    });
  });

  describe('createJXLEncoder', () => {
    it('should create JXL encoder instance', () => {
      const encoder = createJXLEncoder();

      expect(encoder).toBeInstanceOf(JXLEncoder);
      expect(encoder.format).toBe('jpeg-xl');
      expect(encoder.mimeType).toBe('image/jxl');
      expect(encoder.extension).toBe('.jxl');
    });
  });

  describe('createJXLDecoder', () => {
    it('should create JXL decoder instance', () => {
      const decoder = createJXLDecoder();

      expect(decoder).toBeInstanceOf(JXLDecoder);
      expect(decoder.format).toBe('jpeg-xl');
      expect(decoder.mimeType).toBe('image/jxl');
      expect(decoder.extension).toBe('.jxl');
    });
  });
});