const { register } = require('ts-node');
const path = require('path');

register({
  transpileOnly: true,
  esm: true,
  experimentalSpecifierResolution: 'node',
});

import('./api/server.ts').catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
