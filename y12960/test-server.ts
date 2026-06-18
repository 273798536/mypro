console.log('Starting test...');

try {
  console.log('1. Testing imports...');
  import('./api/db/index.js').then(({ db, initDatabase }) => {
    console.log('2. db import OK');
    
    try {
      initDatabase();
      console.log('3. initDatabase OK');
      
      import('./api/app.js').then(({ default: app }) => {
        console.log('4. app import OK');
        
        const PORT = 3001;
        const server = app.listen(PORT, () => {
          console.log(`5. Server ready on port ${PORT}`);
        });
      }).catch(err => {
        console.error('4. app import FAILED:', err.message);
        console.error(err.stack);
      });
    } catch (err: any) {
      console.error('3. initDatabase FAILED:', err.message);
      console.error(err.stack);
    }
  }).catch(err => {
    console.error('2. db import FAILED:', err.message);
    console.error(err.stack);
  });
} catch (err: any) {
  console.error('Outer catch:', err.message);
  console.error(err.stack);
}
