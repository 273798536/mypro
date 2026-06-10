console.log('=== DEBUG START ===');

try {
  console.log('1. importing express...');
  import express from 'express';
  console.log('   express imported OK');
} catch (e) {
  console.error('   express import failed:', (e as Error).message);
}

try {
  console.log('2. importing database...');
  import { initDatabase, isDatabaseEmpty } from './api/db/database.js';
  console.log('   database imported OK');
  initDatabase();
  console.log('   initDatabase OK, empty:', isDatabaseEmpty());
} catch (e) {
  console.error('   database error:', (e as Error).message);
}

try {
  console.log('3. importing app...');
  import app from './api/app.js';
  console.log('   app imported OK');
  
  const PORT = 3001;
  const server = app.listen(PORT, () => {
    console.log(`4. Server listening on port ${PORT}`);
  });
  
  server.on('error', (err: Error) => {
    console.error('Server error:', err.message);
  });
  
} catch (e) {
  console.error('3. app error:', (e as Error).message);
  console.error((e as Error).stack);
}
