import { BaseRepository } from './BaseRepository.js';
import type { BackupCheck, BackupStatus, BackupSummary } from '../../shared/types.js';

interface BackupCheckRow {
  id: string;
  table_name: string;
  backup_date: string;
  status: BackupStatus;
  expected_records: number;
  actual_records: number;
  gap_records: number;
  checksum?: string;
}

export class BackupCheckRepository extends BaseRepository<BackupCheck> {
  protected tableName = 'backup_checks';

  protected rowToEntity(row: unknown): BackupCheck {
    const r = row as BackupCheckRow;
    return {
      id: r.id,
      tableName: r.table_name,
      backupDate: r.backup_date,
      status: r.status,
      expectedRecords: r.expected_records,
      actualRecords: r.actual_records,
      gapRecords: r.gap_records,
      checksum: r.checksum,
    };
  }

  create(check: Omit<BackupCheck, 'id'>): BackupCheck {
    const existing = this.db.prepare(`SELECT id FROM ${this.tableName} WHERE table_name = ? AND backup_date = ?`)
      .get(check.tableName, check.backupDate) as { id: string } | undefined;

    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE ${this.tableName} SET status = ?, expected_records = ?, actual_records = ?, gap_records = ?, checksum = ?
        WHERE id = ?
      `);
      stmt.run(check.status, check.expectedRecords, check.actualRecords, check.gapRecords, check.checksum || null, existing.id);
      return this.findById(existing.id)!;
    }

    const id = `bak_${Date.now()}_${check.tableName}`;
    const stmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (
        id, table_name, backup_date, status, expected_records,
        actual_records, gap_records, checksum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, check.tableName, check.backupDate, check.status,
      check.expectedRecords, check.actualRecords, check.gapRecords, check.checksum || null
    );

    return this.findById(id)!;
  }

  findAll(): BackupCheck[] {
    const rows = this.db.prepare(`SELECT * FROM ${this.tableName} ORDER BY backup_date DESC, table_name`).all() as BackupCheckRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  findByStatus(status: BackupStatus): BackupCheck[] {
    const rows = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY backup_date DESC`)
      .all(status) as BackupCheckRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  findGaps(): BackupCheck[] {
    return this.findByStatus('MISSING');
  }

  getSummary(): BackupSummary {
    const rows = this.db.prepare(`SELECT status, COUNT(*) as count, SUM(gap_records) as total_gaps FROM ${this.tableName} GROUP BY status`)
      .all() as { status: BackupStatus; count: number; total_gaps: number }[];

    const summary: BackupSummary = {
      totalChecks: 0,
      verified: 0,
      missing: 0,
      corrupted: 0,
      totalGapRecords: 0,
      completionRate: 0,
    };

    rows.forEach(row => {
      summary.totalChecks += row.count;
      summary.totalGapRecords += row.total_gaps || 0;
      if (row.status === 'VERIFIED') summary.verified = row.count;
      else if (row.status === 'MISSING') summary.missing = row.count;
      else if (row.status === 'CORRUPTED') summary.corrupted = row.count;
    });

    summary.completionRate = summary.totalChecks > 0
      ? Math.round((summary.verified / summary.totalChecks) * 100)
      : 0;

    return summary;
  }
}
