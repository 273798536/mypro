import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/app.db');
const MIGRATIONS_PATH = path.join(__dirname, '../../migrations');

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function runMigrations() {
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_PATH)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const migrationPath = path.join(MIGRATIONS_PATH, file);
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`[DB] Running migration: ${file}`);
    db.exec(sql);
  }
}

function initializeDatabase() {
  try {
    runMigrations();
    console.log('[DB] Database initialized successfully');
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
    throw error;
  }
}

let isInitialized = false;

function getDb() {
  if (!isInitialized) {
    initializeDatabase();
    isInitialized = true;
  }
  return db;
}

function closeDb() {
  if (db.open) {
    db.close();
    console.log('[DB] Database connection closed');
  }
}

initializeDatabase();
isInitialized = true;

function runInTransaction<T>(fn: () => T): T {
  const result = db.transaction(fn)();
  return result;
}

export { db, getDb, closeDb, initializeDatabase, runInTransaction };
export default db;
