import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'warning_system.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  const migrationDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const appliedMigrations = new Set(
    db.prepare('SELECT id FROM migrations').all().map((r: any) => r.id)
  );

  for (const file of migrationFiles) {
    if (!appliedMigrations.has(file)) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      db.exec(sql);
      db.prepare('INSERT INTO migrations (id) VALUES (?)').run(file);
      console.log(`Applied migration: ${file}`);
    }
  }
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
