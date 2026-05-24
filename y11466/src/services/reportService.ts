import {
  SampleRepository,
  SizeModificationRepository,
  FabricTransactionRepository,
  RefundRepository,
  CheckRepository,
  ImportRepository,
  AuditRepository
} from '../db';
import { CheckResult, ImportRecord, ImportError } from '../types';

export interface ReportOptions {
  includeDetails?: boolean;
  includeSourceRows?: boolean;
  format?: 'text' | 'html' | 'markdown';
}

export interface BrandPlanningReport {
  summary: {
    totalSamples: number;
    totalSizeModifications: number;
    totalFabricTransactions: number;
    totalRefunds: number;
    pendingChecks: number;
    criticalIssues: number;
    importBatches: number;
  };
  depositDiscrepancies: CheckResult[];
  fabricUsageIssues: CheckResult[];
  failedImports: {
    batch: ImportRecord;
    errors: ImportError[];
  }[];
  recentChanges: {
    timestamp: string;
    actor: string;
    action: string;
    entityType: string;
    entityId: string;
  }[];
  sampleVersions: {
    sampleNo: string;
    styleNo: string;
    versionCount: number;
    versions: {
      version: number;
      sourceRowNumber: number;
      importBatchId: string;
      createdAt: string;
    }[];
  }[];
}

export class ReportService {
  private sampleRepo: SampleRepository;
  private sizeRepo: SizeModificationRepository;
  private fabricTxRepo: FabricTransactionRepository;
  private refundRepo: RefundRepository;
  private checkRepo: CheckRepository;
  private importRepo: ImportRepository;
  private auditRepo: AuditRepository;

  constructor(
    sampleRepo: SampleRepository,
    sizeRepo: SizeModificationRepository,
    fabricTxRepo: FabricTransactionRepository,
    refundRepo: RefundRepository,
    checkRepo: CheckRepository,
    importRepo: ImportRepository,
    auditRepo: AuditRepository
  ) {
    this.sampleRepo = sampleRepo;
    this.sizeRepo = sizeRepo;
    this.fabricTxRepo = fabricTxRepo;
    this.refundRepo = refundRepo;
    this.checkRepo = checkRepo;
    this.importRepo = importRepo;
    this.auditRepo = auditRepo;
  }

  async generateBrandPlanningReport(options: ReportOptions = {}): Promise<BrandPlanningReport> {
    const samples = this.sampleRepo.findMany({ where: { is_latest: 1 } }) as any[];
    const sizeMods = this.sizeRepo.findMany({ where: { is_latest: 1 } });
    const fabricTxs = this.fabricTxRepo.findMany({ where: { is_latest: 1 } });
    const refunds = this.refundRepo.findMany({ where: { is_latest: 1 } });
    const checks = this.checkRepo.findAll(false);
    const imports = this.importRepo.findAll();
    const auditLogs = this.auditRepo.find({}).slice(0, 50);

    const depositDiscrepancies = checks.filter(c => c.type === 'deposit_discrepancy');
    const fabricUsageIssues = checks.filter(c => c.type === 'fabric_usage_tracking');
    const criticalIssues = checks.filter(c => c.severity === 'critical' || c.severity === 'error');

    const failedImports = imports
      .filter(i => i.status === 'failed')
      .map(batch => ({
        batch,
        errors: [] as ImportError[]
      }));

    const sampleVersions = await this.getSampleVersions();

    const recentChanges = auditLogs.map(log => ({
      timestamp: log.timestamp,
      actor: log.actor,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId
    }));

    return {
      summary: {
        totalSamples: samples.length,
        totalSizeModifications: sizeMods.length,
        totalFabricTransactions: fabricTxs.length,
        totalRefunds: refunds.length,
        pendingChecks: checks.length,
        criticalIssues: criticalIssues.length,
        importBatches: imports.length
      },
      depositDiscrepancies,
      fabricUsageIssues,
      failedImports,
      recentChanges,
      sampleVersions
    };
  }

  private async getSampleVersions(): Promise<BrandPlanningReport['sampleVersions']> {
    const allSamples = this.sampleRepo.findMany({}) as any[];
    const grouped = new Map<string, any[]>();

    for (const sample of allSamples) {
      if (!grouped.has(sample.sampleNo)) {
        grouped.set(sample.sampleNo, []);
      }
      grouped.get(sample.sampleNo)!.push(sample);
    }

    const result: BrandPlanningReport['sampleVersions'] = [];
    
    for (const [sampleNo, versions] of grouped) {
      if (versions.length > 1) {
        const sorted = versions.sort((a, b) => b.version - a.version);
        result.push({
          sampleNo,
          styleNo: sorted[0].styleNo,
          versionCount: versions.length,
          versions: sorted.map(v => ({
            version: v.version,
            sourceRowNumber: v.sourceRowNumber,
            importBatchId: v.importSource?.importBatchId || '',
            createdAt: v.createdAt
          }))
        });
      }
    }

    return result.sort((a, b) => b.versionCount - a.versionCount);
  }

