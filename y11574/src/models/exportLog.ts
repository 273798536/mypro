import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { ExportLog } from '../types';

interface CreateExportLogDto {
  exportedBy: string;
  exportedByName: string;
  exportType: 'csv' | 'excel';
  recordCount: number;
  totalAmount: number;
  isMasked: boolean;
  maskedFields: string[];
  filters: Record<string, unknown>;
  checksum: string;
}

function rowToExportLog(row: any): ExportLog {
  return {
    id: row.id,
    exportedBy: row.exported_by,
    exportedByName: row.exported_by_name,
    exportType: row.export_type as 'csv' | 'excel',
    recordCount: row.record_count,
    totalAmount: row.total_amount,
    isMasked: row.is_masked === 1,
    maskedFields: row.masked_fields ? JSON.parse(row.masked_fields) : [],
    filters: row.filters ? JSON.parse(row.filters) : {},
    exportedAt: row.exported_at,
    checksum: row.checksum
  };
}

export const exportLogModel = {
  async create(dto: CreateExportLogDto): Promise<ExportLog> {
    const now = new Date().toISOString();
    const id = uuidv4();

    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO export_logs (
          id, exported_by, exported_by_name, export_type, record_count,
          total_amount, is_masked, masked_fields, filters, exported_at, checksum
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id, dto.exportedBy, dto.exportedByName, dto.exportType,
        dto.recordCount, dto.totalAmount, dto.isMasked ? 1 : 0,
        JSON.stringify(dto.maskedFields), JSON.stringify(dto.filters),
        now, dto.checksum,
        (err: Error | null) => {
          if (err) reject(err);
          else this.findById(id).then(record => resolve(record!)).catch(reject);
        }
      );
      stmt.finalize();
    });
  },

  async findById(id: string): Promise<ExportLog | null> {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM export_logs WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row ? rowToExportLog(row) : null);
      });
    });
  },

  async list(limit: number = 100): Promise<ExportLog[]> {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM export_logs ORDER BY exported_at DESC LIMIT ?',
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(rowToExportLog));
        }
      );
    });
  },

  async getRecentByUser(userId: string, limit: number = 10): Promise<ExportLog[]> {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM export_logs WHERE exported_by = ? ORDER BY exported_at DESC LIMIT ?',
        [userId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(rowToExportLog));
        }
      );
    });
  }
};
