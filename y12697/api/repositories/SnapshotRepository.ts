import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import type { Snapshot, SnapshotStatus, RiskLevel } from '../../shared/types.js';

interface SnapshotRow {
  id: string;
  code: string;
  device_name: string;
  thumbnail: string;
  image_path: string;
  status: SnapshotStatus;
  risk_level: RiskLevel;
  created_at: string;
  updated_at: string;
  last_operator: string;
}

function rowToSnapshot(row: SnapshotRow): Snapshot {
  return {
    id: row.id,
    code: row.code,
    deviceName: row.device_name,
    thumbnail: row.thumbnail,
    imagePath: row.image_path,
    status: row.status,
    riskLevel: row.risk_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastOperator: row.last_operator,
  };
}

export const SnapshotRepository = {
  findAll(options?: { status?: SnapshotStatus; riskLevel?: RiskLevel; keyword?: string }): Snapshot[] {
    let sql = 'SELECT * FROM snapshots WHERE 1=1';
    const params: unknown[] = [];
    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }
    if (options?.riskLevel) {
      sql += ' AND risk_level = ?';
      params.push(options.riskLevel);
    }
    if (options?.keyword) {
      sql += ' AND (code LIKE ? OR device_name LIKE ?)';
      params.push(`%${options.keyword}%`, `%${options.keyword}%`);
    }
    sql += ' ORDER BY updated_at DESC';
    const rows = db.prepare(sql).all(...params) as SnapshotRow[];
    return rows.map(rowToSnapshot);
  },

  findById(id: string): Snapshot | null {
    const row = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(id) as SnapshotRow | undefined;
    return row ? rowToSnapshot(row) : null;
  },

  create(data: Omit<Snapshot, 'id' | 'createdAt' | 'updatedAt'>): Snapshot {
    const now = new Date().toISOString();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO snapshots (id, code, device_name, thumbnail, image_path, status, risk_level, created_at, updated_at, last_operator)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.code,
      data.deviceName,
      data.thumbnail,
      data.imagePath,
      data.status,
      data.riskLevel,
      now,
      now,
      data.lastOperator,
    );
    return SnapshotRepository.findById(id)!;
  },

  update(id: string, data: Partial<Omit<Snapshot, 'id' | 'createdAt'>>): Snapshot | null {
    const existing = SnapshotRepository.findById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const fields: string[] = [];
    const params: unknown[] = [];
    if (data.code !== undefined) {
      fields.push('code = ?');
      params.push(data.code);
    }
    if (data.deviceName !== undefined) {
      fields.push('device_name = ?');
      params.push(data.deviceName);
    }
    if (data.thumbnail !== undefined) {
      fields.push('thumbnail = ?');
      params.push(data.thumbnail);
    }
    if (data.imagePath !== undefined) {
      fields.push('image_path = ?');
      params.push(data.imagePath);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      params.push(data.status);
    }
    if (data.riskLevel !== undefined) {
      fields.push('risk_level = ?');
      params.push(data.riskLevel);
    }
    if (data.lastOperator !== undefined) {
      fields.push('last_operator = ?');
      params.push(data.lastOperator);
    }
    fields.push('updated_at = ?');
    params.push(now, id);
    db.prepare(`UPDATE snapshots SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return SnapshotRepository.findById(id);
  },
};
