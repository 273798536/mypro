const path = require('path');
const { pathToFileURL } = require('url');

process.env.NODE_ENV = 'development';

console.log('Starting server...');
console.log('CWD:', process.cwd());

async function start() {
  try {
    const { register } = await import('node:module');
    const { pathToFileURL } = await import('node:url');
    
    register('ts-node/esm', pathToFileURL('./'));
    
    const serverModule = await import(pathToFileURL(path.join(process.cwd(), 'api/server.ts')).href);
    console.log('Server module loaded');
  } catch (error) {
    console.error('Failed to start server:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

start();
