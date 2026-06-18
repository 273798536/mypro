const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('Testing better-sqlite3...');

try {
  const dbPath = path.join(process.cwd(), 'data', 'app.db');
  const dataDir = path.dirname(dbPath);
  
  console.log('DB Path:', dbPath);
  console.log('Data dir exists:', fs.existsSync(dataDir));
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data dir');
  }
  
  const db = new Database(dbPath);
  console.log('Database opened successfully');
  
  db.pragma('journal_mode = WAL');
  console.log('WAL mode set');
  
  db.exec('CREATE TABLE IF NOT EXISTS test (id TEXT PRIMARY KEY, name TEXT)');
  console.log('Test table created');
  
  const stmt = db.prepare('INSERT INTO test (id, name) VALUES (?, ?)');
  stmt.run('1', 'test');
  console.log('Inserted test data');
  
  const row = db.prepare('SELECT * FROM test WHERE id = ?').get('1');
  console.log('Query result:', row);
  
  db.close();
  console.log('Database test passed!');
} catch (error) {
  console.error('Database test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
