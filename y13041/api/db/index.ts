import type Database from 'better-sqlite3'
import { createDatabase, createTables } from './init.js'
import { seedDatabase } from './seed.js'

let instance: Database.Database | null = null
let initialized = false

export function getDb(): Database.Database {
  if (!instance) {
    instance = createDatabase()
  }
  if (!initialized) {
    createTables(instance)
    seedDatabase(instance)
    initialized = true
  }
  return instance
}

export default getDb
