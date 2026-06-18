import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.resolve(__dirname, '../../data')
const DB_PATH = path.join(DATA_DIR, 'rwsplit.db')

let dbInstance: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  dbInstance = new DatabaseSync(DB_PATH)
  dbInstance.exec('PRAGMA journal_mode = WAL;')
  dbInstance.exec('PRAGMA foreign_keys = ON;')
  return dbInstance
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

export function withTransaction<T>(fn: () => T): T {
  const db = getDb()
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}
