import Database from 'better-sqlite3';
import path from 'path';
import { CREATE_TABLES_SQL } from './schema';

let dbInstance: Database.Database | null = null;

export function getDatabase(dbPath?: string): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const databasePath = dbPath || path.join(process.cwd(), 'data', 'ledger.db');
  dbInstance = new Database(databasePath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.exec(CREATE_TABLES_SQL);

  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function resetDatabase(): void {
  if (dbInstance) {
    dbInstance.exec(`
      DELETE FROM second_confirmations;
      DELETE FROM user_reviews;
      DELETE FROM technician_locations;
      DELETE FROM appointment_orders;
      DELETE FROM status_change_logs;
      DELETE FROM failed_records;
      DELETE FROM ledgers;
    `);
  }
}
