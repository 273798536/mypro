import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import {
  SampleRepository,
  SizeModificationRepository,
  FabricTransactionRepository,
  RefundRepository,
  CheckRepository,
  AuditRepository
} from '../db';
import { CheckResult, ImportError, AuditLog } from '../types';

export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'json';
  outputDir?: string;
  includeSource?: boolean;
  includeHistory?: boolean;
}

export class ExportService {
  private sampleRepo: SampleRepository;
  private sizeRepo: SizeModificationRepository;
  private fabricTxRepo: FabricTransactionRepository;
  private refundRepo: RefundRepository;
  private checkRepo: CheckRepository;
  private auditRepo: AuditRepository;

  constructor(
    sampleRepo: SampleRepository,
    sizeRepo: SizeModificationRepository,
    fabricTxRepo: FabricTransactionRepository,
    refundRepo: RefundRepository,
    checkRepo: CheckRepository,
    auditRepo: AuditRepository
  ) {
    this.sampleRepo = sampleRepo;
    this.sizeRepo = sizeRepo;
    this.fabricTxRepo = fabricTxRepo;
    this.refundRepo = refundRepo;
    this.checkRepo = checkRepo;
    this.auditRepo = auditRepo;
  }

  async exportAll(options: ExportOptions): Promise<string[]> {
    const exportedFiles: string[] = [];
    const outputDir = options.outputDir || process.cwd();

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    exportedFiles.push(await this.exportSampleFlow(options, outputDir));
    exportedFiles.push(await this.exportSizeModification(options, outputDir));
    exportedFiles.push(await this.exportFabricTransactions(options, outputDir));
    exportedFiles.push(await this.exportRefunds(options, outputDir));
    exportedFiles.push(await this.exportCheckResults(options, outputDir));

    if (options.includeHistory) {
      exportedFiles.push(await this.exportAuditLogs(options, outputDir));
    }

    return exportedFiles.filter(f => f);
  }

  async exportSampleFlow(options: ExportOptions, outputDir?: string): Promise<string> {
    const samples = this.sampleRepo.findMany({
      where: { is_latest: 1 },
      orderBy: 'sample_no',
      orderDirection: 'ASC'
    }) as any[];

    const data = samples.map(s => ({
      原始行号: s.sourceRowNumber,
      样衣编号: s.sampleNo,
      款号: s.styleNo,
      款名: s.styleName || '',
      品牌: s.brand || '',
      季节: s.season || '',
      样衣类型: s.sampleType,
      状态: s.status,
      押金金额: s.depositAmount,
      货币: s.depositCurrency,
      押金支付时间: s.depositPaidAt || '',
      押金退还时间: s.depositRefundedAt || '',
      退还金额: s.depositRefundAmount ?? '',
      负责人: s.assignedTo || '',
      打版师: s.patternMaker || '',
      裁剪师: s.cutter || '',
      缝纫师: s.sewer || '',
      版本: s.version,
      创建时间: s.createdAt,
      更新时间: s.updatedAt,
      ...(options.includeSource ? {
        导入批次: s.importSource?.importBatchId || '',
        导入文件: s.importSource?.fileName || '',
        导入时间: s.importSource?.importTime || ''
      } : {})
    }));

    return this.writeFile(data, 'sample_flow', options, outputDir);
  }

  async exportSizeModification(options: ExportOptions, outputDir?: string): Promise<string> {
    const modifications = this.sizeRepo.findMany({
      where: { is_latest: 1 },
      orderBy: 'modification_no',
      orderDirection: 'ASC'
    }) as any[];

    const data = modifications.map(m => ({
      原始行号: m.sourceRowNumber,
      修改单号: m.modificationNo,
      样衣编号: m.sampleNo,
      款号: m.styleNo,
      修改原因: m.modificationReason || '',
      申请人: m.requestedBy,
      申请时间: m.requestedAt,
      审批人: m.approvedBy || '',
      审批时间: m.approvedAt || '',
      状态: m.status,
      优先级: m.priority,
      影响面料: (m.affectedFabrics || []).join(', '),
      预估影响: m.estimatedImpact || '',
      版本: m.version,
      创建时间: m.createdAt,
      更新时间: m.updatedAt,
      ...(options.includeSource ? {
        导入批次: m.importSource?.importBatchId || '',
        导入文件: m.importSource?.fileName || '',
        导入时间: m.importSource?.importTime || ''
      } : {})
    }));

    return this.writeFile(data, 'size_modification', options, outputDir);
  }

  async exportFabricTransactions(options: ExportOptions, outputDir?: string): Promise<string> {
    const transactions = this.fabricTxRepo.findMany({
      where: { is_latest: 1 },
      orderBy: 'transaction_time',
      orderDirection: 'DESC'
    }) as any[];

    const data = transactions.map(t => ({
      原始行号: t.sourceRowNumber,
      流水号: t.transactionNo,
      面料编码: t.fabricCode,
      类型: t.type,
      数量: t.quantity,
      单位: t.unit,
      单价: t.unitPrice ?? '',
      金额: t.totalAmount ?? '',
      关联样衣: t.relatedSampleNo || '',
      关联款号: t.relatedStyleNo || '',
      关联部门: t.relatedDepartment || '',
      操作人: t.operator,
      操作时间: t.transactionTime,
      仓库: t.warehouse,
      库位: t.location || '',
      备注: t.remarks || '',
      参考单号: t.referenceNo || '',
      版本: t.version,
      创建时间: t.createdAt,
      更新时间: t.updatedAt,
      ...(options.includeSource ? {
        导入批次: t.importSource?.importBatchId || '',
        导入文件: t.importSource?.fileName || '',
        导入时间: t.importSource?.importTime || ''
      } : {})
    }));

    return this.writeFile(data, 'fabric_transactions', options, outputDir);
  }

