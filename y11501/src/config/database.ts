import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_DIR = path.join(os.homedir(), '.spi-cli');
const DB_PATH = path.join(DB_DIR, 'spare_parts_inspection.db');

function ensureDbDirExists(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: DB_PATH,
  entities: [path.join(__dirname, '../entities/**/*.{ts,js}')],
  synchronize: false,
  logging: false,
  migrations: [path.join(__dirname, '../migrations/**/*.{ts,js}')],
  migrationsRun: false
});

export async function initializeDatabase(force: boolean = false): Promise<DataSource> {
  ensureDbDirExists();
  
  if (force && fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  
  await AppDataSource.synchronize(true);
  
  return AppDataSource;
}

export function getDatabasePath(): string {
  return DB_PATH;
}

export function getDatabaseDir(): string {
  return DB_DIR;
}
