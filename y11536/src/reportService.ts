import fs from 'fs';
import path from 'path';
import { AttendanceDatabase } from './database';
import { ReportData, AttendanceStatus, SourceType } from './types';

export class ReportService {
  private db: AttendanceDatabase;

  constructor(db: AttendanceDatabase) {
    this.db = db;
  }

  async generateReport(): Promise<ReportData> {
    const records = await this.db.getAllRecords();
    const failures = await this.db.getImportFailures();
    const now = new Date().toISOString();

    const statusBreakdown: Record<AttendanceStatus, number> = {
      pending: 0,
      confirmed: 0,
      duplicate: 0,
      withdrawn: 0,
      resubmitted: 0,
      failed: 0,
      manually_corrected: 0,
      frozen: 0,
      proxy_sign: 0,
      makeup_sign: 0,
    };

    const sourceBreakdown: Record<SourceType, number> = {
      registration: 0,
      qrcode: 0,
      homework: 0,
      external_receipt: 0,
    };

    const trackingNumberSet = new Set<string>();
    const duplicateTrackingNumbers: string[] = [];
    let unresolvedIssues = 0;
    let frozenRecords = 0;

    for (const record of records) {
      statusBreakdown[record.currentStatus]++;

      for (const source of record.sources) {
        sourceBreakdown[source.sourceType]++;
      }

      if (record.isFrozen) {
        frozenRecords++;
      }

      if (trackingNumberSet.has(record.trackingNumber)) {
        if (!duplicateTrackingNumbers.includes(record.trackingNumber)) {
          duplicateTrackingNumbers.push(record.trackingNumber);
        }
      } else {
        trackingNumberSet.add(record.trackingNumber);
      }

      for (const issue of record.issues) {
        if (!issue.resolved) {
          unresolvedIssues++;
        }
      }
    }

    return {
      generatedAt: now,
      totalRecords: records.length,
      statusBreakdown,
      sourceBreakdown,
      unresolvedIssues,
      frozenRecords,
      duplicateTrackingNumbers,
      failedImports: failures.map(f => ({
        sourceFile: f.sourceFile,
        lineNumber: f.lineNumber,
        error: f.error,
      })),
    };
  }

  async exportToCSV(outputPath: string, includeFrozen: boolean = false): Promise<string> {
    const records = await this.db.getAllRecords();
    const filteredRecords = includeFrozen 
      ? records 
      : records.filter(r => !r.isFrozen);

    const headers = [
      '记录ID',
      '员工ID',
      '员工姓名',
      '快递单号',
      '课程ID',
      '课程名称',
      '签到日期',
      '当前状态',
      '来源数量',
      '来源类型',
      '问题数量',
      '是否冻结',
      '冻结原因',
      '创建时间',
      '更新时间',
    ];

    const rows = filteredRecords.map(r => [
      r.id,
      r.employeeId,
      r.employeeName,
      r.trackingNumber,
      r.courseId,
      r.courseName,
      r.attendDate,
      r.currentStatus,
      r.sources.length,
      r.sources.map(s => s.sourceType).join('|'),
      r.issues.filter(i => !i.resolved).length,
      r.isFrozen ? '是' : '否',
      r.frozenReason || '',
      r.createdAt,
      r.updatedAt,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, '\uFEFF' + csvContent, 'utf-8');
    return outputPath;
  }

  async exportWithSources(outputPath: string): Promise<string> {
    const records = await this.db.getAllRecords();
    
    const headers = [
      '记录ID',
      '员工ID',
      '员工姓名',
      '快递单号',
      '课程ID',
      '课程名称',
      '签到日期',
      '当前状态',
      '来源文件',
      '来源类型',
      '原始行号',
      '导入时间',
      '批次ID',
      '是否冻结',
    ];

    const rows: string[][] = [];

    for (const record of records) {
      for (const source of record.sources) {
        rows.push([
          record.id,
          record.employeeId,
          record.employeeName,
          record.trackingNumber,
          record.courseId,
          record.courseName,
          record.attendDate,
          record.currentStatus,
          source.sourceFile,
          source.sourceType,
          String(source.originalLineNumber),
          source.importedAt,
          source.importBatchId,
          record.isFrozen ? '是' : '否',
        ]);
      }
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, '\uFEFF' + csvContent, 'utf-8');
    return outputPath;
  }

  async exportFailures(outputPath: string): Promise<string> {
    const failures = await this.db.getImportFailures();

    const headers = [
      '来源文件',
      '来源类型',
      '原始行号',
      '错误信息',
      '原始数据',
    ];

    const rows = failures.map(f => [
      f.sourceFile,
      f.sourceType,
      String(f.lineNumber),
      f.error,
      JSON.stringify(f.rawData),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, '\uFEFF' + csvContent, 'utf-8');
    return outputPath;
  }
}
