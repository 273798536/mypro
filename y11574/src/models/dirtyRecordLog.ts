import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { DirtyRecordLog, DirtyRecordType } from '../types';

interface CreateDirtyRecordLogDto {
  recordId: string;
  dirtyType: DirtyRecordType;
  fieldName?: string;
  expectedValue?: string;
  actualValue?: string;
}

function rowToDirtyLog(row: any): DirtyRecordLog {
  return {
    id: row.id,
    recordId: row.record_id,
    dirtyType: row.dirty_type as DirtyRecordType,
    fieldName: row.field_name,
    expectedValue: row.expected_value,
    actualValue: row.actual_value,
    detectedAt: row.detected_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    resolution: row.resolution
  };
}

export const dirtyRecordLogModel = {
  async create(dto: CreateDirtyRecordLogDto): Promise<DirtyRecordLog> {
    const now = new Date().toISOString();
    const id = uuidv4();

    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO dirty_record_logs (
          id, record_id, dirty_type, field_name, expected_value,
          actual_value, detected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id, dto.recordId, dto.dirtyType, dto.fieldName || null,
        dto.expectedValue || null, dto.actualValue || null, now,
        (err: Error | null) => {
          if (err) reject(err);
          else this.findById(id).then(record => resolve(record!)).catch(reject);
        }
      );
      stmt.finalize();
    });
  },

  async findById(id: string): Promise<DirtyRecordLog | null> {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM dirty_record_logs WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row ? rowToDirtyLog(row) : null);
      });
    });
  },

  async findByRecordId(recordId: string): Promise<DirtyRecordLog[]> {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM dirty_record_logs WHERE record_id = ? ORDER BY detected_at DESC',
        [recordId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(rowToDirtyLog));
        }
      );
    });
  },

  async resolve(
    id: string,
    resolvedBy: string,
    resolution: string
  ): Promise<DirtyRecordLog | null> {
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE dirty_record_logs 
         SET resolved_at = ?, resolved_by = ?, resolution = ?
         WHERE id = ?`,
        [now, resolvedBy, resolution, id],
        (err) => {
          if (err) reject(err);
          else this.findById(id).then(resolve).catch(reject);
        }
      );
    });
  },

  async listUnresolved(): Promise<DirtyRecordLog[]> {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM dirty_record_logs WHERE resolved_at IS NULL ORDER BY detected_at DESC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(rowToDirtyLog));
        }
      );
    });
  },

  async getStats(): Promise<Array<{ type: string; count: number; unresolved: number }>> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT dirty_type as type, 
               COUNT(*) as count,
               SUM(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END) as unresolved
         FROM dirty_record_logs 
         GROUP BY dirty_type`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map((r: any) => ({
            type: r.type,
            count: r.count,
            unresolved: r.unresolved
          })));
        }
      );
    });
  }
};
