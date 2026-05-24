import { Repository } from 'typeorm';
import { Receipt, StockSnapshot, ExceptionRecord } from '../entities';
import { ReceiptStatus, DataSource } from '../types';
import * as ExcelJS from 'exceljs';
import * as csv from 'csv-writer';
import * as path from 'path';
import * as fs from 'fs';
import * as _ from 'lodash';
import { STATUS_LABELS } from './StateMachineService';

export interface ReportFilter {
  city?: string;
  startDate?: Date;
  endDate?: Date;
  status?: ReceiptStatus;
  isFrozen?: boolean;
  hasUnresolvedExceptions?: boolean;
}

export interface SummaryReport {
  totalReceipts: number;
  byStatus: Record<string, number>;
  byCity: Record<string, number>;
  totalStockBefore: number;
  totalRestockAmount: number;
  totalStockAfter: number;
  totalRefundAmount: number;
  totalExceptions: number;
  unresolvedExceptions: number;
  frozenReceipts: number;
}

export class ReportService {
  private receiptRepository: Repository<Receipt>;
  private stockSnapshotRepository: Repository<StockSnapshot>;
  private exceptionRepository: Repository<ExceptionRecord>;
  private exportDir: string;

  constructor(
    receiptRepository: Repository<Receipt>,
    stockSnapshotRepository: Repository<StockSnapshot>,
    exceptionRepository: Repository<ExceptionRecord>
  ) {
    this.receiptRepository = receiptRepository;
    this.stockSnapshotRepository = stockSnapshotRepository;
    this.exceptionRepository = exceptionRepository;
    this.exportDir = path.resolve(process.cwd(), 'exports');
    this.ensureExportDir();
  }

