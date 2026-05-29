const { initDatabase, getDb } = require('./src/config/database');

async function debug() {
  await initDatabase();
  const db = getDb();

  console.log('测试INSERT和last_insert_rowid...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS test_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    )
  `);

  const stmt = db.prepare('INSERT INTO test_table (name) VALUES (?)');
  stmt.bind(['test_name']);
  const stepResult = stmt.step();
  console.log('step结果:', stepResult);
  stmt.free();

  const changes = db.getRowsModified();
  console.log('受影响行数:', changes);

  const idResult = db.exec('SELECT last_insert_rowid() as id');
  console.log('last_insert_rowid结果:', JSON.stringify(idResult, null, 2));

  const allResult = db.exec('SELECT * FROM test_table');
  console.log('表中所有数据:', JSON.stringify(allResult, null, 2));
}

debug().catch(console.error);
