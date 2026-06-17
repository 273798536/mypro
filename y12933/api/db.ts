import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const PROJECT_ROOT = path.resolve(__dirname, '..')
export const DATA_DIR = path.join(PROJECT_ROOT, 'data')
export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'review.db')
export const SAMPLE_CSV = path.join(PROJECT_ROOT, 'samples', 'annotations.csv')
export const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'migrations')

export type DB = Database.Database

let dbInstance: DB | null = null

export function getDb(): DB {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return dbInstance
}

export function initDb(): DB {
  if (dbInstance) return dbInstance
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `)

  runMigrations(db)
  dbInstance = db
  return db
}

function runMigrations(db: DB): void {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').all().map((r) => (r as { name: string }).name),
  )

  const insertMigration = db.prepare(
    'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
  )

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    const tx = db.transaction(() => {
      db.exec(sql)
      insertMigration.run(file, new Date().toISOString())
    })
    tx()
  }
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
