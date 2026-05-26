import type {
  ConflictType,
  WarningInfo,
  SourceRef,
  Invoice,
  Receipt,
  Contract,
  RuleVersion,
  PaymentRecord,
  Override,
} from '../types';

export interface ConflictCheckResult {
  conflictType: ConflictType | null;
  conflictDetail: string | null;
  warnings: WarningInfo[];
}

export function detectContractSwitch(
  invoice: Invoice,
  contracts: Contract[],
  ruleVersions: RuleVersion[],
): ConflictCheckResult {
  const contract = contracts.find((c) => c.id === invoice.contractId);
  if (!contract) {
    return {
      conflictType: 'contract_switch',
      conflictDetail: `无法找到合同 ${invoice.contractId}，来源: ${invoice.sourceRef.source}#${invoice.sourceRef.lineNumber}`,
      warnings: [
        {
          level: 'error',
          message: `合同缺失: ${invoice.contractId}`,
          sourceRef: invoice.sourceRef,
        },
      ],
    };
  }
  const versionsForContract = ruleVersions.filter(
    (v) => v.contractId === invoice.contractId && v.isActive,
  );
  if (versionsForContract.length > 1) {
    return {
      conflictType: 'version_overlap',
      conflictDetail: `合同 ${contract.contractCode} 存在 ${versionsForContract.length} 个激活版本，来源: 合同行#${contract.sourceRef.lineNumber}`,
      warnings: [
        {
          level: 'warning',
          message: `同一合同下有多个激活规则版本: ${contract.contractCode}`,
          sourceRef: contract.sourceRef,
        },
      ],
    };
  }
  return { conflictType: null, conflictDetail: null, warnings: [] };
}

export function detectPartialReceipt(
  invoice: Invoice,
  receipts: Receipt[],
): ConflictCheckResult {
  const linkedReceipts = receipts.filter((r) =>
    invoice.receiptIds.includes(r.id),
  );
  const hasPartial = linkedReceipts.some((r) => r.isPartial);
  if (hasPartial) {
    const partialReceipt = linkedReceipts.find((r) => r.isPartial)!;
    return {
      conflictType: 'partial_receipt',
      conflictDetail: `发票 ${invoice.invoiceCode} 关联部分入库单 ${partialReceipt.receiptCode}，金额 ${partialReceipt.amount}，来源: 入库单行#${partialReceipt.sourceRef.lineNumber}`,
      warnings: [
        {
          level: 'warning',
          message: `部分入库: 入库单 ${partialReceipt.receiptCode} 未完全入库`,
          sourceRef: partialReceipt.sourceRef,
        },
      ],
    };
  }
  return { conflictType: null, conflictDetail: null, warnings: [] };
}

export function detectRetroactiveChange(
  invoice: Invoice,
  ruleVersions: RuleVersion[],
  overrides: Override[],
): ConflictCheckResult {
  const appliedVersion = ruleVersions.find((v) =>
    invoice.contractId && v.contractId === invoice.contractId
      ? v.contractId === invoice.contractId
      : v.supplierId === invoice.supplierId,
  );
  if (!appliedVersion) return { conflictType: null, conflictDetail: null, warnings: [] };

  if (new Date(appliedVersion.effectiveDate) > new Date(invoice.invoiceDate)) {
    return {
      conflictType: 'retroactive_change',
      conflictDetail: `规则版本 ${appliedVersion.versionLabel} 生效日(${appliedVersion.effectiveDate})晚于发票日(${invoice.invoiceDate})，可能存在追溯改判，来源: 规则版本行#${appliedVersion.sourceRef.lineNumber}`,
      warnings: [
        {
          level: 'warning',
          message: `追溯改判风险: 规则版本 ${appliedVersion.versionLabel} 晚于发票日期`,
          sourceRef: appliedVersion.sourceRef,
        },
      ],
    };
  }

  const relevantOverrides = overrides.filter(
    (o) =>
      o.targetType === 'invoice' &&
      o.targetId === invoice.id &&
      o.timestamp > invoice.invoiceDate,
  );
  if (relevantOverrides.length > 0) {
    const o = relevantOverrides[0];
    return {
      conflictType: 'retroactive_change',
      conflictDetail: `发票 ${invoice.invoiceCode} 在开票后被改判，时间: ${o.timestamp}，理由: ${o.reason}，来源: 改判行#${o.sourceRef.lineNumber}`,
      warnings: [
        {
          level: 'warning',
          message: `发票开票后改判: ${o.reason}`,
          sourceRef: o.sourceRef,
        },
      ],
    };
  }

  return { conflictType: null, conflictDetail: null, warnings: [] };
}

export function detectRuleMismatch(
  invoice: Invoice,
  appliedVersion: RuleVersion | null,
  payments: PaymentRecord[],
): ConflictCheckResult {
  if (!appliedVersion) return { conflictType: null, conflictDetail: null, warnings: [] };
  const relevantPayments = payments.filter(
    (p) => p.invoiceId === invoice.id,
  );
  if (relevantPayments.length === 0) return { conflictType: null, conflictDetail: null, warnings: [] };

  const firstPayment = relevantPayments
    .filter((p) => p.actualDate)
    .sort(
      (a, b) =>
        new Date(a.actualDate!).getTime() - new Date(b.actualDate!).getTime(),
    )[0];

  if (firstPayment && appliedVersion) {
    const dueDate = new Date(invoice.invoiceDate);
    dueDate.setDate(dueDate.getDate() + appliedVersion.baseDays);
    if (firstPayment.actualDate && new Date(firstPayment.actualDate) > dueDate) {
      return {
        conflictType: 'payment_delay',
        conflictDetail: `实际付款(${firstPayment.actualDate})晚于应付款日(${dueDate.toISOString().split('T')[0]})，来源: 付款行#${firstPayment.sourceRef.lineNumber}`,
        warnings: [
          {
            level: 'warning',
            message: `付款逾期: ${firstPayment.actualDate}`,
            sourceRef: firstPayment.sourceRef,
          },
        ],
      };
    }
  }

  return { conflictType: null, conflictDetail: null, warnings: [] };
}

export function runAllConflictChecks(
  invoice: Invoice,
  contracts: Contract[],
  receipts: Receipt[],
  ruleVersions: RuleVersion[],
  payments: PaymentRecord[],
  overrides: Override[],
  appliedVersion: RuleVersion | null,
): ConflictCheckResult {
  const results = [
    detectContractSwitch(invoice, contracts, ruleVersions),
    detectPartialReceipt(invoice, receipts),
    detectRetroactiveChange(invoice, ruleVersions, overrides),
    detectRuleMismatch(invoice, appliedVersion, payments),
  ];

  const firstConflict = results.find((r) => r.conflictType !== null);
  const allWarnings = results.flatMap((r) => r.warnings);

  return {
    conflictType: firstConflict?.conflictType ?? null,
    conflictDetail: firstConflict?.conflictDetail ?? null,
    warnings: allWarnings,
  };
}

export function makeSourceRef(
  source: SourceRef['source'],
  lineNumber: number,
  id: string,
  label: string,
): SourceRef {
  return { source, lineNumber, id, label };
}
