import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.NODE_ENV === 'test' 
  ? ':memory:' 
  : path.join(__dirname, '../../data/ledger.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功');
  }
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
});

export default db;
