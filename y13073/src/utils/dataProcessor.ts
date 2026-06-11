import { CadRecord, AnomalyPoint, TimelineGap, AnomalyType } from '../types';
import { ANOMALY_DETECTION_CONFIG } from './constants';

export const calculateIQR = (values: number[]): { q1: number; q3: number; iqr: number; lowerBound: number; upperBound: number } => {
  const sorted = [...values].filter(v => !isNaN(v)).sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const { iqrMultiplier } = ANOMALY_DETECTION_CONFIG;
  
  return {
    q1,
    q3,
    iqr,
    lowerBound: q1 - iqrMultiplier * iqr,
    upperBound: q3 + iqrMultiplier * iqr,
  };
};

export const detectBoundaryAnomalies = (records: CadRecord[]): AnomalyPoint[] => {
  const yValues = records.map(r => r.y).filter(v => !isNaN(v));
  const { lowerBound, upperBound } = calculateIQR(yValues);
  
  const anomalies: AnomalyPoint[] = [];
  
  records.forEach(record => {
    if (isNaN(record.y)) return;
    
    if (record.y < lowerBound || record.y > upperBound) {
      anomalies.push({
        id: `ANOM-BOUND-${record.id}`,
        recordId: record.id,
        type: 'boundary',
        description: `高程值 ${record.y.toFixed(1)} 超出正常范围 [${lowerBound.toFixed(1)}, ${upperBound.toFixed(1)}]`,
        affectedRange: [record.id],
        sourceInfo: {
          source: record.source,
          processStatus: record.processStatus,
          originalFields: record.originalFields,
        },
      });
    }
  });
  
  return anomalies;
};

export const detectMutationAnomalies = (records: CadRecord[]): AnomalyPoint[] => {
  const anomalies: AnomalyPoint[] = [];
  const sortedRecords = [...records].filter(r => !isNaN(r.y)).sort((a, b) => a.x - b.x);
  
  for (let i = 1; i < sortedRecords.length; i++) {
    const prev = sortedRecords[i - 1];
    const curr = sortedRecords[i];
    const changeRate = Math.abs((curr.y - prev.y) / prev.y);
    
    if (changeRate > ANOMALY_DETECTION_CONFIG.mutationThreshold) {
      anomalies.push({
        id: `ANOM-MUTATE-${curr.id}`,
        recordId: curr.id,
        type: 'mutation',
        description: `高程突变率 ${(changeRate * 100).toFixed(1)}%，超过阈值 ${(ANOMALY_DETECTION_CONFIG.mutationThreshold * 100)}%`,
        affectedRange: [prev.id, curr.id],
        sourceInfo: {
          source: curr.source,
          processStatus: curr.processStatus,
          originalFields: curr.originalFields,
        },
      });
    }
  }
  
  return anomalies;
};

export const detectIncompleteAnomalies = (records: CadRecord[]): AnomalyPoint[] => {
  const anomalies: AnomalyPoint[] = [];
  
  records.forEach(record => {
    const missingFields: string[] = [];
    
    if (isNaN(record.y)) missingFields.push('Y坐标(高程)');
    if (!record.timestamp || record.timestamp === '') missingFields.push('时间戳');
    if (!record.source || record.source === '') missingFields.push('来源');
    
    if (missingFields.length > 0) {
      anomalies.push({
        id: `ANOM-INCOMP-${record.id}`,
        recordId: record.id,
        type: 'incomplete',
        description: `缺失关键字段: ${missingFields.join(', ')}`,
        affectedRange: [record.id],
        sourceInfo: {
          source: record.source || '未知',
          processStatus: record.processStatus,
          originalFields: record.originalFields,
        },
      });
    }
  });
  
  return anomalies;
};

export const detectTimelineGaps = (records: CadRecord[]): TimelineGap[] => {
  const gaps: TimelineGap[] = [];
  const sortedRecords = [...records]
    .filter(r => r.timestamp && r.timestamp !== '')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  if (sortedRecords.length < 2) return gaps;
  
  const intervals: number[] = [];
  for (let i = 1; i < sortedRecords.length; i++) {
    const diff = new Date(sortedRecords[i].timestamp).getTime() - new Date(sortedRecords[i - 1].timestamp).getTime();
    intervals.push(diff);
  }
  
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const gapThreshold = avgInterval * ANOMALY_DETECTION_CONFIG.gapThresholdMultiplier;
  
  for (let i = 1; i < sortedRecords.length; i++) {
    const prev = sortedRecords[i - 1];
    const curr = sortedRecords[i];
    const diff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
    
    if (diff > gapThreshold) {
      gaps.push({
        id: `GAP-${String(gaps.length + 1).padStart(3, '0')}`,
        startTime: prev.timestamp,
        endTime: curr.timestamp,
        duration: Math.round(diff / 60000),
        affectedRecordIds: [prev.id, curr.id],
        startRow: prev.rowNumber,
        endRow: curr.rowNumber,
      });
    }
  }
  
  return gaps;
};

export const detectAllAnomalies = (records: CadRecord[]): {
  anomalies: AnomalyPoint[];
  gaps: TimelineGap[];
} => {
  const boundary = detectBoundaryAnomalies(records);
  const mutation = detectMutationAnomalies(records);
  const incomplete = detectIncompleteAnomalies(records);
  const gaps = detectTimelineGaps(records);
  
  const gapAnomalies: AnomalyPoint[] = gaps.map(gap => ({
    id: `ANOM-GAP-${gap.id}`,
    recordId: gap.affectedRecordIds[0],
    type: 'gap' as AnomalyType,
    description: `时间轴缺段 ${gap.duration} 分钟，影响行 ${gap.startRow}-${gap.endRow}`,
    affectedRange: gap.affectedRecordIds,
    sourceInfo: {
      source: '时间轴检测',
      processStatus: 'pending',
      originalFields: { gapInfo: gap },
    },
  }));
  
  return {
    anomalies: [...boundary, ...mutation, ...incomplete, ...gapAnomalies],
    gaps,
  };
};

export const filterRecords = (
  records: CadRecord[],
  filters: {
    timeRange?: { start: string; end: string } | null;
    processStatus?: string[];
    sources?: string[];
    layers?: string[];
  }
): CadRecord[] => {
  return records.filter(record => {
    if (filters.timeRange) {
      const recordTime = new Date(record.timestamp).getTime();
      const startTime = new Date(filters.timeRange.start).getTime();
      const endTime = new Date(filters.timeRange.end).getTime();
      if (recordTime < startTime || recordTime > endTime) return false;
    }
    
    if (filters.processStatus && filters.processStatus.length > 0) {
      if (!filters.processStatus.includes(record.processStatus)) return false;
    }
    
    if (filters.sources && filters.sources.length > 0) {
      if (!filters.sources.includes(record.source)) return false;
    }
    
    if (filters.layers && filters.layers.length > 0) {
      if (!filters.layers.includes(record.layer)) return false;
    }
    
    return true;
  });
};

export const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getAnomalyTypeLabel = (type: AnomalyType): string => {
  const labels: Record<AnomalyType, string> = {
    boundary: '边界值异常',
    mutation: '突变异常',
    incomplete: '数据不完整',
    gap: '时间轴缺段',
  };
  return labels[type] || type;
};
