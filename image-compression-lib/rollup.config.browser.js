import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// Common plugins configuration
const getPlugins = (isProduction = false, includeCopy = false) => [
  nodeResolve({
    browser: true,
    preferBuiltins: false,
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.browser.json',
    outDir: './dist/browser',
    declaration: false,
    declarationMap: false,
  }),
  // Copy WASM files and other assets with correct structure
  ...(includeCopy ? [
    copy({
      targets: [
        { src: 'src/codecs', dest: 'dist/browser', ignore: ['**/*.ts', '**/*.d.ts', '**/__tests__/**'] },
      ],
      copyOnce: true
    })
  ] : []),
  ...(isProduction
    ? [
        terser({
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
          },
          mangle: {
            properties: {
              regex: /^_/,
            },
          },
          format: {
            comments: false,
          },
        }),
      ]
    : []),
];

// Browser builds configuration
export default [
  // Browser ES Module (development)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/browser/index.js',
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: getPlugins(false, true),
    external: ['worker_threads', 'fs', 'path', 'crypto'],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      unknownGlobalSideEffects: false,
    },
  },
  // Browser ES Module (production/minified)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/browser/index.min.js',
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: getPlugins(true),
    external: ['worker_threads', 'fs', 'path', 'crypto'],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      unknownGlobalSideEffects: false,
    },
  },
  // Browser UMD (for legacy support)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/browser/index.umd.js',
      format: 'umd',
      name: 'ImageCompressionLib',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: getPlugins(false),
    external: ['worker_threads', 'fs', 'path', 'crypto'],
  },
  // Browser UMD (minified)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/browser/index.umd.min.js',
      format: 'umd',
      name: 'ImageCompressionLib',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: getPlugins(true),
    external: ['worker_threads', 'fs', 'path', 'crypto'],
  },
];
