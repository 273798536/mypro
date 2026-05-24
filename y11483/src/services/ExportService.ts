import { Repository } from 'typeorm';
import { createObjectCsvWriter } from 'csv-writer';
import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../config/database';
import {
  ExportRecord,
  ExportStatus,
  ExportFormat,
  ExportType,
  BatchTrace,
  EntityType,
  OperationType,
} from '../entities';
import { AuditService } from './AuditService';
import { BatchTraceService } from './BatchTraceService';

export interface CreateExportInput {
  exportType: ExportType;
  format: ExportFormat;
  batchNo?: string;
  potNo?: string;
  traceNo?: string;
  filters?: Record<string, any>;
  operator: string;
  requestId?: string;
}

export class ExportService {
  private exportRepository: Repository<ExportRecord>;
  private traceRepository: Repository<BatchTrace>;
  private auditService: AuditService;
  private traceService: BatchTraceService;

  constructor() {
    this.exportRepository = AppDataSource.getRepository(ExportRecord);
    this.traceRepository = AppDataSource.getRepository(BatchTrace);
    this.auditService = new AuditService();
    this.traceService = new BatchTraceService();
  }

  async createExport(input: CreateExportInput): Promise<ExportRecord> {
    if (input.traceNo) {
      const trace = await this.traceService.getTrace(input.traceNo);
      if (trace && trace.status !== 'frozen') {
        throw new Error(
          `Trace ${input.traceNo} must be frozen before export. Current status: ${trace?.status}`
        );
      }
    }

    const exportNo = `EXPORT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `${exportNo}.${input.format}`;
    const filePath = path.join(exportDir, fileName);

    const record = this.exportRepository.create({
      exportNo,
      exportType: input.exportType,
      format: input.format,
      status: ExportStatus.PENDING,
      batchNo: input.batchNo,
      potNo: input.potNo,
      traceNo: input.traceNo,
      filters: input.filters,
      fileName,
      filePath,
      exportedBy: input.operator,
      createdBy: input.operator,
      updatedBy: input.operator,
    });

    const saved = await this.exportRepository.save(record);

    await this.auditService.logCreate(
      saved.id,
      EntityType.BATCH_TRACE,
      exportNo,
      input.operator,
      saved,
      input.requestId
    );

    return saved;
  }

  async executeExport(exportNo: string, operator: string, requestId?: string): Promise<ExportRecord> {
    const record = await this.exportRepository.findOne({ where: { exportNo } });
    if (!record) {
      throw new Error(`Export ${exportNo} not found`);
    }

    const oldStatus = record.status;
    record.status = ExportStatus.PROCESSING;
    record.startedAt = new Date();
    record.updatedBy = operator;
    await this.exportRepository.save(record);

    try {
      let data: any[] = [];

      switch (record.exportType) {
        case ExportType.BATCH_TRACE:
        case ExportType.FULL_TRACE:
          data = await this.exportFullTrace(record);
          break;
        default:
          data = await this.exportByType(record);
      }

      record.recordCount = data.length;

      if (record.format === ExportFormat.CSV) {
        await this.writeCsv(record, data);
      } else if (record.format === ExportFormat.JSON) {
        await this.writeJson(record, data);
      }

      const stats = fs.statSync(record.filePath!);
      record.fileSize = stats.size;
      record.status = ExportStatus.COMPLETED;
      record.completedAt = new Date();
      record.durationMs = record.completedAt.getTime() - record.startedAt!.getTime();
      record.updatedBy = operator;

      const saved = await this.exportRepository.save(record);

      await this.auditService.logStatusChange(
        saved.id,
        EntityType.BATCH_TRACE,
        exportNo,
        OperationType.EXPORT,
        operator,
        oldStatus,
        ExportStatus.COMPLETED,
        `导出完成，共 ${data.length} 条记录`,
        requestId
      );

      return saved;
    } catch (error: any) {
      record.status = ExportStatus.FAILED;
      record.errorMessage = error.message;
      record.completedAt = new Date();
      record.updatedBy = operator;
      const saved = await this.exportRepository.save(record);

      await this.auditService.logStatusChange(
        saved.id,
        EntityType.BATCH_TRACE,
        exportNo,
        OperationType.EXPORT,
        operator,
        oldStatus,
        ExportStatus.FAILED,
        `导出失败: ${error.message}`,
        requestId
      );

      throw error;
    }
  }

  private async exportFullTrace(record: ExportRecord): Promise<any[]> {
    if (!record.traceNo) {
      throw new Error('traceNo is required for full trace export');
    }

    const trace = await this.traceService.getTrace(record.traceNo);
    if (!trace) {
      throw new Error(`Trace ${record.traceNo} not found`);
    }

    const result: any[] = [];

    result.push({
      type: 'BATCH_TRACE_HEADER',
      traceNo: trace.traceNo,
      batchNo: trace.batchNo,
      potNo: trace.potNo,
      productName: trace.productName,
      productionTime: trace.productionTime,
      status: trace.status,
      summary: trace.summary,
      sampleLabelCount: trace.sampleLabelCount,
      temperatureRecordCount: trace.temperatureRecordCount,
      complaintCount: trace.complaintCount,
      handoverCount: trace.handoverCount,
      totalStores: trace.totalStores,
      completedStores: trace.completedStores,
      hasAbnormalTemperature: trace.hasAbnormalTemperature,
      hasComplaint: trace.hasComplaint,
    });

    result.push({ type: 'STORES_SECTION', title: '=== 涉及门店列表' });

    for (const store of trace.stores || []) {
      result.push({
        type: 'STORE',
        ...store,
      });
    }

    const history = await this.traceService.getTraceHistory(record.traceNo);
    
    result.push({ type: 'HISTORY_SECTION', title: '=== 操作历史记录' });

    for (const log of history) {
      result.push({
        type: 'HISTORY',
        operationTime: log.operationTime,
        operator: log.operator,
        operationType: log.operationType,
        oldStatus: log.oldStatus,
        newStatus: log.newStatus,
        reason: log.reason,
      });
    }

    return result;
  }

  private async exportByType(record: ExportRecord): Promise<any[]> {
    return [];
  }

  private async writeCsv(record: ExportRecord, data: any[]): Promise<void> {
    if (data.length === 0) {
      fs.writeFileSync(record.filePath!, '');
      return;
    }

    const headers = Object.keys(data[0]).map((key) => ({ id: key, title: key }));

    const csvWriter = createObjectCsvWriter({
      path: record.filePath!,
      header: headers,
    });

    await csvWriter.writeRecords(data);
  }

  private async writeJson(record: ExportRecord, data: any[]): Promise<void> {
    fs.writeFileSync(record.filePath!, JSON.stringify(data, null, 2));
  }

  async getExport(exportNo: string): Promise<ExportRecord | null> {
    return this.exportRepository.findOne({ where: { exportNo } });
  }

  async listExports(
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ data: ExportRecord[]; total: number }> {
    const [data, total] = await this.exportRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { data, total };
  }

  async downloadExport(exportNo: string): Promise<{ filePath: string; fileName: string }> {
    const record = await this.getExport(exportNo);
    if (!record) {
      throw new Error(`Export ${exportNo} not found`);
    }
    if (record.status !== ExportStatus.COMPLETED) {
      throw new Error(`Export ${exportNo} is not completed`);
    }
    if (!record.filePath || !fs.existsSync(record.filePath)) {
      throw new Error(`Export file not found`);
    }
    return { filePath: record.filePath, fileName: record.fileName! };
  }
}