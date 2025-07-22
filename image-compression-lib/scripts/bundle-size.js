#!/usr/bin/env node

import { readFileSync, statSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { gzipSizeSync } from 'gzip-size';

const DIST_DIR = 'dist';
const SIZE_LIMIT_KB = {
  'browser/index.min.js': 250, // 250KB limit for minified browser bundle
  'browser/index.js': 500, // 500KB limit for development browser bundle
  'node/index.js': 500, // 500KB limit for Node.js bundle
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatKB(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

async function analyzeBundleSize() {
  console.log('📦 Bundle Size Analysis\n');
  console.log(
    'File'.padEnd(30) + 'Size'.padEnd(12) + 'Gzipped'.padEnd(12) + 'Status',
  );
  console.log('─'.repeat(60));

  let hasErrors = false;

  function analyzeDirectory(dir, prefix = '') {
    try {
      const items = readdirSync(dir);

      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          analyzeDirectory(fullPath, prefix + item + '/');
        } else if (extname(item) === '.js' && !item.includes('.map')) {
          const relativePath = (prefix + item).replace('dist/', '');
          const content = readFileSync(fullPath);
          const size = content.length;
          const gzipped = gzipSizeSync(content);

          const sizeStr = formatKB(size);
          const gzippedStr = formatKB(gzipped);

          // Check size limits
          const limit = SIZE_LIMIT_KB[relativePath];
          let status = '✅';

          if (limit && size / 1024 > limit) {
            status = `❌ (>${limit}KB)`;
            hasErrors = true;
          }

          console.log(
            relativePath.padEnd(30) +
              sizeStr.padEnd(12) +
              gzippedStr.padEnd(12) +
              status,
          );
        }
      }
    } catch (error) {
      console.error(`Error analyzing ${dir}:`, error.message);
    }
  }

  try {
    analyzeDirectory(DIST_DIR);
  } catch (error) {
    console.error(
      'Error: dist directory not found. Run "npm run build" first.',
    );
    process.exit(1);
  }

  console.log('\n📊 Summary:');
  console.log('- Sizes shown are uncompressed / gzipped');
  console.log('- Limits are enforced for key bundles');

  if (hasErrors) {
    console.log('\n❌ Some bundles exceed size limits!');
    process.exit(1);
  } else {
    console.log('\n✅ All bundles are within size limits');
  }
}

analyzeBundleSize().catch(console.error);