  private ensureExportDir(): void {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async getSummaryReport(filter: ReportFilter): Promise<SummaryReport> {
    const receipts = await this.getFilteredReceipts(filter);

    const validReceipts = receipts.filter(r => {
      const invalidExceptions = r.exceptions?.filter(e => e.affectsSummary && !e.resolved);
      return !invalidExceptions || invalidExceptions.length === 0;
    });

    const byStatus = _.countBy(validReceipts, 'status');
    const byCity = _.countBy(validReceipts, 'city');

    return {
      totalReceipts: validReceipts.length,
      byStatus: Object.keys(byStatus).reduce((acc, key) => {
        acc[STATUS_LABELS[key as ReceiptStatus] || key] = byStatus[key];
        return acc;
      }, {} as Record<string, number>),
      byCity,
      totalStockBefore: _.sumBy(validReceipts, 'totalStockBefore'),
      totalRestockAmount: _.sumBy(validReceipts, 'totalRestockAmount'),
      totalStockAfter: _.sumBy(validReceipts, 'totalStockAfter'),
      totalRefundAmount: _.sumBy(validReceipts, 'totalRefundAmount'),
      totalExceptions: _.sumBy(receipts, 'exceptionCount'),
      unresolvedExceptions: receipts.filter(r => r.hasUnresolvedExceptions).length,
      frozenReceipts: receipts.filter(r => r.isFrozen).length
    };
  }

  async getDetailedReport(filter: ReportFilter): Promise<{
    receipts: Array<{
      id: string;
      batchNo: string;
      cabinetId: string;
      cabinetName: string;
      city: string;
      status: string;
      statusLabel: string;
      isFrozen: boolean;
      frozenAt?: Date;
      frozenBy?: string;
      freezeReason?: string;
      manualReason?: string;
      totalStockBefore: number;
      totalRestockAmount: number;
      totalStockAfter: number;
      totalRefundAmount: number;
      exceptionCount: number;
      hasUnresolvedExceptions: boolean;
      previousStatus?: string;
      statusChangedAt?: Date;
      statusChangeReason?: string;
      createdByName: string;
      createdAt: Date;
      settledAt?: Date;
    }>;
    dataHash: string;
  }> {
    const receipts = await this.getFilteredReceipts(filter, true);

    const data = receipts.map(r => ({
      id: r.id,
      batchNo: r.batchNo,
      cabinetId: r.cabinetId,
      cabinetName: r.cabinetName,
      city: r.city,
      status: r.status,
      statusLabel: STATUS_LABELS[r.status],
      isFrozen: r.isFrozen,
      frozenAt: r.frozenAt,
      frozenBy: r.frozenBy,
      freezeReason: r.freezeReason,
      manualReason: r.manualReason,
      totalStockBefore: r.totalStockBefore,
      totalRestockAmount: r.totalRestockAmount,
      totalStockAfter: r.totalStockAfter,
      totalRefundAmount: r.totalRefundAmount,
      exceptionCount: r.exceptionCount,
      hasUnresolvedExceptions: r.hasUnresolvedExceptions,
      previousStatus: r.previousStatus,
      statusChangedAt: r.statusChangedAt,
      statusChangeReason: r.statusChangeReason,
      createdByName: r.createdByName,
      createdAt: r.createdAt,
      settledAt: r.settledAt
    }));

    const dataHash = this.generateDataHash(data);

    return { receipts: data, dataHash };
  }

  async exportToExcel(filter: ReportFilter): Promise<string> {
    const { receipts, dataHash } = await this.getDetailedReport(filter);
    const summary = await this.getSummaryReport(filter);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '智能柜补货异常回执状态机';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('汇总');
    this.populateSummarySheet(summarySheet, summary, dataHash);

    const detailSheet = workbook.addWorksheet('明细');
    this.populateDetailSheet(detailSheet, receipts);

    const exceptionSheet = workbook.addWorksheet('异常记录');
    await this.populateExceptionSheet(exceptionSheet, filter);

    const fileName = `回执报表_${new Date().toISOString().slice(0, 10)}_${dataHash.slice(0, 8)}.xlsx`;
    const filePath = path.join(this.exportDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }

  async exportToCsv(filter: ReportFilter): Promise<string> {
    const { receipts, dataHash } = await this.getDetailedReport(filter);

    const fileName = `回执报表_${new Date().toISOString().slice(0, 10)}_${dataHash.slice(0, 8)}.csv`;
    const filePath = path.join(this.exportDir, fileName);

    const writer = csv.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'batchNo', title: '批次号' },
        { id: 'cabinetId', title: '柜机ID' },
        { id: 'cabinetName', title: '柜机名称' },
        { id: 'city', title: '城市' },
        { id: 'statusLabel', title: '状态' },
        { id: 'isFrozen', title: '是否冻结' },
        { id: 'freezeReason', title: '冻结原因' },
        { id: 'manualReason', title: '人工理由' },
        { id: 'totalStockBefore', title: '补货前库存' },
        { id: 'totalRestockAmount', title: '补货数量' },
        { id: 'totalStockAfter', title: '补货后库存' },
        { id: 'totalRefundAmount', title: '退款金额' },
        { id: 'exceptionCount', title: '异常数量' },
        { id: 'statusChangeReason', title: '状态变更原因' },
        { id: 'createdByName', title: '创建人' },
        { id: 'createdAt', title: '创建时间' },
        { id: 'dataHash', title: '数据校验码' }
      ]
    });

    const records = receipts.map(r => ({
      ...r,
      isFrozen: r.isFrozen ? '是' : '否',
      createdAt: r.createdAt.toISOString(),
      dataHash
    }));

    await writer.writeRecords(records);

    return filePath;
  }

  async verifyExportConsistency(receiptId: string, exportHash: string): Promise<boolean> {
    const receipt = await this.receiptRepository.findOne({
      where: { id: receiptId },
      relations: ['stockSnapshots', 'exceptions']
    });

    if (!receipt) return false;

    const currentHash = this.generateDataHash([{
      id: receipt.id,
      batchNo: receipt.batchNo,
      totalStockBefore: receipt.totalStockBefore,
      totalRestockAmount: receipt.totalRestockAmount,
      totalStockAfter: receipt.totalStockAfter,
      exceptionCount: receipt.exceptionCount,
      status: receipt.status
    }]);

    return currentHash === exportHash;
  }

  private async getFilteredReceipts(filter: ReportFilter, withRelations = false): Promise<Receipt[]> {
    const where: any = {};
    
    if (filter.city) where.city = filter.city;
    if (filter.status) where.status = filter.status;
    if (filter.isFrozen !== undefined) where.isFrozen = filter.isFrozen;
    if (filter.hasUnresolvedExceptions !== undefined) {
      where.hasUnresolvedExceptions = filter.hasUnresolvedExceptions;
    }

    const query = this.receiptRepository
      .createQueryBuilder('receipt')
      .where(where);

    if (filter.startDate) {
      query.andWhere('receipt.createdAt >= :startDate', { startDate: filter.startDate });
    }
    if (filter.endDate) {
      query.andWhere('receipt.createdAt <= :endDate', { endDate: filter.endDate });
    }

    if (withRelations) {
      query.leftJoinAndSelect('receipt.exceptions', 'exceptions');
    }

    query.orderBy('receipt.createdAt', 'DESC');

    return query.getMany();
  }

  private populateSummarySheet(sheet: ExcelJS.Worksheet, summary: SummaryReport, dataHash: string): void {
    sheet.columns = [
      { header: '指标', key: 'metric', width: 30 },
      { header: '数值', key: 'value', width: 20 }
    ];

    const rows = [
      { metric: '回执总数', value: summary.totalReceipts },
      { metric: '冻结回执数', value: summary.frozenReceipts },
      { metric: '异常总数', value: summary.totalExceptions },
      { metric: '未解决异常数', value: summary.unresolvedExceptions },
      { metric: '', value: '' },
      { metric: '补货前库存总计', value: summary.totalStockBefore },
      { metric: '补货数量总计', value: summary.totalRestockAmount },
      { metric: '补货后库存总计', value: summary.totalStockAfter },
      { metric: '退款金额总计', value: summary.totalRefundAmount },
      { metric: '', value: '' },
      { metric: '数据校验码', value: dataHash }
    ];

    sheet.addRows(rows);

    sheet.addRow([]);
    sheet.addRow(['按状态分布:']);
    Object.entries(summary.byStatus).forEach(([status, count]) => {
      sheet.addRow([status, count]);
    });

    sheet.addRow([]);
    sheet.addRow(['按城市分布:']);
    Object.entries(summary.byCity).forEach(([city, count]) => {
      sheet.addRow([city, count]);
    });
  }

  private populateDetailSheet(sheet: ExcelJS.Worksheet, receipts: any[]): void {
    sheet.columns = [
      { header: '批次号', key: 'batchNo', width: 25 },
      { header: '柜机', key: 'cabinetName', width: 20 },
      { header: '城市', key: 'city', width: 10 },
      { header: '状态', key: 'statusLabel', width: 12 },
      { header: '是否冻结', key: 'isFrozen', width: 10 },
      { header: '冻结原因', key: 'freezeReason', width: 20 },
      { header: '人工理由', key: 'manualReason', width: 30 },
      { header: '补货前库存', key: 'totalStockBefore', width: 12 },
      { header: '补货数量', key: 'totalRestockAmount', width: 12 },
      { header: '补货后库存', key: 'totalStockAfter', width: 12 },
      { header: '退款金额', key: 'totalRefundAmount', width: 12 },
      { header: '异常数', key: 'exceptionCount', width: 8 },
      { header: '状态变更原因', key: 'statusChangeReason', width: 25 },
      { header: '创建人', key: 'createdByName', width: 12 },
      { header: '创建时间', key: 'createdAt', width: 20 }
    ];

    receipts.forEach(r => {
      sheet.addRow({
        ...r,
        isFrozen: r.isFrozen ? '是' : '否',
        createdAt: r.createdAt.toISOString().slice(0, 19).replace('T', ' ')
      });
    });
  }

  private async populateExceptionSheet(sheet: ExcelJS.Worksheet, filter: ReportFilter): Promise<void> {
    const exceptions = await this.exceptionRepository
      .createQueryBuilder('e')
      .innerJoin('e.receipt', 'r')
      .select(['e.*', 'r.batchNo'])
      .orderBy('e.createdAt', 'DESC')
      .getRawMany();

    sheet.columns = [
      { header: '批次号', key: 'r_batchNo', width: 25 },
      { header: '来源', key: 'source', width: 15 },
      { header: '类型', key: 'type', width: 20 },
      { header: '描述', key: 'description', width: 30 },
      { header: '详情', key: 'detail', width: 30 },
      { header: '是否解决', key: 'resolved', width: 10 },
      { header: '影响汇总', key: 'affectsSummary', width: 10 },
      { header: '创建时间', key: 'createdAt', width: 20 }
    ];

    exceptions.forEach(e => {
      sheet.addRow({
        ...e,
        resolved: e.resolved ? '是' : '否',
        affectsSummary: e.affectsSummary ? '是' : '否',
        createdAt: e.createdAt.toISOString().slice(0, 19).replace('T', ' ')
      });
    });
  }

  private generateDataHash(data: any[]): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }
}
