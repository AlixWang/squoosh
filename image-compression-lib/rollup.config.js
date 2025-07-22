import browserConfig from './rollup.config.browser.js';
import nodeConfig from './rollup.config.node.js';

// Export all configurations for different build targets
export default [...browserConfig, ...nodeConfig];
