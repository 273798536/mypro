import type {
  AppState,
  InvoiceAnalysis,
  AggregatedSupplier,
  ChartDataPoint,
  Override,
  ProcessingError,
  PaymentStatus,
  WarningInfo,
} from '../types';
import {
  findRuleVersionForInvoice,
  getMatchTypeLabel,
  type RuleMatchResult,
} from './versioning';
import {
  computePaymentStatus,
  buildPaymentTransitions,
} from './paymentStatus';
import { runAllConflictChecks, makeSourceRef } from './conflict';

export interface ProcessInput {
  contracts: AppState['contracts'];
  invoices: AppState['invoices'];
  receipts: AppState['receipts'];
  ruleVersions: AppState['ruleVersions'];
  payments: AppState['payments'];
  overrides: AppState['overrides'];
}

export interface ProcessOutput {
  analysis: InvoiceAnalysis[];
  aggregated: AggregatedSupplier[];
  chartData: ChartDataPoint[];
  processingErrors: ProcessingError[];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function buildTrace(
  matchResult: RuleMatchResult,
  appliedVersionLabel: string,
  overrideReason?: string,
): InvoiceAnalysis['trace'] {
  const trace: InvoiceAnalysis['trace'] = [];

  trace.push({
    timestamp: new Date().toISOString(),
    action: '规则匹配',
    detail: `匹配类型: ${getMatchTypeLabel(matchResult.matchType)}, 候选版本: ${matchResult.candidateCount}个`,
    operator: 'system',
    sourceRef: makeSourceRef(
      'rule_version',
      matchResult.version?.sourceRef.lineNumber ?? 0,
      matchResult.version?.id ?? '',
      appliedVersionLabel,
    ),
  });

  if (matchResult.isHistorical) {
    trace.push({
      timestamp: new Date().toISOString(),
      action: '历史版本',
      detail: '使用的规则版本已停用，属于历史追溯应用',
      operator: 'system',
      sourceRef: makeSourceRef('rule_version', 0, '', '历史版本标记'),
    });
  }

  if (matchResult.isSwitch) {
    trace.push({
      timestamp: new Date().toISOString(),
      action: '版本切换',
      detail: '存在更新的规则版本，需确认追溯范围',
      operator: 'system',
      sourceRef: makeSourceRef('rule_version', 0, '', '版本切换'),
    });
  }

  if (overrideReason) {
    trace.push({
      timestamp: new Date().toISOString(),
      action: '人工改判',
      detail: overrideReason,
      operator: 'human',
      sourceRef: makeSourceRef('override', 0, '', '人工改判'),
    });
  }

  return trace;
}

function getEffectiveDays(
  baseDays: number,
  overrides: Override[],
  invoiceId: string,
): { days: number; overrideApplied: boolean; overrideReason?: string } {
  const relevant = overrides.find(
    (o) =>
      o.targetType === 'invoice' &&
      o.targetId === invoiceId &&
      o.newDays !== undefined,
  );
  if (relevant && relevant.newDays) {
    return {
      days: relevant.newDays,
      overrideApplied: true,
      overrideReason: relevant.reason,
    };
  }
  return { days: baseDays, overrideApplied: false };
}

function buildMatchWarnings(
  matchResult: RuleMatchResult,
  invoiceCode: string,
): WarningInfo[] {
  const warnings: WarningInfo[] = [];

  if (matchResult.matchType === 'none') {
    warnings.push({
      level: 'error',
      message: `发票 ${invoiceCode} 无法找到匹配的规则版本`,
      sourceRef: makeSourceRef('rule_version', 0, '', '无匹配版本'),
      relatedTo: invoiceCode,
    });
  }

  if (matchResult.matchType === 'supplier_fallback') {
    warnings.push({
      level: 'warning',
      message: `发票 ${invoiceCode} 未找到合同级规则，已回退到供应商级规则`,
      sourceRef: makeSourceRef('rule_version', 0, '', '供应商兜底'),
      relatedTo: invoiceCode,
    });
  }

  if (matchResult.matchType === 'ambiguous') {
    warnings.push({
      level: 'warning',
      message: `发票 ${invoiceCode} 存在多个候选规则版本，匹配结果可能有歧义`,
      sourceRef: makeSourceRef('rule_version', 0, '', '模糊匹配'),
      relatedTo: invoiceCode,
    });
  }

  if (matchResult.isHistorical) {
    warnings.push({
      level: 'info',
      message: `发票 ${invoiceCode} 使用的是历史（已停用）规则版本`,
      sourceRef: makeSourceRef('rule_version', 0, '', '历史版本'),
      relatedTo: invoiceCode,
    });
  }

  if (matchResult.isSwitch) {
    warnings.push({
      level: 'info',
      message: `发票 ${invoiceCode} 开票后存在规则版本切换，请注意追溯范围`,
      sourceRef: makeSourceRef('rule_version', 0, '', '版本切换'),
      relatedTo: invoiceCode,
    });
  }

  return warnings;
}

function determineConflictType(
  matchResult: RuleMatchResult,
  conflictCheckType: string | null,
): string | null {
  if (matchResult.matchType === 'none') return 'no_rule_match';
  if (matchResult.matchType === 'ambiguous') return 'ambiguous_match';
  if (matchResult.isHistorical) return 'historical_rule';
  return conflictCheckType;
}

export function processAll(input: ProcessInput): ProcessOutput {
  const processingErrors: ProcessingError[] = [];
  const analysis: InvoiceAnalysis[] = [];

  for (const invoice of input.invoices) {
    try {
      const matchResult = findRuleVersionForInvoice(
        input.ruleVersions,
        invoice.supplierId,
        invoice.invoiceDate,
        invoice.contractId,
      );

      const version = matchResult.version;

      const baseDays = version?.baseDays ?? 0;
      const effective = version
        ? getEffectiveDays(baseDays, input.overrides, invoice.id)
        : { days: 0, overrideApplied: false };

      const dueDate = version
        ? addDays(invoice.invoiceDate, effective.days)
        : 'N/A';

      const supplierName =
        input.contracts.find((c) => c.supplierId === invoice.supplierId)
          ?.supplierName ?? invoice.supplierId;
      const contractCode =
        input.contracts.find((c) => c.id === invoice.contractId)
          ?.contractCode ?? invoice.contractId;

      const tempAnalysis: InvoiceAnalysis = {
        invoiceId: invoice.id,
        invoiceCode: invoice.invoiceCode,
        supplierId: invoice.supplierId,
        supplierName,
        contractId: invoice.contractId,
        contractCode,
        invoiceDate: invoice.invoiceDate,
        amount: invoice.amount,
        appliedRuleVersionId: version?.id ?? null,
        appliedRuleVersionLabel: version?.versionLabel ?? '无匹配版本',
        ruleMatchType: matchResult.matchType,
        isHistoricalRule: matchResult.isHistorical,
        baseDays,
        effectiveDays: effective.days,
        dueDate,
        receiptStatus: 'matched',
        paymentStatus: 'not_due' as PaymentStatus,
        conflictType: null,
        conflictDetail: null,
        overrideApplied: effective.overrideApplied,
        overrideReason: effective.overrideReason,
        warnings: [],
        trace: buildTrace(
          matchResult,
          version?.versionLabel ?? '无匹配版本',
          effective.overrideReason,
        ),
        sourceRef: invoice.sourceRef,
      };

      const conflictResult = runAllConflictChecks(
        invoice,
        input.contracts,
        input.receipts,
        input.ruleVersions,
        input.payments,
        input.overrides,
        version,
      );

      const linkedReceipts = input.receipts.filter((r) =>
        invoice.receiptIds.includes(r.id),
      );
      const hasPartial = linkedReceipts.some((r) => r.isPartial);
      const receiptStatus: InvoiceAnalysis['receiptStatus'] = linkedReceipts
        .length === 0
        ? 'unmatched'
        : hasPartial
          ? 'partial'
          : 'matched';

      const warnings: WarningInfo[] = [
        ...buildMatchWarnings(matchResult, invoice.invoiceCode),
        ...conflictResult.warnings,
      ];

      if (receiptStatus === 'unmatched') {
        warnings.push({
          level: 'warning',
          message: `发票 ${invoice.invoiceCode} 无关联入库单`,
          sourceRef: invoice.sourceRef,
        });
      }

      tempAnalysis.conflictType = determineConflictType(
        matchResult,
        conflictResult.conflictType,
      ) as InvoiceAnalysis['conflictType'];

      let conflictDetail = conflictResult.conflictDetail;
      if (matchResult.matchType === 'none') {
        conflictDetail = `无法找到适用于供应商 ${invoice.supplierId} 的规则版本，开票日期: ${invoice.invoiceDate}，来源: ${invoice.sourceRef.source}#${invoice.sourceRef.lineNumber}`;
      } else if (matchResult.matchType === 'ambiguous') {
        conflictDetail = `存在 ${matchResult.candidateCount} 个候选规则版本，匹配结果可能有歧义，请人工确认，来源: ${invoice.sourceRef.source}#${invoice.sourceRef.lineNumber}`;
      }

      tempAnalysis.conflictDetail = conflictDetail;
      tempAnalysis.warnings = warnings;
      tempAnalysis.receiptStatus = receiptStatus;

      analysis.push(tempAnalysis);
    } catch (err) {
      processingErrors.push({
        sourceRef: invoice.sourceRef,
        message: `处理发票 ${invoice.invoiceCode} 时出错: ${err instanceof Error ? err.message : '未知错误'}`,
        context: { error: err },
      });

      const supplierName =
        input.contracts.find((c) => c.supplierId === invoice.supplierId)
          ?.supplierName ?? invoice.supplierId;
      const contractCode =
        input.contracts.find((c) => c.id === invoice.contractId)
          ?.contractCode ?? invoice.contractId;

      analysis.push({
        invoiceId: invoice.id,
        invoiceCode: invoice.invoiceCode,
        supplierId: invoice.supplierId,
        supplierName,
        contractId: invoice.contractId,
        contractCode,
        invoiceDate: invoice.invoiceDate,
        amount: invoice.amount,
        appliedRuleVersionId: null,
        appliedRuleVersionLabel: '处理错误',
        ruleMatchType: 'none',
        isHistoricalRule: false,
        baseDays: 0,
        effectiveDays: 0,
        dueDate: 'ERROR',
        receiptStatus: 'unmatched',
        paymentStatus: 'disputed',
        conflictType: 'no_rule_match',
        conflictDetail: `处理异常: ${err instanceof Error ? err.message : '未知错误'}，来源: ${invoice.sourceRef.source}#${invoice.sourceRef.lineNumber}`,
        overrideApplied: false,
        warnings: [
          {
            level: 'error',
            message: `处理异常: ${err instanceof Error ? err.message : '未知错误'}`,
            sourceRef: invoice.sourceRef,
          },
        ],
        trace: [
          {
            timestamp: new Date().toISOString(),
            action: '处理错误',
            detail: err instanceof Error ? err.message : '未知错误',
            operator: 'system',
            sourceRef: invoice.sourceRef,
          },
        ],
        sourceRef: invoice.sourceRef,
      });
    }
  }

  for (const a of analysis) {
    a.paymentStatus = computePaymentStatus(a, input.payments);
    const transitions = buildPaymentTransitions(a, input.payments);
    a.trace = [
      ...a.trace,
      ...transitions.map((t) => ({
        timestamp: t.triggeredAt,
        action: `状态转换: ${t.from} → ${t.to}`,
        detail: t.reason,
        operator: t.triggeredBy,
        sourceRef: makeSourceRef('payment_list', 0, '', '付款状态更新'),
      })),
    ];
  }

  const aggregated = aggregateBySupplier(analysis);
  const chartData = buildChartData(analysis);

  return { analysis, aggregated, chartData, processingErrors };
}

function aggregateBySupplier(
  analysis: InvoiceAnalysis[],
): AggregatedSupplier[] {
  const map = new Map<string, AggregatedSupplier>();

  for (const a of analysis) {
    const existing = map.get(a.supplierId);
    if (existing) {
      existing.totalInvoices++;
      existing.totalAmount += a.amount;
      if (a.paymentStatus === 'overdue') existing.overdueAmount += a.amount;
      if (a.paymentStatus === 'disputed') existing.disputedAmount += a.amount;
      if (a.overrideApplied) existing.overriddenCount++;
      if (a.conflictType !== null) existing.conflictCount++;
    } else {
      map.set(a.supplierId, {
        supplierId: a.supplierId,
        supplierName: a.supplierName,
        totalInvoices: 1,
        totalAmount: a.amount,
        overdueAmount:
          a.paymentStatus === 'overdue' ? a.amount : 0,
        disputedAmount:
          a.paymentStatus === 'disputed' ? a.amount : 0,
        overriddenCount: a.overrideApplied ? 1 : 0,
        conflictCount: a.conflictType !== null ? 1 : 0,
        activeRuleVersionLabel: a.appliedRuleVersionLabel,
      });
    }
  }

  return Array.from(map.values());
}

function buildChartData(
  analysis: InvoiceAnalysis[],
): ChartDataPoint[] {
  const periodMap = new Map<string, ChartDataPoint>();

  for (const a of analysis) {
    const period = a.invoiceDate.substring(0, 7);
    const existing = periodMap.get(period);
    const status = a.paymentStatus;
    if (existing) {
      if (status === 'disputed') existing.disputed += a.amount;
      else if (status === 'overdue') existing.overdue += a.amount;
      else if (a.overrideApplied) existing.overridden += a.amount;
      else existing.normal += a.amount;
    } else {
      periodMap.set(period, {
        period,
        normal: status !== 'disputed' && status !== 'overdue' && !a.overrideApplied ? a.amount : 0,
        disputed: status === 'disputed' ? a.amount : 0,
        overdue: status === 'overdue' ? a.amount : 0,
        overridden: a.overrideApplied ? a.amount : 0,
      });
    }
  }

  return Array.from(periodMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period),
  );
}

