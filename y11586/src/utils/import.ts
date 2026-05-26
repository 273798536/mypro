import fs from 'fs-extra';
import path from 'path';
import pdfParse from 'pdf-parse';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import {
  Contract,
  PaymentNode,
  AcceptanceRecord,
  RefundRecord,
  PaymentTerm,
  DataSource,
  ImportMode,
  Discrepancy,
} from '../types';
import { DataStoreManager } from './store';

export interface ImportResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  failedCount: number;
  errors: { row: number; message: string }[];
  batchId: string;
}

export class DataImporter {
  private store: DataStoreManager;
  private workspace: string;
  private user: string;

  constructor(workspace: string, user: string) {
    this.workspace = workspace;
    this.user = user;
    this.store = new DataStoreManager(workspace);
  }

  async importFromFile(
    filePath: string,
    source: DataSource,
    mode: ImportMode,
    batchName?: string
  ): Promise<ImportResult> {
    const ext = path.extname(filePath).toLowerCase();
    let rawData: any[] = [];
    const errors: { row: number; message: string }[] = [];

    if (ext === '.pdf') {
      rawData = await this.parsePdf(filePath, source);
    } else if (ext === '.csv') {
      rawData = await this.parseCsv(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      rawData = await this.parseExcel(filePath);
    } else if (ext === '.json') {
      rawData = await fs.readJson(filePath);
    } else {
      throw new Error(`不支持的文件格式: ${ext}`);
    }

    const batch = await this.store.addImportBatch({
      name: batchName || `Import ${dayjs().format('YYYY-MM-DD HH:mm')}`,
      source,
      mode,
      fileName: path.basename(filePath),
      importedAt: dayjs().toISOString(),
      importedBy: this.user,
      totalRecords: rawData.length,
      successCount: 0,
      failedCount: 0,
      status: 'processing',
      retryCount: 0,
    });

    let successCount = 0;

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      try {
        await this.importRecord(row, source, mode, batch.id, i + 1);
        successCount++;
      } catch (err: any) {
        errors.push({ row: i + 1, message: err.message });
      }
    }

    await this.store.updateImportBatch(batch.id, {
      successCount,
      failedCount: errors.length,
      status: errors.length === rawData.length ? 'failed_permanent' : 
              errors.length > 0 ? 'failed_manual' : 'completed',
    });

    return {
      success: errors.length === 0,
      totalRecords: rawData.length,
      successCount,
      failedCount: errors.length,
      errors,
      batchId: batch.id,
    };
  }

  private async parsePdf(filePath: string, source: DataSource): Promise<any[]> {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    if (source === 'contract_pdf') {
      return this.parseContractPdfText(text, filePath);
    } else if (source === 'acceptance_email') {
      return this.parseAcceptancePdfText(text, filePath);
    }

    return [];
  }

  private parseContractPdfText(text: string, sourceFile: string): Partial<Contract>[] {
    const contracts: Partial<Contract>[] = [];
    
    const contractNoMatch = text.match(/合同编号[：:]\s*(\S+)/);
    const contractNameMatch = text.match(/合同名称[：:]\s*(.+)/);
    const partyAMatch = text.match(/甲方[：:]\s*(.+)/);
    const partyBMatch = text.match(/乙方[：:]\s*(.+)/);
    const startDateMatch = text.match(/开始日期[：:]\s*(\d{4}-\d{2}-\d{2})/);
    const endDateMatch = text.match(/结束日期[：:]\s*(\d{4}-\d{2}-\d{2})/);
    const totalAmountMatch = text.match(/总金额[：:]\s*([\d,.]+)/);
    const currencyMatch = text.match(/币种[：:]\s*(\S+)/);

    const paymentTerms: PaymentTerm[] = [];
    const termPattern = /第(\d+)期[：:]\s*(.+?)\s*金额[：:]\s*([\d,.]+)\s*截止日期[：:]\s*(\d{4}-\d{2}-\d{2})/g;
    let match;
    while ((match = termPattern.exec(text)) !== null) {
      paymentTerms.push({
        termId: uuidv4(),
        description: match[2],
        dueDate: match[4],
        amount: parseFloat(match[3].replace(/,/g, '')),
        milestone: `第${match[1]}期`,
      });
    }

    contracts.push({
      contractNo: contractNoMatch?.[1] || '',
      contractName: contractNameMatch?.[1] || '',
      partyA: partyAMatch?.[1] || '',
      partyB: partyBMatch?.[1] || '',
      startDate: startDateMatch?.[1] || '',
      endDate: endDateMatch?.[1] || '',
      totalAmount: totalAmountMatch ? parseFloat(totalAmountMatch[1].replace(/,/g, '')) : 0,
      currency: currencyMatch?.[1] || 'CNY',
      paymentTerms,
      sourceFile,
      supplementaryAgreements: [],
      status: 'active',
    });

    return contracts;
  }

