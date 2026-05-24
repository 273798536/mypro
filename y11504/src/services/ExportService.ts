import { DataSource } from 'typeorm';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';
import { Ledger } from '../entities/Ledger';
import { SensitiveFieldLevel, UserRole, LedgerStatus, DataQuality } from '../types/enums';
import { applyMasking } from '../utils/masking';
import { ChangeHistory } from '../entities/ChangeHistory';

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  includeSensitive?: boolean;
  sensitiveLevel?: SensitiveFieldLevel;
  filters?: {
    status?: LedgerStatus;
    engineerId?: string;
    dataQuality?: DataQuality;
    startDate?: Date;
    endDate?: Date;
  };
  includeHistory?: boolean;
  includePartScans?: boolean;
  includePhotos?: boolean;
  includeExternalReceipts?: boolean;
}

export class ExportService {
  constructor(private dataSource: DataSource) {}

  async exportLedgers(
    options: ExportOptions,
    operator: { id: string; name: string; role: UserRole }
  ): Promise<{
    data: Buffer | string;
    filename: string;
    contentType: string;
  }> {
    const sensitiveLevel = options.includeSensitive
      ? SensitiveFieldLevel.NONE
      : options.sensitiveLevel || SensitiveFieldLevel.MASK;

    const ledgers = await this.fetchLedgersForExport(options);

    let processedLedgers = ledgers.map((ledger) =>
      this.transformLedgerForExport(ledger, {
        sensitiveLevel,
        includeHistory: options.includeHistory,
        includePartScans: options.includePartScans,
        includePhotos: options.includePhotos,
        includeExternalReceipts: options.includeExternalReceipts,
      })
    );

    processedLedgers = processedLedgers.map((l) => applyMasking(l, sensitiveLevel));

    const timestamp = new Date().toISOString().slice(0, 10);

    switch (options.format) {
      case 'json':
        return {
          data: JSON.stringify(processedLedgers, null, 2),
          filename: `ledgers_${timestamp}.json`,
          contentType: 'application/json',
        };

      case 'csv':
        return this.exportToCSV(processedLedgers, timestamp);

      case 'xlsx':
        return this.exportToXLSX(processedLedgers, timestamp);

      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }
  }

  private async fetchLedgersForExport(options: ExportOptions): Promise<Ledger[]> {
    const repository = this.dataSource.getRepository(Ledger);
    const where: any = { isDeleted: false };

    if (options.filters) {
      if (options.filters.status) where.status = options.filters.status;
      if (options.filters.engineerId) where.engineerId = options.filters.engineerId;
      if (options.filters.dataQuality) where.dataQuality = options.filters.dataQuality;
      if (options.filters.startDate || options.filters.endDate) {
        where.createdAt = {};
        if (options.filters.startDate) where.createdAt.$gte = options.filters.startDate;
        if (options.filters.endDate) where.createdAt.$lte = options.filters.endDate;
      }
    }

    const relations: string[] = [];
    if (options.includePartScans) relations.push('partScans');
    if (options.includePhotos) relations.push('receiptPhotos');
    if (options.includeExternalReceipts) relations.push('externalReceipts');
    if (options.includeHistory) relations.push('changeHistories');

    return repository.find({
      where,
      order: { createdAt: 'DESC' },
      relations,
    });
  }

  private transformLedgerForExport(
    ledger: Ledger,
    options: {
      sensitiveLevel: SensitiveFieldLevel;
      includeHistory?: boolean;
      includePartScans?: boolean;
      includePhotos?: boolean;
      includeExternalReceipts?: boolean;
    }
  ): Record<string, any> {
    const result: Record<string, any> = {
      id: ledger.id,
      ledgerNo: ledger.ledgerNo,
      status: ledger.status,
      dataQuality: ledger.dataQuality,
      repairOrderId: ledger.repairOrderId,
      engineerId: ledger.engineerId,
      engineerName: ledger.engineerName,
      submitTime: ledger.submitTime?.toISOString(),
      confirmTime: ledger.confirmTime?.toISOString(),
      auditTime: ledger.auditTime?.toISOString(),
      rejectReason: ledger.rejectReason,
      rejectBy: ledger.rejectBy,
      confirmBy: ledger.confirmBy,
      auditBy: ledger.auditBy,
      changeReason: ledger.changeReason,
      version: ledger.version,
      createdAt: ledger.createdAt.toISOString(),
      updatedAt: ledger.updatedAt.toISOString(),
      createdBy: ledger.createdBy,
      updatedBy: ledger.updatedBy,
    };

    if (options.includePartScans && ledger.partScans) {
      result.partScansCount = ledger.partScans.length;
      result.partScans = ledger.partScans.map((p) => ({
        partCode: p.partCode,
        partName: p.partName,
        partType: p.partType,
        quantity: p.quantity,
        batchNo: p.batchNo,
        scanTime: p.scanTime?.toISOString(),
      }));
    }

    if (options.includePhotos && ledger.receiptPhotos) {
      result.photoCount = ledger.receiptPhotos.length;
      result.photos = ledger.receiptPhotos.map((p) => ({
        photoUrl: p.photoUrl,
        photoHash: p.photoHash,
        photoSize: p.photoSize,
        description: p.description,
        captureTime: p.captureTime?.toISOString(),
      }));
    }

    if (options.includeExternalReceipts && ledger.externalReceipts) {
      result.externalReceiptCount = ledger.externalReceipts.length;
      result.externalReceipts = ledger.externalReceipts.map((r) => ({
        receiptNo: r.receiptNo,
        source: r.source,
        sourceSystem: r.sourceSystem,
        receivedAt: r.receivedAt?.toISOString(),
        sender: r.sender,
      }));
    }

    if (options.includeHistory && ledger.changeHistories) {
      result.historyCount = ledger.changeHistories.length;
      result.changeHistory = ledger.changeHistories.map((h: ChangeHistory) => ({
        action: h.action,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        reason: h.reason,
        operatorName: h.operatorName,
        operatorRole: h.operatorRole,
        version: h.version,
        createdAt: h.createdAt.toISOString(),
        changes: h.changes,
      }));
    }

    return result;
  }

