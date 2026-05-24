import * as path from 'path';
import * as fs from 'fs';
import { createObjectCsvWriter } from 'csv-writer';
import { getRepository } from '../config/database';
import {
  ReconciliationResult,
  ReconciliationStatus,
  BadDataRecord,
  BadDataStatus,
  Declaration,
  TaxNotice
} from '../entities';

export interface ReportOptions {
  batchNo?: string;
  startDate?: Date;
  endDate?: Date;
  outputDir?: string;
  includeDetails?: boolean;
}

export interface ReportSummary {
  batchNo: string;
  generatedAt: Date;
  totalDeclarations: number;
  matched: number;
  mismatched: number;
  partialMatch: number;
  pendingReview: number;
  totalTaxExpected: number;
  totalTaxActual: number;
  taxDifference: number;
  badDataCount: number;
  files: {
    summary: string;
    details: string;
    badData: string;
  };
}

export class ReportService {
  async generateReport(options: ReportOptions = {}): Promise<ReportSummary> {
    const outputDir = options.outputDir || path.join(process.cwd(), 'data', 'reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const batchNo = options.batchNo || `REPORT-${timestamp}`;

    const resultRepo = getRepository(ReconciliationResult);
    let query = resultRepo.createQueryBuilder('r');

    if (options.batchNo) {
      query = query.where('r.batchNo = :batchNo', { batchNo: options.batchNo });
    }
    if (options.startDate) {
      query = query.andWhere('r.createdAt >= :startDate', { startDate: options.startDate });
    }
    if (options.endDate) {
      query = query.andWhere('r.createdAt <= :endDate', { endDate: options.endDate });
    }

    const results = await query.getMany();

    const summary = this.calculateSummary(results, batchNo);

    await this.writeSummaryReport(summary, outputDir, batchNo);
    await this.writeDetailsReport(results, outputDir, batchNo);
    await this.writeBadDataReport(outputDir, batchNo);

    return {
      ...summary,
      files: {
        summary: path.join(outputDir, `${batchNo}_summary.csv`),
        details: path.join(outputDir, `${batchNo}_details.csv`),
        badData: path.join(outputDir, `${batchNo}_bad_data.csv`)
      }
    };
  }

  private calculateSummary(results: ReconciliationResult[], batchNo: string) {
    return {
      batchNo,
      generatedAt: new Date(),
      totalDeclarations: results.length,
      matched: results.filter(r => r.status === ReconciliationStatus.MATCHED).length,
      mismatched: results.filter(r => r.status === ReconciliationStatus.MISMATCHED).length,
      partialMatch: results.filter(r => r.status === ReconciliationStatus.PARTIAL_MATCH).length,
      pendingReview: results.filter(r => r.status === ReconciliationStatus.PENDING_REVIEW).length,
      totalTaxExpected: results.reduce((sum, r) => sum + Number(r.expectedTaxAmount || 0), 0),
      totalTaxActual: results.reduce((sum, r) => sum + Number(r.actualTaxAmount || 0), 0),
      taxDifference: results.reduce((sum, r) => sum + Number(r.taxDifference || 0), 0),
      badDataCount: 0
    };
  }

  private async writeSummaryReport(summary: any, outputDir: string, batchNo: string): Promise<void> {
    const csvWriter = createObjectCsvWriter({
      path: path.join(outputDir, `${batchNo}_summary.csv`),
      header: [
        { id: 'key', title: '指标' },
        { id: 'value', title: '数值' }
      ]
    });

    const records = [
      { key: '批次号', value: summary.batchNo },
      { key: '生成时间', value: summary.generatedAt.toISOString() },
      { key: '申报单总数', value: summary.totalDeclarations },
      { key: '对账一致', value: summary.matched },
      { key: '对账不一致', value: summary.mismatched },
      { key: '部分匹配', value: summary.partialMatch },
      { key: '待复核', value: summary.pendingReview },
      { key: '预期税费总额', value: summary.totalTaxExpected.toFixed(2) },
      { key: '实际税费总额', value: summary.totalTaxActual.toFixed(2) },
      { key: '税费差额', value: summary.taxDifference.toFixed(2) }
    ];

    await csvWriter.writeRecords(records);
  }

  private async writeDetailsReport(results: ReconciliationResult[], outputDir: string, batchNo: string): Promise<void> {
    const declarationRepo = getRepository(Declaration);
    const taxRepo = getRepository(TaxNotice);

    const records = [];
    for (const result of results) {
      const declaration = await declarationRepo.findOne({
        where: { id: result.declarationId }
      });
      const taxNotices = await taxRepo.find({
        where: { declarationId: result.declarationId }
      });

      records.push({
        declarationNo: declaration?.declarationNo || '',
        packageNo: result.packageNo,
        status: result.status,
        mismatchTypes: (result.mismatchTypes || []).join('; '),
        expectedTax: result.expectedTaxAmount?.toFixed(2) || '0.00',
        actualTax: result.actualTaxAmount?.toFixed(2) || '0.00',
        taxDifference: result.taxDifference?.toFixed(2) || '0.00',
        hasSplitPackages: result.hasSplitPackages ? '是' : '否',
        relatedPackageNos: (result.relatedPackageNos || []).join('; '),
        batchNo: result.batchNo,
        taxNoticeCount: taxNotices.length,
        recordId: result.id,
        createdAt: result.createdAt.toISOString()
      });
    }

    const csvWriter = createObjectCsvWriter({
      path: path.join(outputDir, `${batchNo}_details.csv`),
      header: [
        { id: 'declarationNo', title: '申报单号' },
        { id: 'packageNo', title: '包裹号' },
        { id: 'status', title: '对账状态' },
        { id: 'mismatchTypes', title: '异常类型' },
        { id: 'expectedTax', title: '预期税费' },
        { id: 'actualTax', title: '实际税费' },
        { id: 'taxDifference', title: '税费差额' },
        { id: 'hasSplitPackages', title: '是否拆分' },
        { id: 'relatedPackageNos', title: '关联包裹号' },
        { id: 'taxNoticeCount', title: '补税通知数' },
        { id: 'batchNo', title: '批次号' },
        { id: 'recordId', title: '记录ID' },
        { id: 'createdAt', title: '创建时间' }
      ]
    });

    await csvWriter.writeRecords(records);
  }

  private async writeBadDataReport(outputDir: string, batchNo: string): Promise<void> {
    const badDataRepo = getRepository(BadDataRecord);
    const badRecords = await badDataRepo.find({
      where: { status: BadDataStatus.OPEN }
    });

    const records = badRecords.map(r => ({
      id: r.id,
      errorType: r.errorType,
      status: r.status,
      sourceType: r.sourceType,
      errorMessage: r.errorMessage,
      sourceFile: r.sourceFile || '',
      sourceRow: r.sourceRow || '',
      createdAt: r.createdAt.toISOString(),
      rawData: JSON.stringify(r.rawData).substring(0, 500)
    }));

    const csvWriter = createObjectCsvWriter({
      path: path.join(outputDir, `${batchNo}_bad_data.csv`),
      header: [
        { id: 'id', title: '记录ID' },
        { id: 'errorType', title: '错误类型' },
        { id: 'status', title: '状态' },
        { id: 'sourceType', title: '数据来源' },
        { id: 'errorMessage', title: '错误信息' },
        { id: 'sourceFile', title: '来源文件' },
        { id: 'sourceRow', title: '来源行号' },
        { id: 'createdAt', title: '创建时间' },
        { id: 'rawData', title: '原始数据(截断)' }
      ]
    });

    await csvWriter.writeRecords(records);
  }
}

export const reportService = new ReportService();
