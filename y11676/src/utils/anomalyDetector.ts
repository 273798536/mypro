import { CashFlowRecord, Anomaly } from '../types';

export function detectAnomalies(records: CashFlowRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const record of records) {
    if (record.amount < 0) {
      anomalies.push({
        type: 'negative_flow',
        severity: 'critical',
        description: `负现金流：${record.direction === 'outflow' ? '大额支出' : '预计无法收回'} ${Math.abs(record.amount).toLocaleString()} ${record.currency}`,
        details: {
          recordId: record.id,
          amount: record.amount,
          currency: record.currency,
          direction: record.direction,
        },
      });
    }

    const rateDiff = Math.abs(record.exchangeRate - record.plannedRate);
    const rateGapRatio = rateDiff / Math.max(record.plannedRate, 0.0001);
    if (rateGapRatio > 0.03) {
      anomalies.push({
        type: 'rate_gap',
        severity: rateGapRatio > 0.06 ? 'critical' : 'warning',
        description: `汇率缺口：计划 ${record.plannedRate}，实际 ${record.exchangeRate}，差异 ${(rateGapRatio * 100).toFixed(2)}%`,
        details: {
          recordId: record.id,
          plannedRate: record.plannedRate,
          actualRate: record.exchangeRate,
          gap: rateDiff,
          gapPercent: (rateGapRatio * 100).toFixed(2),
        },
      });
    }

    const date = new Date(record.flowDate);
    const day = date.getDay();
    if (day === 0 || day === 6) {
      anomalies.push({
        type: 'date_misalignment',
        severity: 'warning',
        description: `日期错层：${record.flowDate} 为${day === 0 ? '周日' : '周六'}，非工作日资金可能延迟`,
        details: {
          recordId: record.id,
          flowDate: record.flowDate,
          weekday: day === 0 ? 'Sunday' : 'Saturday',
        },
      });
    }
  }

  return anomalies;
}

export function getAnomaliesForRecord(recordId: string, anomalies: Anomaly[]): Anomaly[] {
  return anomalies.filter(a => a.details.recordId === recordId);
}

export function countAnomaliesByType(anomalies: Anomaly[]): Record<string, number> {
  const counts: Record<string, number> = {
    rate_gap: 0,
    date_misalignment: 0,
    negative_flow: 0,
  };
  for (const a of anomalies) {
    counts[a.type]++;
  }
  return counts;
}

export function hasAnomaly(recordId: string, anomalies: Anomaly[]): boolean {
  return anomalies.some(a => a.details.recordId === recordId);
}

export function getAnomalyTypesForRecord(recordId: string, anomalies: Anomaly[]): string[] {
  return anomalies
    .filter(a => a.details.recordId === recordId)
    .map(a => a.type);
}
