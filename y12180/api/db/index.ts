import Database from 'better-sqlite3';
import { initDatabase } from './init';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = initDatabase();
  }
  return db;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function toCamelCase<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    let value = row[key];
    
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try {
        value = JSON.parse(value);
      } catch {
        // Keep as string if parsing fails
      }
    }
    
    result[camelKey] = value;
  }
  return result as T;
}

export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    let value = obj[key];
    
    if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) {
      value = JSON.stringify(value);
    }
    
    result[snakeKey] = value;
  }
  return result;
}
