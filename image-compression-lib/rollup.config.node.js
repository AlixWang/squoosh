import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// Node.js external dependencies (should not be bundled)
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  'fs',
  'path',
  'url',
  'util',
  'stream',
  'buffer',
  'crypto',
  'worker_threads',
  'os',
  'child_process',
];

// Function to check if a module should be external
const isExternal = (id) => {
  return external.some((ext) => id === ext || id.startsWith(ext + '/'));
};

// Common plugins for Node.js builds
const getNodePlugins = () => [
  nodeResolve({
    preferBuiltins: true,
    exportConditions: ['node'],
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.node.json',
    outDir: './dist/node',
    declaration: false,
    declarationMap: false,
  }),
];

// Node.js builds configuration
export default [
  // Node.js CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/node/index.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      interop: 'auto',
      inlineDynamicImports: true,
    },
    plugins: getNodePlugins(),
    external: isExternal,
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      unknownGlobalSideEffects: false,
    },
  },
];
