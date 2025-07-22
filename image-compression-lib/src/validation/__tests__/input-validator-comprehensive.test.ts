/**
 * Comprehensive tests for input validation
 */

import { InputValidator } from '../input-validator.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';
import {
  ImageFormat,
  EncodeOptions,
  ResizeOptions,
  QuantizeOptions,
} from '../../types/index.js';
import {
  createTestImageBuffer,
  createTestImageData,
} from '../../__tests__/test-utils.js';

describe('InputValidator Comprehensive Tests', () => {
  describe('Image Input Validation', () => {
    it('should accept valid ArrayBuffer', () => {
      const buffer = createTestImageBuffer('webp');
      expect(() => InputValidator.validateImageInput(buffer)).not.toThrow();
    });

    it('should accept valid Uint8Array', () => {
      const buffer = createTestImageBuffer('webp');
      const uint8Array = new Uint8Array(buffer);
      expect(() => InputValidator.validateImageInput(uint8Array)).not.toThrow();
    });

    it('should accept valid ImageData', () => {
      const imageData = createTestImageData();
      expect(() => InputValidator.validateImageInput(imageData)).not.toThrow();
    });

    it('should accept valid Blob', () => {
      const buffer = createTestImageBuffer('webp');
      const blob = new Blob([buffer], { type: 'image/webp' });
      expect(() => InputValidator.validateImageInput(blob)).not.toThrow();
    });

    it('should accept valid File', () => {
      const buffer = createTestImageBuffer('webp');
      const file = new File([buffer], 'test.webp', { type: 'image/webp' });
      expect(() => InputValidator.validateImageInput(file)).not.toThrow();
    });

    it('should reject null input', () => {
      expect(() => InputValidator.validateImageInput(null)).toThrow(
        ValidationError,
      );
    });

    it('should reject undefined input', () => {
      expect(() => InputValidator.validateImageInput(undefined)).toThrow(
        ValidationError,
      );
    });

    it('should reject string input', () => {
      expect(() => InputValidator.validateImageInput('not an image')).toThrow(
        ValidationError,
      );
    });

    it('should reject number input', () => {
      expect(() => InputValidator.validateImageInput(123)).toThrow(
        ValidationError,
      );
    });

    it('should reject boolean input', () => {
      expect(() => InputValidator.validateImageInput(true)).toThrow(
        ValidationError,
      );
    });

    it('should reject plain object input', () => {
      expect(() => InputValidator.validateImageInput({})).toThrow(
        ValidationError,
      );
    });

    it('should reject array input', () => {
      expect(() => InputValidator.validateImageInput([])).toThrow(
        ValidationError,
      );
    });
  });

  describe('Buffer Input Validation', () => {
    it('should accept non-empty ArrayBuffer', () => {
      const buffer = new ArrayBuffer(100);
      expect(() => InputValidator.validateBufferInput(buffer)).not.toThrow();
    });

    it('should accept non-empty Uint8Array', () => {
      const uint8Array = new Uint8Array(100);
      expect(() =>
        InputValidator.validateBufferInput(uint8Array),
      ).not.toThrow();
    });

    it('should reject empty ArrayBuffer', () => {
      const buffer = new ArrayBuffer(0);
      expect(() => InputValidator.validateBufferInput(buffer)).toThrow(
        ValidationError,
      );
    });

    it('should reject empty Uint8Array', () => {
      const uint8Array = new Uint8Array(0);
      expect(() => InputValidator.validateBufferInput(uint8Array)).toThrow(
        ValidationError,
      );
    });

    it('should reject very small buffers', () => {
      const tinyBuffer = new ArrayBuffer(4);
      expect(() => InputValidator.validateBufferInput(tinyBuffer)).toThrow(
        ValidationError,
      );
    });
  });

  describe('ImageData Validation', () => {
    it('should accept valid ImageData', () => {
      const imageData = createTestImageData(100, 100);
      expect(() => InputValidator.validateImageData(imageData)).not.toThrow();
    });

    it('should reject ImageData with zero width', () => {
      const imageData = new ImageData(new Uint8ClampedArray(0), 0, 1);
      expect(() => InputValidator.validateImageData(imageData)).toThrow(
        ValidationError,
      );
    });

    it('should reject ImageData with zero height', () => {
      const imageData = new ImageData(new Uint8ClampedArray(0), 1, 0);
      expect(() => InputValidator.validateImageData(imageData)).toThrow(
        ValidationError,
      );
    });

    it('should reject ImageData with negative width', () => {
      const invalidImageData = {
        data: new Uint8ClampedArray(400),
        width: -10,
        height: 10,
      } as ImageData;
      expect(() => InputValidator.validateImageData(invalidImageData)).toThrow(
        ValidationError,
      );
    });

    it('should reject ImageData with negative height', () => {
      const invalidImageData = {
        data: new Uint8ClampedArray(400),
        width: 10,
        height: -10,
      } as ImageData;
      expect(() => InputValidator.validateImageData(invalidImageData)).toThrow(
        ValidationError,
      );
    });

    it('should reject ImageData with mismatched data length', () => {
      const invalidImageData = {
        data: new Uint8ClampedArray(100), // Should be 10*10*4 = 400
        width: 10,
        height: 10,
      } as ImageData;
      expect(() => InputValidator.validateImageData(invalidImageData)).toThrow(
        ValidationError,
      );
    });

    it('should reject ImageData with null data', () => {
      const invalidImageData = {
        data: null,
        width: 10,
        height: 10,
      } as any;
      expect(() => InputValidator.validateImageData(invalidImageData)).toThrow(
        ValidationError,
      );
    });

    it('should reject non-ImageData objects', () => {
      const fakeImageData = {
        width: 10,
        height: 10,
        data: [1, 2, 3, 4],
      };
      expect(() =>
        InputValidator.validateImageData(fakeImageData as any),
      ).toThrow(ValidationError);
    });
  });

  describe('Format Validation', () => {
    it('should accept valid formats', () => {
      const validFormats: ImageFormat[] = [
        'webp',
        'png',
        'avif',
        'jpeg-xl',
        'jpeg',
        'qoi',
        'wp2',
      ];
      validFormats.forEach((format) => {
        expect(() => InputValidator.validateFormat(format)).not.toThrow();
      });
    });

    it('should reject invalid format strings', () => {
      const invalidFormats = ['gif', 'bmp', 'tiff', 'svg', 'unknown'];
      invalidFormats.forEach((format) => {
        expect(() =>
          InputValidator.validateFormat(format as ImageFormat),
        ).toThrow(ValidationError);
      });
    });

    it('should reject null format', () => {
      expect(() => InputValidator.validateFormat(null as any)).toThrow(
        ValidationError,
      );
    });

    it('should reject undefined format', () => {
      expect(() => InputValidator.validateFormat(undefined as any)).toThrow(
        ValidationError,
      );
    });

    it('should reject empty string format', () => {
      expect(() => InputValidator.validateFormat('' as ImageFormat)).toThrow(
        ValidationError,
      );
    });

    it('should reject non-string format', () => {
      expect(() => InputValidator.validateFormat(123 as any)).toThrow(
        ValidationError,
      );
    });
  });

  describe('Encode Options Validation', () => {
    it('should accept valid quality values', () => {
      const validQualities = [0, 25, 50, 75, 100];
      validQualities.forEach((quality) => {
        expect(() =>
          InputValidator.validateEncodeOptions({ quality }),
        ).not.toThrow();
      });
    });

    it('should accept options without quality', () => {
      expect(() => InputValidator.validateEncodeOptions({})).not.toThrow();
    });

    it('should accept null options', () => {
      expect(() => InputValidator.validateEncodeOptions(null)).not.toThrow();
    });

    it('should accept undefined options', () => {
      expect(() =>
        InputValidator.validateEncodeOptions(undefined),
      ).not.toThrow();
    });

    it('should reject negative quality', () => {
      expect(() =>
        InputValidator.validateEncodeOptions({ quality: -10 }),
      ).toThrow(ValidationError);
    });

    it('should reject quality over 100', () => {
      expect(() =>
        InputValidator.validateEncodeOptions({ quality: 150 }),
      ).toThrow(ValidationError);
    });

    it('should reject non-numeric quality', () => {
      expect(() =>
        InputValidator.validateEncodeOptions({ quality: 'high' as any }),
      ).toThrow(ValidationError);
    });

    it('should reject NaN quality', () => {
      expect(() =>
        InputValidator.validateEncodeOptions({ quality: NaN }),
      ).toThrow(ValidationError);
    });

    it('should reject Infinity quality', () => {
      expect(() =>
        InputValidator.validateEncodeOptions({ quality: Infinity }),
      ).toThrow(ValidationError);
    });

    it('should accept additional format-specific options', () => {
      const options = {
        quality: 80,
        lossless: true,
        effort: 6,
        customOption: 'value',
      };
      expect(() => InputValidator.validateEncodeOptions(options)).not.toThrow();
    });
  });

  describe('Resize Options Validation', () => {
    it('should accept valid resize options', () => {
      const options: ResizeOptions = { width: 100, height: 100 };
      expect(() => InputValidator.validateResizeOptions(options)).not.toThrow();
    });

    it('should accept resize options with method', () => {
      const options: ResizeOptions = {
        width: 100,
        height: 100,
        method: 'lanczos3',
      };
      expect(() => InputValidator.validateResizeOptions(options)).not.toThrow();
    });

    it('should accept all valid resize methods', () => {
      const methods = [
        'triangle',
        'catrom',
        'mitchell',
        'lanczos3',
        'hqx',
      ] as const;
      methods.forEach((method) => {
        const options: ResizeOptions = { width: 100, height: 100, method };
        expect(() =>
          InputValidator.validateResizeOptions(options),
        ).not.toThrow();
      });
    });

    it('should reject zero width', () => {
      const options = { width: 0, height: 100 };
      expect(() => InputValidator.validateResizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject zero height', () => {
      const options = { width: 100, height: 0 };
      expect(() => InputValidator.validateResizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject negative width', () => {
      const options = { width: -100, height: 100 };
      expect(() => InputValidator.validateResizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject negative height', () => {
      const options = { width: 100, height: -100 };
      expect(() => InputValidator.validateResizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject missing width', () => {
      const options = { height: 100 } as any;
      expect(() => InputValidator.validateResizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject missing height', () => {
      const options = { width: 100 } as any;
      expect(() => InputValidator.validateResizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject non-numeric dimensions', () => {
      const options = { width: '100' as any, height: 100 };
      expect(() => InputValidator.validateResizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject invalid resize method', () => {
      const options = { width: 100, height: 100, method: 'invalid' as any };
      expect(() => InputValidator.validateResizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject extremely large dimensions', () => {
      const options = { width: 100000, height: 100000 };
      expect(() => InputValidator.validateResizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject null options', () => {
      expect(() => InputValidator.validateResizeOptions(null as any)).toThrow(
        ValidationError,
      );
    });

    it('should reject undefined options', () => {
      expect(() =>
        InputValidator.validateResizeOptions(undefined as any),
      ).toThrow(ValidationError);
    });
  });

  describe('Quantize Options Validation', () => {
    it('should accept valid quantize options', () => {
      const options: QuantizeOptions = { maxColors: 64 };
      expect(() =>
        InputValidator.validateQuantizeOptions(options),
      ).not.toThrow();
    });

    it('should accept quantize options with dither', () => {
      const options: QuantizeOptions = { maxColors: 64, dither: 0.5 };
      expect(() =>
        InputValidator.validateQuantizeOptions(options),
      ).not.toThrow();
    });

    it('should accept minimum colors', () => {
      const options: QuantizeOptions = { maxColors: 2 };
      expect(() =>
        InputValidator.validateQuantizeOptions(options),
      ).not.toThrow();
    });

    it('should accept maximum colors', () => {
      const options: QuantizeOptions = { maxColors: 256 };
      expect(() =>
        InputValidator.validateQuantizeOptions(options),
      ).not.toThrow();
    });

    it('should reject zero colors', () => {
      const options = { maxColors: 0 };
      expect(() => InputValidator.validateQuantizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject negative colors', () => {
      const options = { maxColors: -10 };
      expect(() => InputValidator.validateQuantizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject too many colors', () => {
      const options = { maxColors: 300 };
      expect(() => InputValidator.validateQuantizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject missing maxColors', () => {
      const options = {} as any;
      expect(() => InputValidator.validateQuantizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject non-numeric maxColors', () => {
      const options = { maxColors: '64' as any };
      expect(() => InputValidator.validateQuantizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject negative dither', () => {
      const options = { maxColors: 64, dither: -0.5 };
      expect(() => InputValidator.validateQuantizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject dither over 1', () => {
      const options = { maxColors: 64, dither: 1.5 };
      expect(() => InputValidator.validateQuantizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject non-numeric dither', () => {
      const options = { maxColors: 64, dither: 'medium' as any };
      expect(() => InputValidator.validateQuantizeOptions(options)).toThrow(
        ValidationError,
      );
    });

    it('should reject null options', () => {
      expect(() => InputValidator.validateQuantizeOptions(null as any)).toThrow(
        ValidationError,
      );
    });

    it('should reject undefined options', () => {
      expect(() =>
        InputValidator.validateQuantizeOptions(undefined as any),
      ).toThrow(ValidationError);
    });
  });

  describe('Rotate Options Validation', () => {
    it('should accept valid rotation angles', () => {
      const validAngles = [0, 90, 180, 270, 360];
      validAngles.forEach((angle) => {
        expect(() =>
          InputValidator.validateRotateOptions({ angle }),
        ).not.toThrow();
      });
    });

    it('should reject invalid rotation angles', () => {
      const invalidAngles = [45, 135, 225, 315, 30, 60];
      invalidAngles.forEach((angle) => {
        expect(() => InputValidator.validateRotateOptions({ angle })).toThrow(
          ValidationError,
        );
      });
    });

    it('should reject negative angles', () => {
      expect(() =>
        InputValidator.validateRotateOptions({ angle: -90 }),
      ).toThrow(ValidationError);
    });

    it('should reject angles over 360', () => {
      expect(() =>
        InputValidator.validateRotateOptions({ angle: 450 }),
      ).toThrow(ValidationError);
    });

    it('should reject non-numeric angles', () => {
      expect(() =>
        InputValidator.validateRotateOptions({ angle: '90' as any }),
      ).toThrow(ValidationError);
    });

    it('should reject missing angle', () => {
      expect(() => InputValidator.validateRotateOptions({} as any)).toThrow(
        ValidationError,
      );
    });

    it('should reject null options', () => {
      expect(() => InputValidator.validateRotateOptions(null as any)).toThrow(
        ValidationError,
      );
    });

    it('should reject undefined options', () => {
      expect(() =>
        InputValidator.validateRotateOptions(undefined as any),
      ).toThrow(ValidationError);
    });
  });

  describe('Processing Operations Validation', () => {
    it('should accept valid resize operation', () => {
      const operations = [
        { type: 'resize' as const, options: { width: 100, height: 100 } },
      ];
      expect(() =>
        InputValidator.validateProcessingOperations(operations),
      ).not.toThrow();
    });

    it('should accept valid rotate operation', () => {
      const operations = [{ type: 'rotate' as const, options: { angle: 90 } }];
      expect(() =>
        InputValidator.validateProcessingOperations(operations),
      ).not.toThrow();
    });

    it('should accept valid quantize operation', () => {
      const operations = [
        { type: 'quantize' as const, options: { maxColors: 64 } },
      ];
      expect(() =>
        InputValidator.validateProcessingOperations(operations),
      ).not.toThrow();
    });

    it('should accept multiple operations', () => {
      const operations = [
        { type: 'resize' as const, options: { width: 100, height: 100 } },
        { type: 'rotate' as const, options: { angle: 90 } },
        { type: 'quantize' as const, options: { maxColors: 64 } },
      ];
      expect(() =>
        InputValidator.validateProcessingOperations(operations),
      ).not.toThrow();
    });

    it('should reject empty operations array', () => {
      expect(() => InputValidator.validateProcessingOperations([])).toThrow(
        ValidationError,
      );
    });

    it('should reject null operations', () => {
      expect(() =>
        InputValidator.validateProcessingOperations(null as any),
      ).toThrow(ValidationError);
    });

    it('should reject undefined operations', () => {
      expect(() =>
        InputValidator.validateProcessingOperations(undefined as any),
      ).toThrow(ValidationError);
    });

    it('should reject operations with invalid type', () => {
      const operations = [
        { type: 'invalid' as any, options: { width: 100, height: 100 } },
      ];
      expect(() =>
        InputValidator.validateProcessingOperations(operations),
      ).toThrow(ValidationError);
    });

    it('should reject operations with missing type', () => {
      const operations = [{ options: { width: 100, height: 100 } }] as any;
      expect(() =>
        InputValidator.validateProcessingOperations(operations),
      ).toThrow(ValidationError);
    });

    it('should reject operations with missing options', () => {
      const operations = [{ type: 'resize' as const }] as any;
      expect(() =>
        InputValidator.validateProcessingOperations(operations),
      ).toThrow(ValidationError);
    });

    it('should reject operations with invalid options', () => {
      const operations = [
        { type: 'resize' as const, options: { width: -100, height: 100 } },
      ];
      expect(() =>
        InputValidator.validateProcessingOperations(operations),
      ).toThrow(ValidationError);
    });
  });

  describe('Error Context', () => {
    it('should include context in validation errors', () => {
      try {
        InputValidator.validateImageInput(null, { operation: 'test' });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).context.operation).toBe('test');
      }
    });

    it('should include parameter information in range errors', () => {
      try {
        InputValidator.validateEncodeOptions({ quality: 150 });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe(
          ErrorCode.PARAMETER_OUT_OF_RANGE,
        );
        expect((error as ValidationError).context.parameter).toBe('quality');
        expect((error as ValidationError).context.value).toBe(150);
      }
    });

    it('should include type information in invalid input errors', () => {
      try {
        InputValidator.validateImageInput('not an image');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe(ErrorCode.INVALID_INPUT);
        expect((error as ValidationError).context.inputType).toBe('string');
      }
    });
  });

  describe('Edge Cases and Boundary Values', () => {
    it('should handle floating point precision issues', () => {
      const options = { quality: 0.1 + 0.2 }; // Should be 0.3 but might be 0.30000000000000004
      expect(() => InputValidator.validateEncodeOptions(options)).not.toThrow();
    });

    it('should handle very large valid values', () => {
      const options: ResizeOptions = { width: 32767, height: 32767 }; // Max reasonable size
      expect(() => InputValidator.validateResizeOptions(options)).not.toThrow();
    });

    it('should handle minimum valid values', () => {
      const options: ResizeOptions = { width: 1, height: 1 };
      expect(() => InputValidator.validateResizeOptions(options)).not.toThrow();
    });

    it('should handle special numeric values', () => {
      expect(() =>
        InputValidator.validateEncodeOptions({ quality: NaN }),
      ).toThrow(ValidationError);
      expect(() =>
        InputValidator.validateEncodeOptions({ quality: Infinity }),
      ).toThrow(ValidationError);
      expect(() =>
        InputValidator.validateEncodeOptions({ quality: -Infinity }),
      ).toThrow(ValidationError);
    });
  });
});
