# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added

- Initial release of image-compression-lib
- Support for multiple image formats:
  - WebP (encode/decode)
  - AVIF (encode/decode)
  - JPEG XL (encode/decode)
  - PNG (encode/decode)
  - MozJPEG (encode/decode)
- Image processing operations:
  - Resize with multiple algorithms
  - Rotate (90°, 180°, 270°)
  - Quantize (color palette reduction)
- Cross-platform support (Node.js and Browser)
- TypeScript support with full type definitions
- Worker-based processing for performance
- Memory management and optimization
- Comprehensive error handling
- Pipeline API for chaining operations
- Format detection utilities
- Performance monitoring
- Lazy loading of codecs
- WASM module caching

### Features

- **Dual Package Support**: Works in both Node.js and browser environments
- **Tree Shaking**: Optimized for bundle size with tree-shaking support
- **TypeScript**: Full TypeScript support with comprehensive type definitions
- **Performance**: Worker-based processing and memory optimization
- **Extensible**: Plugin-based architecture for codecs and processors
- **Modern**: Built with modern JavaScript/TypeScript features

### Build System

- Rollup for optimized bundling
- Separate builds for Node.js, Browser (ES modules), and UMD
- TypeScript declaration files generation
- Bundle size analysis and optimization
- Development and production builds
- Source maps for debugging

### Documentation

- Comprehensive API documentation
- Usage examples for common scenarios
- TypeScript examples
- Migration guide from Squoosh