  private parseAcceptancePdfText(text: string, sourceFile: string): Partial<AcceptanceRecord>[] {
    const records: Partial<AcceptanceRecord>[] = [];

    const contractNoMatch = text.match(/合同编号[：:]\s*(\S+)/);
    const acceptanceIdMatch = text.match(/验收单号[：:]\s*(\S+)/);
    const acceptanceDateMatch = text.match(/验收日期[：:]\s*(\d{4}-\d{2}-\d{2})/);
    const resultMatch = text.match(/验收结果[：:]\s*(通过|不通过|有条件通过)/);
    const amountMatch = text.match(/验收金额[：:]\s*([\d,.]+)/);
    const acceptorMatch = text.match(/验收人[：:]\s*(.+)/);
    const subjectMatch = text.match(/邮件主题[：:]\s*(.+)/);
    const fromMatch = text.match(/发件人[：:]\s*(.+)/);
    const emailDateMatch = text.match(/邮件日期[：:]\s*(\d{4}-\d{2}-\d{2})/);

    const discrepancies: Discrepancy[] = [];
    const discPattern = /差异项[：:]\s*(.+?)\s*预期[：:]\s*(.+?)\s*实际[：:]\s*(.+?)\s*差异[：:]\s*(.+)/g;
    let match;
    while ((match = discPattern.exec(text)) !== null) {
      discrepancies.push({
        item: match[1],
        expected: match[2],
        actual: match[3],
        difference: match[4],
        resolved: false,
      });
    }

    records.push({
      contractNo: contractNoMatch?.[1] || '',
      acceptanceId: acceptanceIdMatch?.[1] || uuidv4(),
      acceptanceDate: acceptanceDateMatch?.[1] || dayjs().toISOString(),
      acceptanceResult: resultMatch?.[1] === '通过' ? 'passed' : 
                        resultMatch?.[1] === '有条件通过' ? 'conditional' : 'failed',
      acceptedAmount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0,
      acceptor: acceptorMatch?.[1] || '',
      emailSubject: subjectMatch?.[1] || '',
      emailFrom: fromMatch?.[1] || '',
      emailDate: emailDateMatch?.[1] || '',
      sourceFile,
      discrepancies,
    });

    return records;
  }

