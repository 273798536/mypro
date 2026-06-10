console.log('[Server] Starting...');

import app from './app.js';
import { initDatabase, isDatabaseEmpty } from './db/database.js';
import { runSeed } from './db/seed.js';

console.log('[Server] Imports done');

const PORT = 3001;

try {
  initDatabase();
  if (isDatabaseEmpty()) {
    runSeed();
  }
} catch (error) {
  console.error('[DB] Initialization failed:', error);
}

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
