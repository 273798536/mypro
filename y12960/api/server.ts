/**
 * local server entry file, for local development
 */
console.log('=== Starting Server ===');
console.log('1. Loading app...');

import app from './app';

console.log('2. App loaded');
console.log('3. Initializing database...');

import { initDatabase } from './db/index';

console.log('4. Running initDatabase...');
initDatabase();

console.log('5. Database initialized');
console.log('6. Loading mockData...');

import initMockData from './mockData';

console.log('7. Running initMockData...');
initMockData();
console.log('8. MockData initialized');

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

console.log('9. Starting server on port', PORT);

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

/**
 * close server
 */
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

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