  async exportRefunds(options: ExportOptions, outputDir?: string): Promise<string> {
    const refunds = this.refundRepo.findMany({
      where: { is_latest: 1 },
      orderBy: 'applied_at',
      orderDirection: 'DESC'
    }) as any[];

    const data = refunds.map(r => ({
      原始行号: r.sourceRowNumber,
      退款单号: r.refundNo,
      关联样衣: r.relatedSampleNo || '',
      关联款号: r.relatedStyleNo || '',
      关联合同: r.relatedContractNo || '',
      类型: r.type,
      状态: r.status,
      原始金额: r.originalAmount,
      退款金额: r.refundAmount,
      货币: r.currency,
      申请人: r.applicant,
      申请部门: r.applicantDepartment,
      申请时间: r.appliedAt,
      审批人: r.approvedBy || '',
      审批时间: r.approvedAt || '',
      支付人: r.paidBy || '',
      支付时间: r.paidAt || '',
      支付方式: r.paymentMethod || '',
      支付参考: r.paymentReference || '',
      原因: r.reason,
      备注: r.remarks || '',
      版本: r.version,
      创建时间: r.createdAt,
      更新时间: r.updatedAt,
      ...(options.includeSource ? {
        导入批次: r.importSource?.importBatchId || '',
        导入文件: r.importSource?.fileName || '',
        导入时间: r.importSource?.importTime || ''
      } : {})
    }));

    return this.writeFile(data, 'refunds', options, outputDir);
  }

  async exportCheckResults(options: ExportOptions, outputDir?: string): Promise<string> {
    const checks = this.checkRepo.findAll(true);

    const data = checks.map(c => ({
      检查ID: c.checkId,
      类型: c.type,
      严重程度: c.severity,
      消息: c.message,
      状态: c.fixed ? '已修复' : '待处理',
      修复人: c.fixedBy || '',
      修复时间: c.fixedAt || '',
      关联实体: c.relatedEntities.map(e => `${e.type}:${e.id}`).join('; '),
      详情: JSON.stringify(c.details, null, 2),
      创建时间: c.createdAt
    }));

    return this.writeFile(data, 'check_results', options, outputDir);
  }

  async exportAuditLogs(options: ExportOptions, outputDir?: string): Promise<string> {
    const logs = this.auditRepo.find({});

    const data = logs.map(l => ({
      时间: l.timestamp,
      操作人: l.actor,
      动作: l.action,
      实体类型: l.entityType,
      实体ID: l.entityId,
      变更详情: l.changes ? JSON.stringify(l.changes, null, 2) : '',
      元数据: l.metadata ? JSON.stringify(l.metadata, null, 2) : '',
      IP地址: l.ipAddress || '',
      UserAgent: l.userAgent || ''
    }));

    return this.writeFile(data, 'audit_logs', options, outputDir);
  }

  async exportFailedImports(
    errors: ImportError[],
    batchId: string,
    options: ExportOptions,
    outputDir?: string
  ): Promise<string> {
    const data = errors.map(e => ({
      批次号: batchId,
      原始行号: e.rowNumber,
      字段: e.field || '',
      错误信息: e.message,
      错误代码: e.code,
      原始数据: e.data ? JSON.stringify(e.data, null, 2) : ''
    }));

    return this.writeFile(data, `import_errors_${batchId}`, options, outputDir);
  }

  async exportSampleHistory(
    sampleNo: string,
    options: ExportOptions,
    outputDir?: string
  ): Promise<string> {
    const versions = this.sampleRepo.findBySampleNo(sampleNo, false);
    const sizeMods = this.sizeRepo.findBySampleNo(sampleNo, false);
    const fabricTxs = this.fabricTxRepo.findBySampleNo(sampleNo, false);
    const refunds = this.refundRepo.findBySampleNo(sampleNo, false);
    const auditLogs = this.auditRepo.findByEntity('sample_flow', sampleNo);

    const data: Record<string, any> = {
      样衣编号: sampleNo,
      版本数: versions.length,
      尺码修改数: sizeMods.length,
      面料交易数: fabricTxs.length,
      退款记录数: refunds.length,
      操作日志数: auditLogs.length
    };

    return this.writeFile([data], `sample_history_${sampleNo}`, options, outputDir);
  }

  private writeFile(
    data: Record<string, any>[],
    baseName: string,
    options: ExportOptions,
    outputDir?: string
  ): string {
    const dir = outputDir || options.outputDir || process.cwd();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${baseName}_${timestamp}`;

    switch (options.format) {
      case 'xlsx':
        return this.writeExcel(data, dir, fileName);
      case 'csv':
        return this.writeCsv(data, dir, fileName);
      case 'json':
        return this.writeJson(data, dir, fileName);
      default:
        return this.writeExcel(data, dir, fileName);
    }
  }

  private writeExcel(data: Record<string, any>[], dir: string, fileName: string): string {
    const filePath = path.join(dir, `${fileName}.xlsx`);
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Data');
    xlsx.writeFile(wb, filePath);
    return filePath;
  }

  private writeCsv(data: Record<string, any>[], dir: string, fileName: string): string {
    const filePath = path.join(dir, `${fileName}.csv`);
    
    if (data.length === 0) {
      fs.writeFileSync(filePath, '');
      return filePath;
    }

    const headers = Object.keys(data[0]);
    const headerLine = headers.join(',');
    
    const lines = data.map(row => 
      headers.map(h => {
        const value = row[h];
        const str = value === null || value === undefined ? '' : String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    );

    const content = [headerLine, ...lines].join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  private writeJson(data: Record<string, any>[], dir: string, fileName: string): string {
    const filePath = path.join(dir, `${fileName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return filePath;
  }
}
