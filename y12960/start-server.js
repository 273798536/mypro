import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('ts-node/esm', pathToFileURL('./'));

import('./api/server.ts').catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
