import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_DIR = path.join(os.homedir(), '.spi-cli');
const DB_PATH = path.join(DB_DIR, 'spare_parts_inspection.db');
const INIT_MARKER_PATH = path.join(DB_DIR, '.initialized');

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
  logging: false
});

export async function connectDatabase(): Promise<DataSource> {
  ensureDbDirExists();
  
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  
  return AppDataSource;
}

export async function syncDatabaseSchema(force: boolean = false): Promise<void> {
  ensureDbDirExists();
  
  if (force && fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    if (fs.existsSync(INIT_MARKER_PATH)) {
      fs.unlinkSync(INIT_MARKER_PATH);
    }
  }
  
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  
  await AppDataSource.synchronize(false);
  
  fs.writeFileSync(INIT_MARKER_PATH, new Date().toISOString());
}

export function isDatabaseInitialized(): boolean {
  return fs.existsSync(INIT_MARKER_PATH);
}

export async function initializeDatabase(force: boolean = false): Promise<DataSource> {
  ensureDbDirExists();
  
  if (force && fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    if (fs.existsSync(INIT_MARKER_PATH)) {
      fs.unlinkSync(INIT_MARKER_PATH);
    }
  }
  
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  
  if (force || !isDatabaseInitialized()) {
    await AppDataSource.synchronize(false);
    fs.writeFileSync(INIT_MARKER_PATH, new Date().toISOString());
  }
  
  return AppDataSource;
}

export function getDatabasePath(): string {
  return DB_PATH;
}

export function getDatabaseDir(): string {
  return DB_DIR;
}
