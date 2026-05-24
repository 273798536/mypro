import fs from 'fs-extra';
import path from 'path';
import { Parser } from 'json2csv';
import dayjs from 'dayjs';
import { DataStoreManager } from './store';
import { CheckResult, Contract, PaymentNode, ImportBatch, StatusChangeLog } from '../types';

export type ExportFormat = 'json' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  outputDir: string;
  includeRaw?: boolean;
}

export class DataExporter {
  private store: DataStoreManager;
  private workspace: string;

  constructor(workspace: string) {
    this.workspace = workspace;
    this.store = new DataStoreManager(workspace);
  }

  async exportCheckReport(options: ExportOptions, batchId?: string): Promise<string> {
    const checks = await this.store.getCheckResults(batchId);
    const failedChecks = checks.filter(c => !c.resolved);
    
    const data = failedChecks.map(c => ({
      原始行号: c.originalLineNo || '-',
      合同编号: c.contractNo,
      检查类型: c.checkType,
      严重程度: c.severity,
      问题描述: c.message,
      字段: c.sourceField || '-',
      期望值: this.formatValue(c.expectedValue),
      实际值: this.formatValue(c.actualValue),
      批次ID: c.batchId,
    }));

    const fileName = `check-report-${dayjs().format('YYYYMMDD-HHmmss')}`;
    return this.writeExport(data, fileName, options);
  }

  async exportContractDetails(contractNo: string, options: ExportOptions): Promise<string> {
    const contract = await this.store.getContractByNo(contractNo);
    if (!contract) {
      throw new Error(`合同不存在: ${contractNo}`);
    }

    const paymentNodes = await this.store.getPaymentNodesByContract(contractNo);
    const changeLogs = await this.store.getChangeLogs(contract.id);

    const data = {
      合同基本信息: {
        合同编号: contract.contractNo,
        合同名称: contract.contractName,
        甲方: contract.partyA,
        乙方: contract.partyB,
        开始日期: contract.startDate,
        结束日期: contract.endDate,
        总金额: contract.totalAmount,
        币种: contract.currency,
        状态: contract.status,
        版本: contract.version,
        补充协议数量: contract.supplementaryAgreements.length,
      },
      付款节点: paymentNodes.map(n => ({
        节点ID: n.nodeId,
        节点名称: n.nodeName,
        计划日期: n.plannedDate,
        实际日期: n.actualDate || '-',
        计划金额: n.plannedAmount,
        实际金额: n.actualAmount || '-',
        状态: n.status,
        原始行号: n.originalLineNo || '-',
      })),
      变更历史: changeLogs.map(l => ({
        变更时间: l.changedAt,
        操作人: l.changedBy,
        变更字段: l.field,
        原值: this.formatValue(l.oldValue),
        新值: this.formatValue(l.newValue),
        变更原因: l.reason,
      })),
    };

    const fileName = `contract-${contractNo}-${dayjs().format('YYYYMMDD-HHmmss')}`;
    return this.writeExport(data, fileName, options);
  }

  async exportImportHistory(options: ExportOptions): Promise<string> {
    const batches = await this.store.getImportBatches();
    
    const data = batches.map(b => ({
      批次ID: b.id,
      批次名称: b.name,
      数据来源: b.source,
      导入模式: b.mode,
      文件名: b.fileName,
      导入时间: b.importedAt,
      操作人: b.importedBy,
      总记录数: b.totalRecords,
      成功数: b.successCount,
      失败数: b.failedCount,
      状态: b.status,
      重试次数: b.retryCount,
      错误信息: b.errorMessage || '-',
    }));

    const fileName = `import-history-${dayjs().format('YYYYMMDD-HHmmss')}`;
    return this.writeExport(data, fileName, options);
  }

  async exportFullData(options: ExportOptions): Promise<string> {
    const store = await this.store.load();
    
    const data = {
      导出时间: dayjs().toISOString(),
      合同数量: store.contracts.filter(c => !c.isDeleted).length,
      付款节点数量: store.paymentNodes.filter(n => !n.isDeleted).length,
      验收记录数量: store.acceptanceRecords.filter(r => !r.isDeleted).length,
      退款记录数量: store.refundRecords.filter(r => !r.isDeleted).length,
      导入批次数量: store.importBatches.length,
      原始数据: options.includeRaw ? store : '未包含原始数据',
    };

    const fileName = `full-export-${dayjs().format('YYYYMMDD-HHmmss')}`;
    return this.writeExport(data, fileName, options);
  }

  private formatValue(value: any): string {
    if (value === undefined || value === null) {
      return '-';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private async writeExport(data: any, fileName: string, options: ExportOptions): Promise<string> {
    await fs.ensureDir(options.outputDir);
    const filePath = path.join(options.outputDir, `${fileName}.${options.format}`);

    if (options.format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(Array.isArray(data) ? data : [data]);
      await fs.writeFile(filePath, csv, 'utf8');
    } else {
      await fs.writeJson(filePath, data, { spaces: 2 });
    }

    return filePath;
  }
}
