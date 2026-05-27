import type { PredictionRecord, AnomalyRecord, AnomalyType, GroupStats } from '../types';
import { isCovered } from './calculations';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function detectPromotionAnomalies(records: PredictionRecord[]): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  
  for (const record of records) {
    if (record.isPromotion && record.actualValue > record.upperBound * 1.2) {
      anomalies.push({
        id: generateId(),
        recordId: record.id,
        type: 'promotion',
        severity: 'error',
        description: `促销期间实际销量(${record.actualValue})超出预测上限(${record.upperBound})${((record.actualValue / record.upperBound - 1) * 100).toFixed(1)}%，区间可能偏窄`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
  }
  
  return anomalies;
}

export function detectCoverageAnomalies(records: PredictionRecord[]): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
  
  let consecutiveUncovered = 0;
  let consecutiveStartIndex = 0;
  
  for (let i = 0; i < sortedRecords.length; i++) {
    const record = sortedRecords[i];
    
    if (!isCovered(record)) {
      consecutiveUncovered++;
      if (consecutiveUncovered === 1) {
        consecutiveStartIndex = i;
      }
      
      const position = record.actualValue < record.lowerBound ? '低于下限' : '高于上限';
      const severity = consecutiveUncovered >= 3 ? 'error' : 'warning';
      
      if (consecutiveUncovered < 3) {
        anomalies.push({
          id: generateId(),
          recordId: record.id,
          type: 'coverage',
          severity,
          description: `实际销量${position}，预测区间[${record.lowerBound}, ${record.upperBound}]，实际值${record.actualValue}`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      } else if (consecutiveUncovered === 3) {
        for (let j = consecutiveStartIndex; j <= i; j++) {
          const r = sortedRecords[j];
          const pos = r.actualValue < r.lowerBound ? '低于下限' : '高于上限';
          anomalies.push({
            id: generateId(),
            recordId: r.id,
            type: 'coverage',
            severity: 'error',
            description: `连续覆盖不足！实际销量${pos}，预测区间[${r.lowerBound}, ${r.upperBound}]，实际值${r.actualValue}`,
            timestamp: new Date().toISOString(),
            resolved: false
          });
        }
      } else {
        anomalies.push({
          id: generateId(),
          recordId: record.id,
          type: 'coverage',
          severity: 'error',
          description: `连续覆盖不足！实际销量${position}，预测区间[${record.lowerBound}, ${record.upperBound}]，实际值${record.actualValue}`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    } else {
      consecutiveUncovered = 0;
    }
  }
  
  return anomalies;
}

export function detectSampleAnomalies(groupStats: GroupStats[]): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  const MIN_SAMPLE_SIZE = 30;
  
  for (const group of groupStats) {
    if (group.totalCount < MIN_SAMPLE_SIZE) {
      anomalies.push({
        id: generateId(),
        recordId: `group-${group.groupKey}`,
        type: 'sample',
        severity: 'warning',
        description: `分组"${group.groupName}"样本量(${group.totalCount})少于${MIN_SAMPLE_SIZE}，统计结果可能不可靠`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
  }
  
  return anomalies;
}

export function detectAllAnomalies(
  records: PredictionRecord[],
  groupStats: GroupStats[]
): AnomalyRecord[] {
  const promotionAnomalies = detectPromotionAnomalies(records);
  const coverageAnomalies = detectCoverageAnomalies(records);
  const sampleAnomalies = detectSampleAnomalies(groupStats);
  
  return [...promotionAnomalies, ...coverageAnomalies, ...sampleAnomalies];
}

export function getAnomalyTypeLabel(type: AnomalyType): string {
  const labels: Record<AnomalyType, string> = {
    promotion: '促销异常',
    coverage: '覆盖不足',
    sample: '样本偏少'
  };
  return labels[type];
}

export function getAnomalyTypeColor(type: AnomalyType): string {
  const colors: Record<AnomalyType, string> = {
    promotion: '#ef4444',
    coverage: '#f59e0b',
    sample: '#8b5cf6'
  };
  return colors[type];
}

export function getAnomalyTypeIcon(type: AnomalyType): string {
  const icons: Record<AnomalyType, string> = {
    promotion: 'Tag',
    coverage: 'AlertTriangle',
    sample: 'BarChart3'
  };
  return icons[type];
}