  private exportToCSV(
    data: Record<string, any>[],
    timestamp: string
  ): {
    data: string;
    filename: string;
    contentType: string;
  } {
    const flatData = data.map((item) => {
      const flat: Record<string, any> = { ...item };
      delete flat.partScans;
      delete flat.photos;
      delete flat.externalReceipts;
      delete flat.changeHistory;
      return flat;
    });

    const parser = new Parser();
    const csv = parser.parse(flatData);

    return {
      data: csv,
      filename: `ledgers_${timestamp}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  }

  private async exportToXLSX(
    data: Record<string, any>[],
    timestamp: string
  ): Promise<{
    data: Buffer;
    filename: string;
    contentType: string;
  }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('台账数据');

    const headers = [
      { header: '台账编号', key: 'ledgerNo', width: 25 },
      { header: '状态', key: 'status', width: 12 },
      { header: '数据质量', key: 'dataQuality', width: 12 },
      { header: '维修单号', key: 'repairOrderId', width: 20 },
      { header: '工程师ID', key: 'engineerId', width: 15 },
      { header: '工程师姓名', key: 'engineerName', width: 12 },
      { header: '提交时间', key: 'submitTime', width: 20 },
      { header: '确认时间', key: 'confirmTime', width: 20 },
      { header: '审计时间', key: 'auditTime', width: 20 },
      { header: '驳回原因', key: 'rejectReason', width: 30 },
      { header: '版本', key: 'version', width: 8 },
      { header: '创建时间', key: 'createdAt', width: 20 },
      { header: '备件扫码数', key: 'partScansCount', width: 12 },
      { header: '签收照数', key: 'photoCount', width: 12 },
      { header: '外部回执数', key: 'externalReceiptCount', width: 12 },
      { header: '变更记录数', key: 'historyCount', width: 12 },
    ];

    worksheet.columns = headers;

    for (const item of data) {
      worksheet.addRow(item);
    }

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      data: Buffer.from(buffer),
      filename: `ledgers_${timestamp}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  async exportSingleLedger(
    ledgerId: string,
    options: Omit<ExportOptions, 'filters'>,
    operator: { id: string; name: string; role: UserRole }
  ): Promise<{
    data: Buffer | string;
    filename: string;
    contentType: string;
  }> {
    const ledger = await this.dataSource.getRepository(Ledger).findOne({
      where: { id: ledgerId, isDeleted: false },
      relations: ['partScans', 'receiptPhotos', 'externalReceipts', 'changeHistories'],
    });

    if (!ledger) {
      throw new Error('台账不存在');
    }

    const sensitiveLevel = options.includeSensitive
      ? SensitiveFieldLevel.NONE
      : options.sensitiveLevel || SensitiveFieldLevel.MASK;

    let processedLedger = this.transformLedgerForExport(ledger, {
      sensitiveLevel,
      includeHistory: true,
      includePartScans: true,
      includePhotos: true,
      includeExternalReceipts: true,
    });

    processedLedger = applyMasking(processedLedger, sensitiveLevel);

    const timestamp = new Date().toISOString().slice(0, 10);

    switch (options.format) {
      case 'json':
        return {
          data: JSON.stringify(processedLedger, null, 2),
          filename: `ledger_${ledger.ledgerNo}_${timestamp}.json`,
          contentType: 'application/json',
        };

      case 'csv':
        const parser = new Parser();
        return {
          data: parser.parse([processedLedger]),
          filename: `ledger_${ledger.ledgerNo}_${timestamp}.csv`,
          contentType: 'text/csv; charset=utf-8',
        };

      case 'xlsx':
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('台账详情');
        
        Object.entries(processedLedger).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            worksheet.addRow([key, JSON.stringify(value)]);
          } else {
            worksheet.addRow([key, String(value ?? '')]);
          }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return {
          data: Buffer.from(buffer),
          filename: `ledger_${ledger.ledgerNo}_${timestamp}.xlsx`,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };

      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }
  }
}
