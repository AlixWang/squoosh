# Examples for @squoosh/image-compression-lib

This directory contains usage examples for the image compression library.

## Files

- `basic-usage.js` - Node.js example showing basic image compression and conversion
- `browser-usage.html` - Browser example with interactive file upload and compression
- `package.json` - Dependencies for running the examples

## Running the Examples

### Node.js Example

1. Install dependencies:
```bash
npm install
```

2. Add a sample image named `input.png` to this directory

3. Run the example:
```bash
npm run basic
```

This will create compressed versions of your input image in various formats.

### Browser Example

1. Build the library first (from the parent directory):
```bash
cd ..
npm run build
cd examples
```

2. Start a local server:
```bash
npm run serve
```

3. Open `browser-usage.html` in your browser

4. Upload an image and try the different compression options

## What the Examples Demonstrate

- **Basic Usage**: Simple format conversion and compression
- **Advanced Pipeline**: Chaining multiple operations (resize, rotate, compress)
- **Error Handling**: Proper error handling for compression operations
- **Multiple Formats**: WebP, AVIF, JPEG XL, PNG, and MozJPEG support
- **Browser Integration**: File upload and download functionality
- **Performance**: Optimized compression settings for different use cases

## Supported Image Formats

- **Input**: PNG, JPEG, WebP, AVIF, JPEG XL, QOI, WebP2
- **Output**: WebP, AVIF, JPEG XL, PNG, MozJPEG

## Tips

- For web use, WebP and AVIF provide the best compression ratios
- JPEG XL offers excellent quality but has limited browser support
- Use the pipeline API for complex operations like resize + rotate + compress
- Enable workers for better performance on large images