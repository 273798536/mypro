import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { runQuery, runExecute } from '../db/database';

export interface ReportExportRecord {
  id: string;
  batchId: string;
  fileName: string;
  exportTime: string;
  operator: string;
  runNumber: number;
}

export class ReportExportRepository {
  static create(batchId: string, operator: string): ReportExportRecord {
    const id = uuidv4();
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

    const lastExport = runQuery(
      'SELECT MAX(run_number) as max_run FROM report_exports WHERE batch_id = ?',
      [batchId]
    );
    const runNumber = (lastExport[0]?.max_run || 0) + 1;

    const batch = runQuery('SELECT batch_no, name FROM batches WHERE id = ?', [batchId]);
    const batchNo = batch[0]?.batch_no || 'UNKNOWN';
    const dateStr = dayjs().format('YYYYMMDD_HHmmss');
    const fileName = `发芽率报告_${batchNo}_第${runNumber}次_${dateStr}.xlsx`;

    runExecute(
      `INSERT INTO report_exports (
        id, batch_id, file_name, export_time, operator, run_number
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, batchId, fileName, now, operator, runNumber]
    );

    return this.findById(id)!;
  }

  static findById(id: string): ReportExportRecord | null {
    const results = runQuery('SELECT * FROM report_exports WHERE id = ?', [id]);
    return results.length > 0 ? this.mapRow(results[0]) : null;
  }

  static findByBatchId(batchId: string): ReportExportRecord[] {
    const results = runQuery(
      'SELECT * FROM report_exports WHERE batch_id = ? ORDER BY export_time DESC',
      [batchId]
    );
    return results.map(row => this.mapRow(row));
  }

  static findAll(): ReportExportRecord[] {
    const results = runQuery('SELECT * FROM report_exports ORDER BY export_time DESC');
    return results.map(row => this.mapRow(row));
  }

  static getNextRunNumber(batchId: string): number {
    const result = runQuery(
      'SELECT COALESCE(MAX(run_number), 0) as max_run FROM report_exports WHERE batch_id = ?',
      [batchId]
    );
    return (result[0]?.max_run || 0) + 1;
  }

  static generateFileName(batchId: string, runNumber?: number): string {
    const batch = runQuery('SELECT batch_no, name FROM batches WHERE id = ?', [batchId]);
    const batchNo = batch[0]?.batch_no || 'UNKNOWN';
    const actualRunNumber = runNumber ?? this.getNextRunNumber(batchId);
    const dateStr = dayjs().format('YYYYMMDD_HHmmss');
    return `发芽率报告_${batchNo}_第${actualRunNumber}次_${dateStr}.xlsx`;
  }

  private static mapRow(row: any): ReportExportRecord {
    return {
      id: row.id,
      batchId: row.batch_id,
      fileName: row.file_name,
      exportTime: row.export_time,
      operator: row.operator,
      runNumber: row.run_number
    };
  }
}
