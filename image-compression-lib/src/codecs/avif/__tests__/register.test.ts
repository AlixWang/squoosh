/**
 * AVIF codec registration tests
 */

import { CodecManager } from '../../codec-registry.js';
import { registerAVIFCodecs, createAVIFCodecManager, createAVIFEncoder, createAVIFDecoder } from '../register.js';
import { AVIFEncoder } from '../avif-encoder.js';
import { AVIFDecoder } from '../avif-decoder.js';

describe('AVIF Registration', () => {
  let codecManager: CodecManager;

  beforeEach(() => {
    codecManager = new CodecManager();
  });

  describe('registerAVIFCodecs', () => {
    it('should register AVIF encoder and decoder', () => {
      registerAVIFCodecs(codecManager);

      const encoder = codecManager.encoders.get('avif');
      const decoder = codecManager.decoders.get('avif');

      expect(encoder).toBeInstanceOf(AVIFEncoder);
      expect(decoder).toBeInstanceOf(AVIFDecoder);
    });

    it('should register codecs with correct format', () => {
      registerAVIFCodecs(codecManager);

      const encoder = codecManager.encoders.get('avif');
      const decoder = codecManager.decoders.get('avif');

      expect(encoder?.format).toBe('avif');
      expect(decoder?.format).toBe('avif');
    });

    it('should register codecs with correct MIME type', () => {
      registerAVIFCodecs(codecManager);

      const encoder = codecManager.encoders.get('avif');
      const decoder = codecManager.decoders.get('avif');

      expect(encoder?.mimeType).toBe('image/avif');
      expect(decoder?.mimeType).toBe('image/avif');
    });

    it('should register codecs with correct extension', () => {
      registerAVIFCodecs(codecManager);

      const encoder = codecManager.encoders.get('avif');
      const decoder = codecManager.decoders.get('avif');

      expect(encoder?.extension).toBe('.avif');
      expect(decoder?.extension).toBe('.avif');
    });
  });

  describe('createAVIFCodecManager', () => {
    it('should create codec manager with AVIF codecs registered', () => {
      const manager = createAVIFCodecManager();

      const encoder = manager.encoders.get('avif');
      const decoder = manager.decoders.get('avif');

      expect(encoder).toBeInstanceOf(AVIFEncoder);
      expect(decoder).toBeInstanceOf(AVIFDecoder);
    });
  });

  describe('createAVIFEncoder', () => {
    it('should create AVIF encoder instance', () => {
      const encoder = createAVIFEncoder();
      
      expect(encoder).toBeInstanceOf(AVIFEncoder);
      expect(encoder.format).toBe('avif');
    });

    it('should create independent instances', () => {
      const encoder1 = createAVIFEncoder();
      const encoder2 = createAVIFEncoder();
      
      expect(encoder1).not.toBe(encoder2);
      expect(encoder1).toBeInstanceOf(AVIFEncoder);
      expect(encoder2).toBeInstanceOf(AVIFEncoder);
    });
  });

  describe('createAVIFDecoder', () => {
    it('should create AVIF decoder instance', () => {
      const decoder = createAVIFDecoder();
      
      expect(decoder).toBeInstanceOf(AVIFDecoder);
      expect(decoder.format).toBe('avif');
    });

    it('should create independent instances', () => {
      const decoder1 = createAVIFDecoder();
      const decoder2 = createAVIFDecoder();
      
      expect(decoder1).not.toBe(decoder2);
      expect(decoder1).toBeInstanceOf(AVIFDecoder);
      expect(decoder2).toBeInstanceOf(AVIFDecoder);
    });
  });

  describe('integration', () => {
    it('should allow format detection after registration', () => {
      registerAVIFCodecs(codecManager);

      // Create a mock AVIF buffer
      const buffer = new ArrayBuffer(16);
      const view = new Uint8Array(buffer);
      
      // Set up ftyp box with avif brand
      view[4] = 0x66; // 'f'
      view[5] = 0x74; // 't'
      view[6] = 0x79; // 'y'
      view[7] = 0x70; // 'p'
      view[8] = 0x61; // 'a'
      view[9] = 0x76; // 'v'
      view[10] = 0x69; // 'i'
      view[11] = 0x66; // 'f'

      const detectedFormat = codecManager.detectFormat(buffer);
      expect(detectedFormat).toBe('avif');
    });

    it('should provide format info after registration', () => {
      registerAVIFCodecs(codecManager);

      const formatInfo = codecManager.getFormatInfo('avif');
      
      expect(formatInfo.format).toBe('avif');
      expect(formatInfo.mimeType).toBe('image/avif');
      expect(formatInfo.extension).toBe('.avif');
      expect(formatInfo.supportsLossless).toBe(true);
      expect(formatInfo.supportsTransparency).toBe(true);
    });
  });
});