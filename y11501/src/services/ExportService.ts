import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { AppDataSource } from '../config/database';
import { DirtyRecord } from '../entities/DirtyRecord';
import { BusinessIssue } from '../entities/BusinessIssue';
import { ImportBatch } from '../entities/ImportBatch';
import { RepairOrder } from '../entities/RepairOrder';
import { SparePartScan } from '../entities/SparePartScan';
import { CustomerReceipt } from '../entities/CustomerReceipt';
import { ManualPriceAdjust } from '../entities/ManualPriceAdjust';
import { ShiftRecord } from '../entities/ShiftRecord';
import { OperationLogService } from './OperationLogService';
import { OperationType } from '../entities/OperationLog';
import { DataSourceType, RecordStatus, DirtyRecordType, BusinessIssueType } from '../types';
import { getDatabaseDir } from '../config/database';

export interface ExportOptions {
  format?: 'xlsx' | 'csv';
  outputDir?: string;
}

export class ExportService {
  private logService: OperationLogService;

  constructor() {
    this.logService = new OperationLogService();
  }

  async exportDirtyRecords(operator: string, options: ExportOptions = {}): Promise<string> {
    const format = options.format || 'xlsx';
    const outputDir = options.outputDir || getDatabaseDir();
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const dirtyRecordRepo = AppDataSource.getRepository(DirtyRecord);
    const records = await dirtyRecordRepo.find({
      order: { createdAt: 'DESC' }
    });

    const fileName = `dirty_records_${new Date().toISOString().slice(0, 10)}.${format}`;
    const filePath = path.join(outputDir, fileName);

    if (format === 'xlsx') {
      await this.exportDirtyRecordsToExcel(records, filePath);
    } else {
      await this.exportDirtyRecordsToCsv(records, filePath);
    }

    await this.logService.log(
      OperationType.EXPORT,
      operator,
      `导出脏记录: ${fileName}`,
      {
        details: { format, recordCount: records.length, filePath }
      }
    );

    return filePath;
  }

  private async exportDirtyRecordsToExcel(records: DirtyRecord[], filePath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('脏记录清单');

    (worksheet as any).columns = [
      { header: '原始行号', key: 'originalRowNumber', width: 12 },
      { header: '数据来源', key: 'sourceType', width: 15 },
      { header: '脏数据类型', key: 'dirtyType', width: 15 },
      { header: '字段名', key: 'fieldName', width: 15 },
      { header: '问题描述', key: 'description', width: 40 },
      { header: '原始值', key: 'originalValue', width: 20 },
      { header: '期望值', key: 'expectedValue', width: 20 },
      { header: '处理建议', key: 'suggestedFix', width: 30 },
      { header: '修复值', key: 'fixedValue', width: 20 },
      { header: '修复人', key: 'fixedBy', width: 12 },
      { header: '修复时间', key: 'fixedAt', width: 20 },
      { header: '状态', key: 'status', width: 12 },
      { header: '原始数据', key: 'originalRowData', width: 50 },
      { header: '发现时间', key: 'createdAt', width: 20 }
    ];

    const sourceTypeMap: Record<string, string> = {
      [DataSourceType.REPAIR_ORDER]: '维修单',
      [DataSourceType.SPARE_PART_SCAN]: '备件扫码',
      [DataSourceType.CUSTOMER_RECEIPT]: '客户签收',
      [DataSourceType.MANUAL_PRICE_ADJUST]: '手工改价',
      [DataSourceType.SHIFT_RECORD]: '班次记录'
    };

    const dirtyTypeMap: Record<string, string> = {
      [DirtyRecordType.MISSING_FIELD]: '缺字段',
      [DirtyRecordType.CROSS_DATE]: '跨日',
      [DirtyRecordType.NAME_CHANGE]: '改名',
      [DirtyRecordType.AMOUNT_CONFLICT]: '金额冲突',
      [DirtyRecordType.QUANTITY_CONFLICT]: '数量冲突'
    };

    for (const record of records) {
      worksheet.addRow({
        originalRowNumber: record.originalRowNumber || '',
        sourceType: sourceTypeMap[record.sourceType] || record.sourceType,
        dirtyType: dirtyTypeMap[record.dirtyType] || record.dirtyType,
        fieldName: record.fieldName || '',
        description: record.description,
        originalValue: record.originalValue || '',
        expectedValue: record.expectedValue || '',
        suggestedFix: record.suggestedFix || '',
        fixedValue: record.fixedValue || '',
        fixedBy: record.fixedBy || '',
        fixedAt: record.fixedAt ? record.fixedAt.toLocaleString() : '',
        status: record.status,
        originalRowData: record.originalRowData || '',
        createdAt: record.createdAt.toLocaleString()
      });
    }

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    await workbook.xlsx.writeFile(filePath);
  }

