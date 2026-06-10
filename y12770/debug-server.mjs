console.log('Step 1: start');

import('./api/app.js')
  .then((module) => {
    console.log('Step 2: app imported');
    const app = module.default;
    const PORT = 3001;
    const server = app.listen(PORT, () => {
      console.log(`Step 3: Server ready on port ${PORT}`);
    });
    server.on('error', (err: Error) => {
      console.error('Server error:', err);
    });
  })
  .catch((err) => {
    console.error('Import failed:', err.message);
    console.error(err.stack);
  });