  formatReport(report: BrandPlanningReport, format: 'text' | 'html' | 'markdown' = 'text'): string {
    switch (format) {
      case 'markdown':
        return this.formatMarkdown(report);
      case 'html':
        return this.formatHtml(report);
      default:
        return this.formatText(report);
    }
  }

  private formatText(report: BrandPlanningReport): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(80));
    lines.push('服装打版样衣多源导入巡检 - 品牌企划报告');
    lines.push('='.repeat(80));
    lines.push('');

    lines.push('【数据概览】');
    lines.push('-'.repeat(40));
    lines.push(`样衣总数: ${report.summary.totalSamples}`);
    lines.push(`尺码修改数: ${report.summary.totalSizeModifications}`);
    lines.push(`面料交易数: ${report.summary.totalFabricTransactions}`);
    lines.push(`退款记录数: ${report.summary.totalRefunds}`);
    lines.push(`待处理问题: ${report.summary.pendingChecks}`);
    lines.push(`严重问题: ${report.summary.criticalIssues}`);
    lines.push(`导入批次: ${report.summary.importBatches}`);
    lines.push('');

    if (report.depositDiscrepancies.length > 0) {
      lines.push('【押金差异】');
      lines.push('-'.repeat(40));
      for (const check of report.depositDiscrepancies) {
        lines.push(`[${check.severity.toUpperCase()}] ${check.message}`);
        lines.push(`  原始行号: ${check.details.sourceRowNumber ?? 'N/A'}`);
        lines.push(`  样衣编号: ${check.details.sampleNo ?? 'N/A'}`);
        lines.push('');
      }
    }

    if (report.fabricUsageIssues.length > 0) {
      lines.push('【面料领用追踪】');
      lines.push('-'.repeat(40));
      for (const check of report.fabricUsageIssues) {
        lines.push(`[${check.severity.toUpperCase()}] ${check.message}`);
        if (check.details.sourceRowNumber) {
          lines.push(`  原始行号: ${check.details.sourceRowNumber}`);
        }
        if (check.details.sourceRowNumbers) {
          lines.push(`  原始行号: ${JSON.stringify(check.details.sourceRowNumbers)}`);
        }
        lines.push('');
      }
    }

    if (report.sampleVersions.length > 0) {
      lines.push('【多版本样衣追踪】');
      lines.push('-'.repeat(40));
      for (const sv of report.sampleVersions) {
        lines.push(`样衣 ${sv.sampleNo} (${sv.styleNo}): ${sv.versionCount} 个版本`);
        for (const v of sv.versions) {
          lines.push(`  v${v.version} - 行${v.sourceRowNumber} - ${v.importBatchId} - ${v.createdAt}`);
        }
        lines.push('');
      }
    }

    if (report.failedImports.length > 0) {
      lines.push('【导入失败清单】');
      lines.push('-'.repeat(40));
      for (const fi of report.failedImports) {
        lines.push(`批次 ${fi.batch.batchId}`);
        lines.push(`  文件: ${fi.batch.fileName}`);
        lines.push(`  成功: ${fi.batch.successRows}, 失败: ${fi.batch.failedRows}, 跳过: ${fi.batch.skippedRows}`);
        lines.push('');
      }
    }

    lines.push('【最近变更记录】');
    lines.push('-'.repeat(40));
    for (const change of report.recentChanges.slice(0, 20)) {
      lines.push(`${change.timestamp} | ${change.actor} | ${change.action} | ${change.entityType}:${change.entityId}`);
    }

    return lines.join('\n');
  }

  private formatMarkdown(report: BrandPlanningReport): string {
    const lines: string[] = [];
    
    lines.push('# 服装打版样衣多源导入巡检 - 品牌企划报告');
    lines.push('');

    lines.push('## 数据概览');
    lines.push('');
    lines.push('| 指标 | 数值 |');
    lines.push('|------|------|');
    lines.push(`| 样衣总数 | ${report.summary.totalSamples} |`);
    lines.push(`| 尺码修改数 | ${report.summary.totalSizeModifications} |`);
    lines.push(`| 面料交易数 | ${report.summary.totalFabricTransactions} |`);
    lines.push(`| 退款记录数 | ${report.summary.totalRefunds} |`);
    lines.push(`| 待处理问题 | ${report.summary.pendingChecks} |`);
    lines.push(`| 严重问题 | ${report.summary.criticalIssues} |`);
    lines.push(`| 导入批次 | ${report.summary.importBatches} |`);
    lines.push('');

    if (report.depositDiscrepancies.length > 0) {
      lines.push('## 押金差异');
      lines.push('');
      lines.push('| 严重程度 | 消息 | 原始行号 | 样衣编号 |');
      lines.push('|----------|------|----------|----------|');
      for (const check of report.depositDiscrepancies) {
        lines.push(`| ${check.severity.toUpperCase()} | ${check.message} | ${check.details.sourceRowNumber ?? 'N/A'} | ${check.details.sampleNo ?? 'N/A'} |`);
      }
      lines.push('');
    }

    if (report.fabricUsageIssues.length > 0) {
      lines.push('## 面料领用追踪');
      lines.push('');
      lines.push('| 严重程度 | 消息 | 详情 |');
      lines.push('|----------|------|------|');
      for (const check of report.fabricUsageIssues) {
        lines.push(`| ${check.severity.toUpperCase()} | ${check.message} | \`${JSON.stringify(check.details)}\` |`);
      }
      lines.push('');
    }

    if (report.sampleVersions.length > 0) {
      lines.push('## 多版本样衣追踪');
      lines.push('');
      for (const sv of report.sampleVersions) {
        lines.push(`### ${sv.sampleNo} (${sv.styleNo}) - ${sv.versionCount} 个版本`);
        lines.push('');
        lines.push('| 版本 | 原始行号 | 导入批次 | 创建时间 |');
        lines.push('|------|----------|----------|----------|');
        for (const v of sv.versions) {
          lines.push(`| ${v.version} | ${v.sourceRowNumber} | ${v.importBatchId} | ${v.createdAt} |`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  private formatHtml(report: BrandPlanningReport): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>服装打版样衣多源导入巡检 - 品牌企划报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background-color: #f5f5f5; }
    .critical { color: #dc3545; font-weight: bold; }
    .error { color: #dc3545; }
    .warning { color: #ffc107; }
    .info { color: #17a2b8; }
  </style>
</head>
<body>
  <h1>服装打版样衣多源导入巡检 - 品牌企划报告</h1>
  
  <h2>数据概览</h2>
  <table>
    <tr><th>指标</th><th>数值</th></tr>
    <tr><td>样衣总数</td><td>${report.summary.totalSamples}</td></tr>
    <tr><td>尺码修改数</td><td>${report.summary.totalSizeModifications}</td></tr>
    <tr><td>面料交易数</td><td>${report.summary.totalFabricTransactions}</td></tr>
    <tr><td>退款记录数</td><td>${report.summary.totalRefunds}</td></tr>
    <tr><td>待处理问题</td><td>${report.summary.pendingChecks}</td></tr>
    <tr><td class="critical">严重问题</td><td class="critical">${report.summary.criticalIssues}</td></tr>
    <tr><td>导入批次</td><td>${report.summary.importBatches}</td></tr>
  </table>

  ${report.depositDiscrepancies.length > 0 ? `
  <h2>押金差异</h2>
  <table>
    <tr><th>严重程度</th><th>消息</th><th>原始行号</th><th>样衣编号</th></tr>
    ${report.depositDiscrepancies.map(c => `
    <tr>
      <td class="${c.severity}">${c.severity.toUpperCase()}</td>
      <td>${c.message}</td>
      <td>${c.details.sourceRowNumber ?? 'N/A'}</td>
      <td>${c.details.sampleNo ?? 'N/A'}</td>
    </tr>`).join('')}
  </table>
  ` : ''}

  ${report.fabricUsageIssues.length > 0 ? `
  <h2>面料领用追踪</h2>
  <table>
    <tr><th>严重程度</th><th>消息</th><th>详情</th></tr>
    ${report.fabricUsageIssues.map(c => `
    <tr>
      <td class="${c.severity}">${c.severity.toUpperCase()}</td>
      <td>${c.message}</td>
      <td><code>${JSON.stringify(c.details)}</code></td>
    </tr>`).join('')}
  </table>
  ` : ''}

  ${report.sampleVersions.length > 0 ? `
  <h2>多版本样衣追踪</h2>
  ${report.sampleVersions.map(sv => `
    <h3>${sv.sampleNo} (${sv.styleNo}) - ${sv.versionCount} 个版本</h3>
    <table>
      <tr><th>版本</th><th>原始行号</th><th>导入批次</th><th>创建时间</th></tr>
      ${sv.versions.map(v => `
      <tr>
        <td>${v.version}</td>
        <td>${v.sourceRowNumber}</td>
        <td>${v.importBatchId}</td>
        <td>${v.createdAt}</td>
      </tr>`).join('')}
    </table>
  `).join('')}
  ` : ''}

</body>
</html>`;
  }
}
