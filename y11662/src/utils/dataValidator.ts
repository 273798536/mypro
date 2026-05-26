import { BondHolding, CashFlow, AnomalyRecord, AnomalyType, ValidationResult } from '../types';

export function validateCashFlows(
  cashFlows: CashFlow[],
  holdings: BondHolding[]
): ValidationResult {
  const anomalies: AnomalyRecord[] = [];

  cashFlows.forEach((flow) => {
    const bond = holdings.find((b) => b.bondCode === flow.bondCode);

    if (!bond) {
      anomalies.push({
        id: `anomaly-${flow.id}-no-bond`,
        type: 'invalid_date_format',
        description: `债券代码 ${flow.bondCode} 在持仓数据中未找到`,
        source: flow.source,
        sourceLine: flow.sourceLine,
        cashFlowId: flow.id,
        bondCode: flow.bondCode,
        severity: 'critical',
      });
      return;
    }

    if (!bond.rating || bond.rating.trim() === '') {
      anomalies.push({
        id: `anomaly-${flow.id}-no-rating`,
        type: 'missing_rating',
        description: `债券 ${bond.bondName}(${bond.bondCode}) 缺少评级信息`,
        source: bond.source,
        sourceLine: bond.sourceLine,
        cashFlowId: flow.id,
        bondCode: bond.bondCode,
        severity: 'warning',
      });
    }

    if (!isValidDateFormat(flow.flowDate)) {
      anomalies.push({
        id: `anomaly-${flow.id}-date-format`,
        type: 'invalid_date_format',
        description: `日期格式无效: ${flow.flowDate}，预期格式 YYYY-MM-DD`,
        source: flow.source,
        sourceLine: flow.sourceLine,
        cashFlowId: flow.id,
        bondCode: flow.bondCode,
        severity: 'critical',
      });
    }

    if (flow.amount < 0) {
      anomalies.push({
        id: `anomaly-${flow.id}-negative`,
        type: 'negative_cashflow',
        description: `检测到负现金流: ${formatAmount(flow.amount)}元，来源行号: ${flow.sourceLine}`,
        source: flow.source,
        sourceLine: flow.sourceLine,
        cashFlowId: flow.id,
        bondCode: flow.bondCode,
        severity: 'critical',
      });
    }

    const expectedFlowDate = calculateExpectedFlowDate(bond, flow.flowDate);
    if (expectedFlowDate && flow.flowDate !== expectedFlowDate) {
      anomalies.push({
        id: `anomaly-${flow.id}-date-misalign`,
        type: 'date_misalignment',
        description: `日期错位: 实际 ${flow.flowDate}，预期 ${expectedFlowDate}，来源行号: ${flow.sourceLine}`,
        source: flow.source,
        sourceLine: flow.sourceLine,
        cashFlowId: flow.id,
        bondCode: flow.bondCode,
        severity: 'error',
      });
    }

    if (Math.abs(flow.amount) > bond.holdingAmount * 3) {
      anomalies.push({
        id: `anomaly-${flow.id}-outlier`,
        type: 'outlier_amount',
        description: `金额异常: ${formatAmount(flow.amount)}元，持仓 ${formatAmount(bond.holdingAmount)}元，偏离超过3倍`,
        source: flow.source,
        sourceLine: flow.sourceLine,
        cashFlowId: flow.id,
        bondCode: flow.bondCode,
        severity: 'error',
      });
    }
  });

  const duplicateCheck = new Map<string, CashFlow[]>();
  cashFlows.forEach((flow) => {
    const key = `${flow.bondCode}-${flow.flowDate}-${flow.scenarioId}`;
    if (!duplicateCheck.has(key)) {
      duplicateCheck.set(key, []);
    }
    duplicateCheck.get(key)!.push(flow);
  });

  duplicateCheck.forEach((flows, key) => {
    if (flows.length > 1) {
      flows.slice(1).forEach((flow) => {
        anomalies.push({
          id: `anomaly-${flow.id}-duplicate`,
          type: 'scenario_duplicate',
          description: `情景重复: 债券 ${flow.bondCode} 在 ${flow.flowDate} 同一情景下存在重复记录，来源行号: ${flow.sourceLine}`,
          source: flow.source,
          sourceLine: flow.sourceLine,
          cashFlowId: flow.id,
          bondCode: flow.bondCode,
          severity: 'warning',
        });
      });
    }
  });

  return {
    valid: anomalies.filter((a) => a.severity === 'critical').length === 0,
    anomalies,
    totalRecords: cashFlows.length,
    anomalyCount: anomalies.length,
  };
}

function isValidDateFormat(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function calculateExpectedFlowDate(bond: BondHolding, actualDate: string): string | null {
  const issue = new Date(bond.issueDate);
  const actual = new Date(actualDate);

  if (isNaN(issue.getTime()) || isNaN(actual.getTime())) return null;

  const yearsDiff = actual.getFullYear() - issue.getFullYear();
  if (yearsDiff < 0) return null;

  const expected = new Date(issue);
  expected.setFullYear(issue.getFullYear() + yearsDiff);

  const expectedStr = expected.toISOString().split('T')[0];
  return expectedStr === actualDate ? null : expectedStr;
}

export function formatAmount(amount: number): string {
  if (Math.abs(amount) >= 100000000) {
    return (amount / 100000000).toFixed(2) + '亿';
  }
  if (Math.abs(amount) >= 10000) {
    return (amount / 10000).toFixed(2) + '万';
  }
  return amount.toFixed(2);
}

export function getAnomalyTypeLabel(type: AnomalyType): string {
  const labels: Record<AnomalyType, string> = {
    date_misalignment: '日期错位',
    scenario_duplicate: '情景重复',
    negative_cashflow: '负现金流',
    missing_rating: '缺失评级',
    outlier_amount: '金额异常',
    invalid_date_format: '日期格式无效',
  };
  return labels[type];
}