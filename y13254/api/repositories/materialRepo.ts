import crypto from 'crypto';
import { db } from '../lib/db';
import type { Material, MaterialType } from '../../shared/types';

function safeJsonParse<T = any>(val: any, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return JSON.parse(JSON.stringify(parsed ?? fallback));
  } catch {
    return fallback;
  }
}

function rowToMaterial(row: any): Material {
  return {
    id: row.id,
    locationId: row.location_id,
    type: row.type as MaterialType,
    version: row.version,
    previousVersionId: row.previous_version_id ?? null,
    payload: safeJsonParse(row.payload, {}),
    hasCaliberChange: (row.has_caliber_change as 0 | 1) ?? 0,
    changeNote: row.change_note ?? null,
    capturedAt: row.captured_at ?? null,
    submittedBy: row.submitted_by ?? null,
    createdAt: row.created_at
  };
}

export interface CreateMaterialInput {
  locationId: string;
  type: MaterialType;
  version?: number;
  previousVersionId?: string | null;
  payload: any;
  hasCaliberChange?: 0 | 1;
  changeNote?: string | null;
  capturedAt?: string | null;
  submittedBy?: string | null;
}

export function createMaterial(input: CreateMaterialInput): Material {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO material (
      id, location_id, type, version, previous_version_id, payload,
      has_caliber_change, change_note, captured_at, submitted_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    input.locationId,
    input.type,
    input.version ?? 1,
    input.previousVersionId ?? null,
    JSON.stringify(JSON.parse(JSON.stringify(input.payload))),
    input.hasCaliberChange ?? 0,
    input.changeNote ?? null,
    input.capturedAt ?? null,
    input.submittedBy ?? null,
    now
  );
  return getMaterialById(id)!;
}

export function listMaterials(): Material[] {
  const rows = db.prepare('SELECT * FROM material ORDER BY created_at DESC').all();
  return rows.map(rowToMaterial);
}

export function getMaterialById(id: string): Material | null {
  const row = db.prepare('SELECT * FROM material WHERE id = ?').get(id);
  if (!row) return null;
  return rowToMaterial(row);
}

export function listVersionsByLocationAndType(
  locationId: string,
  type: MaterialType
): Material[] {
  const rows = db.prepare(`
    SELECT * FROM material
    WHERE location_id = ? AND type = ?
    ORDER BY version DESC, created_at DESC
  `).all(locationId, type);
  return rows.map(rowToMaterial);
}

export function countByLocationAndType(
  locationId: string,
  type: MaterialType
): number {
  const row = db.prepare(`
    SELECT COUNT(*) as cnt FROM material WHERE location_id = ? AND type = ?
  `).get(locationId, type) as { cnt: number } | undefined;
  return row?.cnt ?? 0;
}
