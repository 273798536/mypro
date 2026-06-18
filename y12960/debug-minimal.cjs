console.log('=== Minimal Debug Test ===');

// Simulate what esbuild does - try require each module in the order they appear
process.on('exit', (code) => {
  console.log('EXIT with code:', code);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED:', reason);
});

try {
  console.log('Loading app.ts equivalent (dist/server.cjs)...');
  
  // First, let's just read the first few lines of dist/server.cjs
  const fs = require('fs');
  const content = fs.readFileSync('./dist/server.cjs', 'utf8');
  console.log('File size:', content.length, 'bytes');
  
  // Now actually try to require the bundled file
  console.log('Actually requiring dist/server.cjs...');
  require('./dist/server.cjs');
  console.log('Require succeeded!');
  
} catch (error) {
  console.error('ERROR requiring:', error.message);
  console.error(error.stack);
  process.exit(1);
}
