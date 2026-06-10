const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const SQL = await initSqlJs();
    console.log('sql.js OK, version:', SQL.SQLITE_VERSION);
    const db = new SQL.Database();
    db.run('CREATE TABLE t (a INT, b TEXT)');
    db.run('INSERT INTO t VALUES (?, ?), (?, ?)', [1, 'hello', 2, 'world']);
    const res = db.exec('SELECT * FROM t');
    console.log('query result:', JSON.stringify(res));
    const stmt = db.prepare('SELECT * FROM t WHERE a = ?');
    stmt.bind([1]);
    while (stmt.step()) console.log('row:', stmt.getAsObject());
    stmt.free();
    const data = db.export();
    console.log('exported buffer size:', data.length);
    fs.writeFileSync(path.join(__dirname, 'db', 'test.db'), data);
    console.log('saved to db/test.db');
    db.close();
    console.log('All tests passed!');
  } catch (e) {
    console.error('ERROR:', e);
  }
})();
