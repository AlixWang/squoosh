import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

// Common configuration
const commonConfig = {
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? 'source-map' : 'eval-source-map',
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.json',
              transpileOnly: true,
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    usedExports: true,
    sideEffects: false,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        codecs: {
          name: 'codecs',
          test: /[\\/]src[\\/]codecs[\\/]/,
          chunks: 'all',
          priority: 20,
        },
        processors: {
          name: 'processors',
          test: /[\\/]src[\\/]processors[\\/]/,
          chunks: 'all',
          priority: 20,
        },
        workers: {
          name: 'workers',
          test: /[\\/]src[\\/]workers[\\/]/,
          chunks: 'all',
          priority: 20,
        },
        vendor: {
          name: 'vendor',
          test: /[\\/]node_modules[\\/]/,
          chunks: 'all',
          priority: 10,
        },
      },
    },
  },
};

// Browser configuration
const browserConfig = {
  ...commonConfig,
  entry: './src/index.ts',
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'dist/webpack/browser'),
    filename: isProduction ? '[name].[contenthash].min.js' : '[name].js',
    chunkFilename: isProduction
      ? '[name].[contenthash].chunk.js'
      : '[name].chunk.js',
    library: {
      name: 'ImageCompressionLib',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
    clean: true,
  },
  resolve: {
    ...commonConfig.resolve,
    fallback: {
      buffer: false,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
    },
  },
};

// Node.js configuration
const nodeConfig = {
  ...commonConfig,
  entry: './src/index.ts',
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist/webpack/node'),
    filename: 'index.js',
    library: {
      type: 'commonjs2',
    },
    clean: true,
  },
  externals: {
    // Don't bundle Node.js built-ins
    fs: 'fs',
    path: 'path',
    url: 'url',
    util: 'util',
    stream: 'stream',
    buffer: 'buffer',
    crypto: 'crypto',
    worker_threads: 'worker_threads',
    os: 'os',
    child_process: 'child_process',
  },
  optimization: {
    ...commonConfig.optimization,
    splitChunks: false, // Don't split chunks for Node.js
  },
};

export default [browserConfig, nodeConfig];
