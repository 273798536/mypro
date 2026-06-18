console.log('start');

import('./api/db/connection.js').then(m => {
  console.log('imported connection');
  const db = m.getDb();
  const c = db.prepare('SELECT COUNT(*) as c FROM conversations').get().c;
  console.log('conversations count:', c);
}).catch(e => {
  console.error('ERROR:', e);
});