  private async exportDirtyRecordsToCsv(records: DirtyRecord[], filePath: string): Promise<void> {
    const headers = [
      '原始行号', '数据来源', '脏数据类型', '字段名', '问题描述',
      '原始值', '期望值', '处理建议', '修复值', '修复人',
      '修复时间', '状态', '原始数据', '发现时间'
    ];

    const lines = [headers.join(',')];

    for (const record of records) {
      const line = [
        record.originalRowNumber || '',
        record.sourceType,
        record.dirtyType,
        record.fieldName || '',
        `"${record.description.replace(/"/g, '""')}"`,
        record.originalValue || '',
        record.expectedValue || '',
        `"${(record.suggestedFix || '').replace(/"/g, '""')}"`,
        record.fixedValue || '',
        record.fixedBy || '',
        record.fixedAt ? record.fixedAt.toISOString() : '',
        record.status,
        `"${(record.originalRowData || '').replace(/"/g, '""')}"`,
        record.createdAt.toISOString()
      ].join(',');
      lines.push(line);
    }

    fs.writeFileSync(filePath, '\ufeff' + lines.join('\n'), 'utf-8');
  }

  async exportBusinessIssues(operator: string, options: ExportOptions = {}): Promise<string> {
    const format = options.format || 'xlsx';
    const outputDir = options.outputDir || getDatabaseDir();
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const issueRepo = AppDataSource.getRepository(BusinessIssue);
    const issues = await issueRepo.find({
      order: { createdAt: 'DESC' }
    });

    const fileName = `business_issues_${new Date().toISOString().slice(0, 10)}.${format}`;
    const filePath = path.join(outputDir, fileName);

    if (format === 'xlsx') {
      await this.exportBusinessIssuesToExcel(issues, filePath);
    } else {
      await this.exportBusinessIssuesToCsv(issues, filePath);
    }

    await this.logService.log(
      OperationType.EXPORT,
      operator,
      `导出业务问题: ${fileName}`,
      {
        details: { format, issueCount: issues.length, filePath }
      }
    );

    return filePath;
  }

  private async exportBusinessIssuesToExcel(issues: BusinessIssue[], filePath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('业务问题清单');

    worksheet.columns = [
      { header: '问题类型', key: 'issueType', width: 25 },
      { header: '工单号', key: 'repairOrderNo', width: 15 },
      { header: '工程师', key: 'engineerName', width: 12 },
      { header: '问题描述', key: 'description', width: 50 },
      { header: '处理建议', key: 'handlingSuggestion', width: 30 },
      { header: '处理结果', key: 'handlingResult', width: 30 },
      { header: '处理人', key: 'handledBy', width: 12 },
      { header: '处理时间', key: 'handledAt', width: 20 },
      { header: '状态', key: 'status', width: 12 },
      { header: '发现时间', key: 'createdAt', width: 20 }
    ];

    const issueTypeMap: Record<string, string> = {
      [BusinessIssueType.LATE_ORDER_AFTER_PICKUP]: '先领后补单',
      [BusinessIssueType.RETURN_SCRAP_CONFUSION]: '退回报废混淆'
    };

    for (const issue of issues) {
      worksheet.addRow({
        issueType: issueTypeMap[issue.issueType] || issue.issueType,
        repairOrderNo: issue.repairOrderNo || '',
        engineerName: issue.engineerName || '',
        description: issue.description,
        handlingSuggestion: issue.handlingSuggestion || '',
        handlingResult: issue.handlingResult || '',
        handledBy: issue.handledBy || '',
        handledAt: issue.handledAt ? issue.handledAt.toLocaleString() : '',
        status: issue.status,
        createdAt: issue.createdAt.toLocaleString()
      });
    }

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    await workbook.xlsx.writeFile(filePath);
  }

  private async exportBusinessIssuesToCsv(issues: BusinessIssue[], filePath: string): Promise<void> {
    const headers = [
      '问题类型', '工单号', '工程师', '问题描述', '处理建议',
      '处理结果', '处理人', '处理时间', '状态', '发现时间'
    ];

    const lines = [headers.join(',')];

    for (const issue of issues) {
      const line = [
        issue.issueType,
        issue.repairOrderNo || '',
        issue.engineerName || '',
        `"${issue.description.replace(/"/g, '""')}"`,
        `"${(issue.handlingSuggestion || '').replace(/"/g, '""')}"`,
        `"${(issue.handlingResult || '').replace(/"/g, '""')}"`,
        issue.handledBy || '',
        issue.handledAt ? issue.handledAt.toISOString() : '',
        issue.status,
        issue.createdAt.toISOString()
      ].join(',');
      lines.push(line);
    }

    fs.writeFileSync(filePath, '\ufeff' + lines.join('\n'), 'utf-8');
  }

