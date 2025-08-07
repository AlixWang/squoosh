# Publishing @squoosh/image-compression-lib

This document contains instructions for publishing the image compression library to npm.

## Prerequisites

1. **npm Account**: You need an npm account with publishing permissions
2. **Organization Access**: Access to the `@squoosh` organization on npm
3. **Node.js**: Version 16 or higher
4. **Dependencies**: All dependencies installed (`npm install`)

## Pre-Publishing Checklist

- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Package builds correctly (`npm pack --dry-run`)
- [ ] Version number is correct in `package.json`
- [ ] README is up to date
- [ ] CHANGELOG is updated
- [ ] Examples work correctly

## Publishing Steps

### 1. Login to npm

```bash
npm login
```

### 2. Verify Package Contents

```bash
npm pack --dry-run
```

This will show you exactly what files will be included in the published package.

### 3. Test the Package Locally

```bash
# Create a test package
npm pack

# In a test directory, install the local package
mkdir test-install && cd test-install
npm init -y
npm install ../squoosh-image-compression-lib-1.0.0.tgz

# Test the import
node -e "const { ImageCompressor } = require('@squoosh/image-compression-lib'); console.log('Import successful');"
```

### 4. Publish to npm

```bash
# For first-time publishing
npm publish --access public

# For updates
npm publish
```

### 5. Verify Publication

```bash
# Check if the package is available
npm view @squoosh/image-compression-lib

# Install from npm to verify
npm install @squoosh/image-compression-lib
```

## Version Management

This package uses semantic versioning:

- **Patch** (1.0.1): Bug fixes, no breaking changes
- **Minor** (1.1.0): New features, no breaking changes  
- **Major** (2.0.0): Breaking changes

Update version using:

```bash
npm version patch|minor|major
```

## Package Structure

The published package includes:

- `dist/browser/` - Browser builds (ES modules and UMD)
- `dist/node/` - Node.js builds (CommonJS)
- `dist/esm/` - ES modules for Node.js
- `dist/types/` - TypeScript type definitions
- `docs/` - Documentation
- `README.md` - Main documentation
- `LICENSE` - Apache 2.0 license
- `CHANGELOG.md` - Version history

## Build Targets

The package supports multiple environments:

- **Browser ES Module**: `dist/browser/index.js`
- **Browser UMD**: `dist/browser/index.umd.js`
- **Node.js CommonJS**: `dist/node/index.cjs`
- **Node.js ES Module**: `dist/esm/index.js`
- **TypeScript Types**: `dist/types/index.d.ts`

## Bundle Sizes

- Browser (minified): ~237KB
- Browser (gzipped): ~60KB (estimated)
- Node.js: ~507KB

## Post-Publishing

1. **Tag the Release**: Create a git tag for the version
2. **Update Documentation**: Ensure all docs reflect the new version
3. **Test Installation**: Verify the package installs correctly from npm
4. **Update Examples**: Make sure examples work with the published version

## Troubleshooting

### Publishing Errors

- **403 Forbidden**: Check npm login and organization permissions
- **Version Exists**: Increment version number
- **Package Size**: Large packages may need `--access public`

### Build Issues

- **TypeScript Errors**: Fix type issues before publishing
- **Missing Files**: Check `.npmignore` and `files` in `package.json`
- **Dependencies**: Ensure all dependencies are properly listed

## Support

For issues with publishing or the package:

1. Check the build output for errors
2. Verify all dependencies are installed
3. Test the package locally before publishing
4. Review npm documentation for organization packages

## License

This package is licensed under Apache 2.0. Ensure all code contributions comply with this license.