  private async parseCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  private async parseExcel(filePath: string): Promise<any[]> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  }

  private async importRecord(
    row: any,
    source: DataSource,
    mode: ImportMode,
    batchId: string,
    lineNo: number
  ): Promise<void> {
    switch (source) {
      case 'contract_pdf':
        await this.importContract(row, mode, lineNo);
        break;
      case 'payment_node':
        await this.importPaymentNode(row, mode, batchId, lineNo);
        break;
      case 'acceptance_email':
        await this.importAcceptanceRecord(row, mode, lineNo);
        break;
      case 'refund_record':
        await this.importRefundRecord(row, mode, lineNo);
        break;
    }
  }

  private async importContract(row: any, mode: ImportMode, lineNo: number): Promise<void> {
    const contractNo = row.contractNo || row['合同编号'];
    if (!contractNo) {
      throw new Error('缺少合同编号');
    }

    const existing = await this.store.getContractByNo(contractNo);
    
    const paymentTerms: PaymentTerm[] = row.paymentTerms ? 
      (typeof row.paymentTerms === 'string' ? JSON.parse(row.paymentTerms) : row.paymentTerms) :
      [];

    const contractData: Omit<Contract, keyof any> = {
      contractNo,
      contractName: row.contractName || row['合同名称'] || '',
      partyA: row.partyA || row['甲方'] || '',
      partyB: row.partyB || row['乙方'] || '',
      startDate: row.startDate || row['开始日期'] || '',
      endDate: row.endDate || row['结束日期'] || '',
      totalAmount: parseFloat(row.totalAmount || row['总金额'] || 0),
      currency: row.currency || row['币种'] || 'CNY',
      paymentTerms: paymentTerms.map((t: any) => ({
        termId: t.termId || uuidv4(),
        description: t.description || '',
        dueDate: t.dueDate || '',
        amount: parseFloat(t.amount || 0),
        milestone: t.milestone,
      })),
      sourceFile: row.sourceFile || '',
      originalLineNo: lineNo,
      supplementaryAgreements: row.supplementaryAgreements || [],
      status: 'active',
    };

    if (existing) {
      if (mode === 'ignore') {
        return;
      } else if (mode === 'overwrite') {
        await this.store.updateContract(
          contractNo,
          contractData,
          this.user,
          '批量导入覆盖'
        );
      } else if (mode === 'append') {
        if (row.supplementaryAgreements?.length > 0) {
          const newAgreements = [...existing.supplementaryAgreements, ...row.supplementaryAgreements];
          await this.store.updateContract(
            contractNo,
            { supplementaryAgreements: newAgreements },
            this.user,
            '追加补充协议'
          );
        }
      }
    } else {
      await this.store.addContract(contractData as any, this.user);
    }
  }

  private async importPaymentNode(
    row: any,
    mode: ImportMode,
    batchId: string,
    lineNo: number
  ): Promise<void> {
    const contractNo = row.contractNo || row['合同编号'];
    const nodeId = row.nodeId || row['节点ID'] || uuidv4();
    
    if (!contractNo) {
      throw new Error('缺少合同编号');
    }

    const existing = (await this.store.getPaymentNodesByContract(contractNo))
      .find(n => n.nodeId === nodeId);

    const actualAmountRaw = row.actualAmount ?? row['实际金额'];
    const nodeData: Omit<PaymentNode, keyof any> = {
      contractNo,
      nodeId,
      nodeName: row.nodeName || row['节点名称'] || '',
      plannedDate: row.plannedDate || row['计划日期'] || '',
      actualDate: row.actualDate || row['实际日期'],
      plannedAmount: parseFloat(row.plannedAmount || row['计划金额'] || 0),
      actualAmount: actualAmountRaw !== undefined && actualAmountRaw !== '' ? parseFloat(actualAmountRaw) : undefined,
      status: (row.status || row['状态'] || 'planned') as any,
      sourceFile: row.sourceFile || '',
      originalLineNo: lineNo,
      batchId,
    };

    if (existing && mode === 'overwrite') {
      await this.store.updatePaymentNode(
        nodeId,
        nodeData as any,
        this.user,
        '批量导入覆盖更新付款节点'
      );
    } else if (!existing || mode === 'append') {
      await this.store.addPaymentNode(nodeData as any, this.user);
    }
  }

  private async importAcceptanceRecord(row: any, mode: ImportMode, lineNo: number): Promise<void> {
    const contractNo = row.contractNo || row['合同编号'];
    if (!contractNo) {
      throw new Error('缺少合同编号');
    }

    const discrepancies: Discrepancy[] = row.discrepancies ? 
      (typeof row.discrepancies === 'string' ? JSON.parse(row.discrepancies) : row.discrepancies) :
      [];

    const recordData: Omit<AcceptanceRecord, keyof any> = {
      contractNo,
      acceptanceId: row.acceptanceId || row['验收单号'] || uuidv4(),
      acceptanceDate: row.acceptanceDate || row['验收日期'] || dayjs().toISOString(),
      acceptanceResult: (row.acceptanceResult || row['验收结果'] || 'passed') as any,
      acceptedAmount: parseFloat(row.acceptedAmount || row['验收金额'] || 0),
      acceptor: row.acceptor || row['验收人'] || '',
      emailSubject: row.emailSubject || row['邮件主题'] || '',
      emailFrom: row.emailFrom || row['发件人'] || '',
      emailDate: row.emailDate || row['邮件日期'] || '',
      remarks: row.remarks || row['备注'],
      sourceFile: row.sourceFile || '',
      originalLineNo: lineNo,
      discrepancies: discrepancies.map((d: any) => ({
        item: d.item || '',
        expected: d.expected || '',
        actual: d.actual || '',
        difference: d.difference || '',
        resolved: d.resolved || false,
        resolvedAt: d.resolvedAt,
        resolvedBy: d.resolvedBy,
      })),
    };

    await this.store.addAcceptanceRecord(recordData as any, this.user);
  }

  private async importRefundRecord(row: any, mode: ImportMode, lineNo: number): Promise<void> {
    const contractNo = row.contractNo || row['合同编号'];
    if (!contractNo) {
      throw new Error('缺少合同编号');
    }

    const recordData: Omit<RefundRecord, keyof any> = {
      contractNo,
      refundId: row.refundId || row['退款单号'] || uuidv4(),
      refundDate: row.refundDate || row['退款日期'] || dayjs().toISOString(),
      refundAmount: parseFloat(row.refundAmount || row['退款金额'] || 0),
      refundReason: row.refundReason || row['退款原因'] || '',
      refundMethod: row.refundMethod || row['退款方式'] || '',
      transactionNo: row.transactionNo || row['交易单号'] || '',
      status: (row.status || row['状态'] || 'pending') as any,
      sourceFile: row.sourceFile || '',
      originalLineNo: lineNo,
    };

    await this.store.addRefundRecord(recordData as any, this.user);
  }

  async retryFailedBatches(): Promise<ImportResult[]> {
    const failedBatches = await this.store.getFailedBatches();
    const results: ImportResult[] = [];

    for (const batch of failedBatches) {
      if (batch.status === 'failed_retry' || batch.retryCount < 3) {
        await this.store.updateImportBatch(batch.id, {
          status: 'processing',
          retryCount: batch.retryCount + 1,
        });

        try {
          const filePath = path.join(this.workspace, 'imports', batch.fileName);
          if (await fs.pathExists(filePath)) {
            const result = await this.importFromFile(
              filePath,
              batch.source,
              batch.mode,
              `${batch.name} (重试 ${batch.retryCount + 1})`
            );
            results.push(result);
          }
        } catch (err: any) {
          await this.store.updateImportBatch(batch.id, {
            status: batch.retryCount >= 2 ? 'failed_permanent' : 'failed_retry',
            errorMessage: err.message,
          });
        }
      }
    }

    return results;
  }
}