  async exportSourceData(
    sourceType: DataSourceType,
    operator: string,
    options: ExportOptions & { batchId?: string } = {}
  ): Promise<string> {
    const format = options.format || 'xlsx';
    const outputDir = options.outputDir || getDatabaseDir();
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `${sourceType}_data_${new Date().toISOString().slice(0, 10)}.${format}`;
    const filePath = path.join(outputDir, fileName);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('数据');

    let records: any[] = [];
    let columns: any[] = [];

    switch (sourceType) {
      case DataSourceType.REPAIR_ORDER:
        records = await AppDataSource.getRepository(RepairOrder).find({
          ...(options.batchId ? { where: { importBatchId: options.batchId } } : {}),
          order: { createdAt: 'DESC' }
        });
        columns = [
          { header: '原始行号', key: 'originalRowNumber', width: 12 },
          { header: '工单号', key: 'orderNo', width: 15 },
          { header: '工程师', key: 'engineerName', width: 12 },
          { header: '工单日期', key: 'orderDate', width: 20 },
          { header: '客户姓名', key: 'customerName', width: 12 },
          { header: '客户电话', key: 'customerPhone', width: 15 },
          { header: '故障描述', key: 'faultDescription', width: 30 },
          { header: '总金额', key: 'totalAmount', width: 12 },
          { header: '状态', key: 'status', width: 12 },
          { header: '导入批次', key: 'importBatchId', width: 20 }
        ];
        break;

      case DataSourceType.SPARE_PART_SCAN:
        records = await AppDataSource.getRepository(SparePartScan).find({
          ...(options.batchId ? { where: { importBatchId: options.batchId } } : {}),
          order: { createdAt: 'DESC' }
        });
        columns = [
          { header: '原始行号', key: 'originalRowNumber', width: 12 },
          { header: '扫码单号', key: 'scanNo', width: 15 },
          { header: '工单号', key: 'repairOrderNo', width: 15 },
          { header: '备件编码', key: 'partCode', width: 15 },
          { header: '备件名称', key: 'partName', width: 20 },
          { header: '数量', key: 'quantity', width: 8 },
          { header: '操作类型', key: 'actionType', width: 10 },
          { header: '工程师', key: 'engineerName', width: 12 },
          { header: '扫码时间', key: 'scanTime', width: 20 },
          { header: '单价', key: 'unitPrice', width: 12 },
          { header: '状态', key: 'status', width: 12 }
        ];
        break;

      case DataSourceType.CUSTOMER_RECEIPT:
        records = await AppDataSource.getRepository(CustomerReceipt).find({
          ...(options.batchId ? { where: { importBatchId: options.batchId } } : {}),
          order: { createdAt: 'DESC' }
        });
        columns = [
          { header: '原始行号', key: 'originalRowNumber', width: 12 },
          { header: '签收单号', key: 'receiptNo', width: 15 },
          { header: '工单号', key: 'repairOrderNo', width: 15 },
          { header: '客户姓名', key: 'customerName', width: 12 },
          { header: '签收时间', key: 'receiptTime', width: 20 },
          { header: '照片URL', key: 'photoUrl', width: 30 },
          { header: '备注', key: 'remark', width: 20 },
          { header: '状态', key: 'status', width: 12 }
        ];
        break;

      case DataSourceType.MANUAL_PRICE_ADJUST:
        records = await AppDataSource.getRepository(ManualPriceAdjust).find({
          ...(options.batchId ? { where: { importBatchId: options.batchId } } : {}),
          order: { createdAt: 'DESC' }
        });
        columns = [
          { header: '原始行号', key: 'originalRowNumber', width: 12 },
          { header: '改价单号', key: 'adjustNo', width: 15 },
          { header: '工单号', key: 'repairOrderNo', width: 15 },
          { header: '备件编码', key: 'partCode', width: 15 },
          { header: '原价', key: 'originalPrice', width: 12 },
          { header: '调整价', key: 'adjustedPrice', width: 12 },
          { header: '改价原因', key: 'adjustReason', width: 30 },
          { header: '审批人', key: 'approvedBy', width: 12 },
          { header: '改价日期', key: 'adjustDate', width: 20 },
          { header: '状态', key: 'status', width: 12 }
        ];
        break;

      case DataSourceType.SHIFT_RECORD:
        records = await AppDataSource.getRepository(ShiftRecord).find({
          ...(options.batchId ? { where: { importBatchId: options.batchId } } : {}),
          order: { createdAt: 'DESC' }
        });
        columns = [
          { header: '原始行号', key: 'originalRowNumber', width: 12 },
          { header: '班次编号', key: 'shiftNo', width: 15 },
          { header: '工程师', key: 'engineerName', width: 12 },
          { header: '班次类型', key: 'shiftType', width: 12 },
          { header: '班次日期', key: 'shiftDate', width: 12 },
          { header: '签到时间', key: 'checkInTime', width: 20 },
          { header: '签退时间', key: 'checkOutTime', width: 20 },
          { header: '备注', key: 'remark', width: 20 },
          { header: '状态', key: 'status', width: 12 }
        ];
        break;
    }

    (worksheet as any).columns = columns;

    for (const record of records) {
      const rowData: any = { ...record };
      for (const col of columns) {
        if (col.key && rowData[col.key] instanceof Date) {
          rowData[col.key] = rowData[col.key].toLocaleString();
        }
      }
      worksheet.addRow(rowData);
    }

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    await workbook.xlsx.writeFile(filePath);

    await this.logService.log(
      OperationType.EXPORT,
      operator,
      `导出源数据: ${fileName}`,
      {
        details: { sourceType, format, recordCount: records.length, filePath }
      }
    );

    return filePath;
  }

