import fs from 'fs';
import path from 'path';
import { stringify } from 'csv-stringify/sync';
import { DataSourceType, ReportData } from '../models/types';
import {
  MaterialDAO,
  BatchDAO,
  HistoryDAO,
  AuditLogDAO,
  FailedRecordDAO,
} from '../db/dao';

class ExportService {
  private materialDAO: MaterialDAO;
  private batchDAO: BatchDAO;
  private historyDAO: HistoryDAO;
  private auditLogDAO: AuditLogDAO;
  private failedRecordDAO: FailedRecordDAO;

  constructor(workDir?: string) {
    this.materialDAO = new MaterialDAO(workDir);
    this.batchDAO = new BatchDAO(workDir);
    this.historyDAO = new HistoryDAO(workDir);
    this.auditLogDAO = new AuditLogDAO(workDir);
    this.failedRecordDAO = new FailedRecordDAO(workDir);
  }

  async exportToCSV(type: DataSourceType, outputPath: string): Promise<void> {
    const data = await this.materialDAO.findAll(type);
    const csv = stringify(data, {
      header: true,
      columns: Object.keys(data[0] || {}),
    });
    fs.writeFileSync(outputPath, csv, 'utf-8');
  }

  async exportBatchToCSV(batchId: string, outputPath: string): Promise<void> {
    const batch = await this.batchDAO.findById(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }
    const data = await this.materialDAO.findByBatchId(batch.source_type, batchId);
    const csv = stringify(data, {
      header: true,
      columns: Object.keys(data[0] || {}),
    });
    fs.writeFileSync(outputPath, csv, 'utf-8');
  }

  async exportFailedRecords(outputPath: string): Promise<void> {
    const records = await this.failedRecordDAO.findByStatus('pending');
    const csv = stringify(records, {
      header: true,
      columns: ['id', 'original_line_no', 'material_code', 'error_type', 'error_message', 'raw_data'],
    });
    fs.writeFileSync(outputPath, csv, 'utf-8');
  }

  async exportHistory(materialCode: string, outputPath: string): Promise<void> {
    const history = await this.historyDAO.getHistory(materialCode);
    const csv = stringify(history, {
      header: true,
      columns: ['version', 'change_type', 'changed_by', 'changed_at', 'batch_id', 'data'],
    });
    fs.writeFileSync(outputPath, csv, 'utf-8');
  }

  async exportAuditLog(outputPath: string): Promise<void> {
    const logs = await this.auditLogDAO.findAll(10000);
    const csv = stringify(logs, {
      header: true,
      columns: ['operate_time', 'action', 'material_code', 'field_name', 'old_value', 'new_value', 'operator'],
    });
    fs.writeFileSync(outputPath, csv, 'utf-8');
  }

  async exportReport(report: ReportData, outputPath: string): Promise<void> {
    const reportJson = JSON.stringify(report, null, 2);
    fs.writeFileSync(outputPath, reportJson, 'utf-8');
  }

  async exportAll(outputDir: string): Promise<void> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const types: DataSourceType[] = ['material_list', 'logistics_receipt', 'on_site_borrow', 'inventory_diff'];
    for (const type of types) {
      const outputPath = path.join(outputDir, `${type}.csv`);
      await this.exportToCSV(type, outputPath);
    }

    await this.exportAuditLog(path.join(outputDir, 'audit_log.csv'));
    await this.exportFailedRecords(path.join(outputDir, 'failed_records.csv'));

    const batches = await this.batchDAO.findAll();
    const batchesCsv = stringify(batches, {
      header: true,
      columns: ['id', 'source_type', 'file_name', 'strategy', 'total_count', 'success_count', 'failed_count', 'operator', 'import_time'],
    });
    fs.writeFileSync(path.join(outputDir, 'batches.csv'), batchesCsv, 'utf-8');
  }
}

export { ExportService };
export const exportService = new ExportService();
