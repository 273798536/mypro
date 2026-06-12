const moduleAlias = require('module-alias');
const path = require('path');

const serverRoot = path.resolve(__dirname, '..');
moduleAlias.addAliases({
  '@shared': path.resolve(serverRoot, '../shared/dist')
});

require('./seed');

export {};
