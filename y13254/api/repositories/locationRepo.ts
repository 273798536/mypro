import crypto from 'crypto';
import { db } from '../lib/db';
import type { Location } from '../../shared/types';

function safeJsonParse<T = any>(val: any, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return JSON.parse(JSON.stringify(parsed ?? fallback));
  } catch {
    return fallback;
  }
}

function rowToLocation(row: any): Location {
  return {
    id: row.id,
    canonicalName: row.canonical_name,
    aliases: safeJsonParse<string[]>(row.aliases, []),
    lng: row.lng,
    lat: row.lat,
    boundaryGeoJSON: safeJsonParse(row.boundary_geojson, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export interface CreateLocationInput {
  canonicalName: string;
  aliases: string[];
  lng: number;
  lat: number;
  boundaryGeoJSON: any;
}

export function createLocation(input: CreateLocationInput): Location {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO location (id, canonical_name, aliases, lng, lat, boundary_geojson, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    input.canonicalName,
    JSON.stringify(JSON.parse(JSON.stringify(input.aliases))),
    input.lng,
    input.lat,
    JSON.stringify(JSON.parse(JSON.stringify(input.boundaryGeoJSON))),
    now,
    now
  );
  return getLocationById(id)!;
}

export function listLocations(): Location[] {
  const rows = db.prepare('SELECT * FROM location ORDER BY created_at DESC').all();
  return rows.map(rowToLocation);
}

export function getLocationById(id: string): Location | null {
  const row = db.prepare('SELECT * FROM location WHERE id = ?').get(id);
  if (!row) return null;
  return rowToLocation(row);
}

export function updateAliases(id: string, aliases: string[]): Location | null {
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE location SET aliases = ?, updated_at = ? WHERE id = ?
  `).run(
    JSON.stringify(JSON.parse(JSON.stringify(aliases))),
    now,
    id
  );
  if (result.changes === 0) return null;
  return getLocationById(id);
}

export function deleteLocation(id: string): boolean {
  const result = db.prepare('DELETE FROM location WHERE id = ?').run(id);
  return result.changes > 0;
}
