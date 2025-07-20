/**
 * Unit tests for WebP codec registration
 */

import { CodecManager } from '../../codec-registry.js';
import { registerWebPCodecs, createWebPCodecManager } from '../register.js';
import { WebPEncoder } from '../webp-encoder.js';
import { WebPDecoder } from '../webp-decoder.js';

describe('WebP codec registration', () => {
  describe('registerWebPCodecs', () => {
    it('should register WebP encoder and decoder', () => {
      const manager = new CodecManager();
      
      // Initially no codecs registered
      expect(manager.encoders.get('webp')).toBeUndefined();
      expect(manager.decoders.get('webp')).toBeUndefined();
      
      // Register WebP codecs
      registerWebPCodecs(manager);
      
      // Check that codecs are registered
      const encoder = manager.encoders.get('webp');
      const decoder = manager.decoders.get('webp');
      
      expect(encoder).toBeInstanceOf(WebPEncoder);
      expect(decoder).toBeInstanceOf(WebPDecoder);
      expect(encoder?.format).toBe('webp');
      expect(decoder?.format).toBe('webp');
    });

    it('should register codecs with correct properties', () => {
      const manager = new CodecManager();
      registerWebPCodecs(manager);
      
      const encoder = manager.encoders.get('webp');
      const decoder = manager.decoders.get('webp');
      
      expect(encoder?.mimeType).toBe('image/webp');
      expect(encoder?.extension).toBe('.webp');
      expect(decoder?.mimeType).toBe('image/webp');
      expect(decoder?.extension).toBe('.webp');
    });
  });

  describe('createWebPCodecManager', () => {
    it('should create a manager with WebP codecs pre-registered', () => {
      const manager = createWebPCodecManager();
      
      const encoder = manager.encoders.get('webp');
      const decoder = manager.decoders.get('webp');
      
      expect(encoder).toBeInstanceOf(WebPEncoder);
      expect(decoder).toBeInstanceOf(WebPDecoder);
    });

    it('should create a fresh manager instance each time', () => {
      const manager1 = createWebPCodecManager();
      const manager2 = createWebPCodecManager();
      
      expect(manager1).not.toBe(manager2);
      
      // Both should have WebP codecs
      expect(manager1.encoders.get('webp')).toBeInstanceOf(WebPEncoder);
      expect(manager2.encoders.get('webp')).toBeInstanceOf(WebPEncoder);
    });
  });
});