export function exportToCSV(analysis: InvoiceAnalysis[]): string {
  const headers = [
    '发票编号',
    '供应商',
    '合同',
    '开票日期',
    '金额',
    '适用规则版本',
    '规则匹配类型',
    '是否历史版本',
    '基准账期(天)',
    '实际账期(天)',
    '应付款日',
    '入库状态',
    '付款状态',
    '冲突类型',
    '冲突明细',
    '是否改判',
    '改判理由',
    '来源行号',
  ];

  const rows = analysis.map((a) => [
    a.invoiceCode,
    a.supplierName,
    a.contractCode,
    a.invoiceDate,
    a.amount.toFixed(2),
    a.appliedRuleVersionLabel,
    getMatchTypeLabel(a.ruleMatchType),
    a.isHistoricalRule ? '是' : '否',
    String(a.baseDays),
    String(a.effectiveDays),
    a.dueDate,
    receiptStatusLabel(a.receiptStatus),
    paymentStatusLabel(a.paymentStatus),
    a.conflictType ?? '',
    a.conflictDetail ?? '',
    a.overrideApplied ? '是' : '否',
    a.overrideReason ?? '',
    `${a.sourceRef.source}#${a.sourceRef.lineNumber}`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function receiptStatusLabel(s: string): string {
  return { matched: '已匹配', partial: '部分入库', unmatched: '未匹配' }[s] ?? s;
}

function paymentStatusLabel(s: PaymentStatus): string {
  return {
    not_due: '未到期',
    due_soon: '即将到期',
    overdue: '已逾期',
    partially_paid: '部分付款',
    paid: '已结清',
    disputed: '争议中',
    void: '已作废',
  }[s];
}