  async exportReport(operator: string, options: ExportOptions = {}): Promise<string> {
    const format = options.format || 'xlsx';
    const outputDir = options.outputDir || getDatabaseDir();
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `inspection_report_${new Date().toISOString().slice(0, 10)}.${format}`;
    const filePath = path.join(outputDir, fileName);

    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet('汇总概览');
    (summarySheet as any).columns = [
      { header: '统计项', key: 'item', width: 30 },
      { header: '数值', key: 'value', width: 15 },
      { header: '说明', key: 'remark', width: 40 }
    ];

    const batchCount = await AppDataSource.getRepository(ImportBatch).count();
    const repairOrderCount = await AppDataSource.getRepository(RepairOrder).count();
    const sparePartScanCount = await AppDataSource.getRepository(SparePartScan).count();
    const customerReceiptCount = await AppDataSource.getRepository(CustomerReceipt).count();
    const manualPriceAdjustCount = await AppDataSource.getRepository(ManualPriceAdjust).count();
    const shiftRecordCount = await AppDataSource.getRepository(ShiftRecord).count();
    const dirtyRecordCount = await AppDataSource.getRepository(DirtyRecord).count();
    const dirtyFixedCount = await AppDataSource.getRepository(DirtyRecord).count({ where: { status: RecordStatus.FIXED } });
    const businessIssueCount = await AppDataSource.getRepository(BusinessIssue).count();

    const summaryData = [
      { item: '导入批次总数', value: batchCount, remark: '' },
      { item: '维修单记录数', value: repairOrderCount, remark: '' },
      { item: '备件扫码记录数', value: sparePartScanCount, remark: '' },
      { item: '客户签收记录数', value: customerReceiptCount, remark: '' },
      { item: '手工改价记录数', value: manualPriceAdjustCount, remark: '' },
      { item: '班次记录数', value: shiftRecordCount, remark: '' },
      { item: '脏记录总数', value: dirtyRecordCount, remark: '' },
      { item: '已修复脏记录数', value: dirtyFixedCount, remark: '' },
      { item: '待修复脏记录数', value: dirtyRecordCount - dirtyFixedCount, remark: '' },
      { item: '业务问题总数', value: businessIssueCount, remark: '' }
    ];

    for (const row of summaryData) {
      summarySheet.addRow(row);
    }

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    const failedRecords = await AppDataSource.getRepository(DirtyRecord).find({
      where: { status: RecordStatus.DIRTY },
      take: 100,
      order: { createdAt: 'DESC' }
    });

    if (failedRecords.length > 0) {
      const failedSheet = workbook.addWorksheet('失败清单');
      (failedSheet as any).columns = [
        { header: '原始行号', key: 'originalRowNumber', width: 12 },
        { header: '数据来源', key: 'sourceType', width: 15 },
        { header: '问题类型', key: 'dirtyType', width: 15 },
        { header: '字段', key: 'fieldName', width: 15 },
        { header: '问题描述', key: 'description', width: 40 },
        { header: '处理建议', key: 'suggestedFix', width: 30 },
        { header: '原始数据', key: 'originalRowData', width: 50 }
      ];

      for (const record of failedRecords) {
        failedSheet.addRow({
          originalRowNumber: record.originalRowNumber || '',
          sourceType: record.sourceType,
          dirtyType: record.dirtyType,
          fieldName: record.fieldName || '',
          description: record.description,
          suggestedFix: record.suggestedFix || '',
          originalRowData: record.originalRowData || ''
        });
      }

      failedSheet.getRow(1).font = { bold: true };
      failedSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE0E0' }
      };
    }

    await workbook.xlsx.writeFile(filePath);

    await this.logService.log(
      OperationType.EXPORT,
      operator,
      `导出巡检报告: ${fileName}`,
      {
        details: { format, filePath }
      }
    );

    return filePath;
  }
}
