import { InputValidator } from '../input-validator.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

describe('InputValidator', () => {
  describe('validateImageInput', () => {
    it('should accept valid ArrayBuffer', () => {
      const buffer = new ArrayBuffer(1024);
      expect(() => InputValidator.validateImageInput(buffer)).not.toThrow();
    });

    it('should accept valid Uint8Array', () => {
      const array = new Uint8Array(1024);
      expect(() => InputValidator.validateImageInput(array)).not.toThrow();
    });

    it('should accept valid ImageData', () => {
      const imageData = new ImageData(100, 100);
      expect(() => InputValidator.validateImageInput(imageData)).not.toThrow();
    });

    it('should reject null input', () => {
      expect(() => InputValidator.validateImageInput(null)).toThrow(ValidationError);
      expect(() => InputValidator.validateImageInput(null)).toThrow('Missing required parameter: input');
    });

    it('should reject undefined input', () => {
      expect(() => InputValidator.validateImageInput(undefined)).toThrow(ValidationError);
    });

    it('should reject invalid input types', () => {
      expect(() => InputValidator.validateImageInput('string')).toThrow(ValidationError);
      expect(() => InputValidator.validateImageInput(123)).toThrow(ValidationError);
      expect(() => InputValidator.validateImageInput({})).toThrow(ValidationError);
    });

    it('should reject empty buffer', () => {
      const emptyBuffer = new ArrayBuffer(0);
      expect(() => InputValidator.validateImageInput(emptyBuffer)).toThrow(ValidationError);
    });

    it('should reject oversized buffer', () => {
      // Mock a large buffer (we can't actually create 100MB+ buffer in test)
      const largeArray = { byteLength: 101 * 1024 * 1024 };
      expect(() => InputValidator.validateImageInput(largeArray as any)).toThrow(ValidationError);
    });

    it('should reject invalid ImageData', () => {
      const invalidImageData = { width: 0, height: 100, data: new Uint8ClampedArray(0) };
      expect(() => InputValidator.validateImageInput(invalidImageData as any)).toThrow(ValidationError);
    });
  });

  describe('validateImageFormat', () => {
    it('should accept valid formats', () => {
      const validFormats = ['webp', 'avif', 'jpeg-xl', 'png', 'jpeg', 'qoi', 'wp2'];
      validFormats.forEach(format => {
        expect(() => InputValidator.validateImageFormat(format)).not.toThrow();
      });
    });

    it('should reject null format', () => {
      expect(() => InputValidator.validateImageFormat(null)).toThrow(ValidationError);
    });

    it('should reject non-string format', () => {
      expect(() => InputValidator.validateImageFormat(123)).toThrow(ValidationError);
    });

    it('should reject unsupported format', () => {
      expect(() => InputValidator.validateImageFormat('bmp')).toThrow(ValidationError);
      expect(() => InputValidator.validateImageFormat('tiff')).toThrow(ValidationError);
    });
  });

  describe('validateEncodeOptions', () => {
    it('should accept null/undefined options', () => {
      expect(() => InputValidator.validateEncodeOptions(null, 'webp')).not.toThrow();
      expect(() => InputValidator.validateEncodeOptions(undefined, 'webp')).not.toThrow();
    });

    it('should accept valid options object', () => {
      expect(() => InputValidator.validateEncodeOptions({ quality: 80 }, 'webp')).not.toThrow();
    });

    it('should reject non-object options', () => {
      expect(() => InputValidator.validateEncodeOptions('string', 'webp')).toThrow(ValidationError);
      expect(() => InputValidator.validateEncodeOptions(123, 'webp')).toThrow(ValidationError);
    });

    it('should validate quality parameter', () => {
      expect(() => InputValidator.validateEncodeOptions({ quality: 50 }, 'webp')).not.toThrow();
      expect(() => InputValidator.validateEncodeOptions({ quality: -1 }, 'webp')).toThrow(ValidationError);
      expect(() => InputValidator.validateEncodeOptions({ quality: 101 }, 'webp')).toThrow(ValidationError);
      expect(() => InputValidator.validateEncodeOptions({ quality: 'high' }, 'webp')).toThrow(ValidationError);
    });

    it('should validate WebP-specific options', () => {
      expect(() => InputValidator.validateEncodeOptions({ lossless: true }, 'webp')).not.toThrow();
      expect(() => InputValidator.validateEncodeOptions({ lossless: 'yes' }, 'webp')).toThrow(ValidationError);
      expect(() => InputValidator.validateEncodeOptions({ method: 4 }, 'webp')).not.toThrow();
      expect(() => InputValidator.validateEncodeOptions({ method: 7 }, 'webp')).toThrow(ValidationError);
    });

    it('should validate AVIF-specific options', () => {
      expect(() => InputValidator.validateEncodeOptions({ cqLevel: 30 }, 'avif')).not.toThrow();
      expect(() => InputValidator.validateEncodeOptions({ cqLevel: 64 }, 'avif')).toThrow(ValidationError);
      expect(() => InputValidator.validateEncodeOptions({ speed: 5 }, 'avif')).not.toThrow();
      expect(() => InputValidator.validateEncodeOptions({ speed: 11 }, 'avif')).toThrow(ValidationError);
    });
  });

  describe('validateResizeOptions', () => {
    it('should accept valid resize options', () => {
      const options = { width: 100, height: 200 };
      expect(() => InputValidator.validateResizeOptions(options)).not.toThrow();
    });

    it('should reject missing options', () => {
      expect(() => InputValidator.validateResizeOptions(null)).toThrow(ValidationError);
      expect(() => InputValidator.validateResizeOptions(undefined)).toThrow(ValidationError);
    });

    it('should reject non-object options', () => {
      expect(() => InputValidator.validateResizeOptions('string')).toThrow(ValidationError);
    });

    it('should require width and height', () => {
      expect(() => InputValidator.validateResizeOptions({})).toThrow(ValidationError);
      expect(() => InputValidator.validateResizeOptions({ width: 100 })).toThrow(ValidationError);
      expect(() => InputValidator.validateResizeOptions({ height: 100 })).toThrow(ValidationError);
    });

    it('should validate dimensions', () => {
      expect(() => InputValidator.validateResizeOptions({ width: 0, height: 100 })).toThrow(ValidationError);
      expect(() => InputValidator.validateResizeOptions({ width: 100, height: -1 })).toThrow(ValidationError);
      expect(() => InputValidator.validateResizeOptions({ width: 1.5, height: 100 })).toThrow(ValidationError);
      expect(() => InputValidator.validateResizeOptions({ width: 40000, height: 100 })).toThrow(ValidationError);
    });

    it('should validate resize method', () => {
      const validMethods = ['triangle', 'catrom', 'mitchell', 'lanczos3', 'hqx'];
      validMethods.forEach(method => {
        expect(() => InputValidator.validateResizeOptions({ width: 100, height: 100, method })).not.toThrow();
      });
      
      expect(() => InputValidator.validateResizeOptions({ 
        width: 100, 
        height: 100, 
        method: 'invalid' 
      })).toThrow(ValidationError);
    });

    it('should validate fit method', () => {
      expect(() => InputValidator.validateResizeOptions({ 
        width: 100, 
        height: 100, 
        fitMethod: 'stretch' 
      })).not.toThrow();
      
      expect(() => InputValidator.validateResizeOptions({ 
        width: 100, 
        height: 100, 
        fitMethod: 'invalid' 
      })).toThrow(ValidationError);
    });

    it('should validate boolean options', () => {
      expect(() => InputValidator.validateResizeOptions({ 
        width: 100, 
        height: 100, 
        premultiply: true 
      })).not.toThrow();
      
      expect(() => InputValidator.validateResizeOptions({ 
        width: 100, 
        height: 100, 
        premultiply: 'yes' 
      })).toThrow(ValidationError);
    });
  });

  describe('validateRotationAngle', () => {
    it('should accept valid angles', () => {
      [0, 90, 180, 270, 360, 450, -90, -180].forEach(angle => {
        expect(() => InputValidator.validateRotationAngle(angle)).not.toThrow();
      });
    });

    it('should reject null/undefined angle', () => {
      expect(() => InputValidator.validateRotationAngle(null)).toThrow(ValidationError);
      expect(() => InputValidator.validateRotationAngle(undefined)).toThrow(ValidationError);
    });

    it('should reject non-number angle', () => {
      expect(() => InputValidator.validateRotationAngle('90')).toThrow(ValidationError);
    });

    it('should reject non-finite angle', () => {
      expect(() => InputValidator.validateRotationAngle(Infinity)).toThrow(ValidationError);
      expect(() => InputValidator.validateRotationAngle(NaN)).toThrow(ValidationError);
    });

    it('should reject invalid angles', () => {
      [45, 30, 135, 225].forEach(angle => {
        expect(() => InputValidator.validateRotationAngle(angle)).toThrow(ValidationError);
      });
    });
  });

  describe('validateQuantizeOptions', () => {
    it('should accept valid quantize options', () => {
      expect(() => InputValidator.validateQuantizeOptions({ maxColors: 128 })).not.toThrow();
      expect(() => InputValidator.validateQuantizeOptions({ maxColors: 64, dither: 0.5 })).not.toThrow();
    });

    it('should reject missing options', () => {
      expect(() => InputValidator.validateQuantizeOptions(null)).toThrow(ValidationError);
      expect(() => InputValidator.validateQuantizeOptions(undefined)).toThrow(ValidationError);
    });

    it('should require maxColors', () => {
      expect(() => InputValidator.validateQuantizeOptions({})).toThrow(ValidationError);
    });

    it('should validate maxColors range', () => {
      expect(() => InputValidator.validateQuantizeOptions({ maxColors: 1 })).toThrow(ValidationError);
      expect(() => InputValidator.validateQuantizeOptions({ maxColors: 257 })).toThrow(ValidationError);
      expect(() => InputValidator.validateQuantizeOptions({ maxColors: 2.5 })).toThrow(ValidationError);
    });

    it('should validate dither range', () => {
      expect(() => InputValidator.validateQuantizeOptions({ maxColors: 64, dither: -0.1 })).toThrow(ValidationError);
      expect(() => InputValidator.validateQuantizeOptions({ maxColors: 64, dither: 1.1 })).toThrow(ValidationError);
      expect(() => InputValidator.validateQuantizeOptions({ maxColors: 64, dither: 'low' })).toThrow(ValidationError);
    });
  });

  describe('error context', () => {
    it('should include context in validation errors', () => {
      const context = { operation: 'test', format: 'webp' };
      
      try {
        InputValidator.validateImageInput(null, context);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).context.operation).toBe('test');
        expect((error as ValidationError).context.format).toBe('webp');
      }
    });

    it('should provide detailed error information', () => {
      try {
        InputValidator.validateEncodeOptions({ quality: 150 }, 'webp');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe(ErrorCode.PARAMETER_OUT_OF_RANGE);
        expect((error as ValidationError).context.parameter).toBe('quality');
        expect((error as ValidationError).context.value).toBe(150);
        expect((error as ValidationError).context.min).toBe(0);
        expect((error as ValidationError).context.max).toBe(100);
      }
    });
  });
});