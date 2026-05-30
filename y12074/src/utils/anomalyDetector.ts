import type {
  LuggageRecord,
  AnomalyEvent,
  ChuteModel,
  AnomalyType,
  Severity,
} from '@/types';

const HEIGHT_THRESHOLD_RATIO = 1.8;
const STACK_DISTANCE_THRESHOLD = 0.3;
const MIN_STACK_COUNT = 3;

export const getSeverity = (
  type: AnomalyType,
  expected: number,
  actual: number
): Severity => {
  const ratio = actual > expected ? actual / expected : expected / actual;

  if (type === 'height_mismatch') {
    if (ratio > 2.5) return 'high';
    if (ratio > 1.8) return 'medium';
    return 'low';
  }

  if (type === 'speed_over') {
    if (ratio > 1.5) return 'high';
    if (ratio > 1.25) return 'medium';
    return 'low';
  }

  if (type === 'stacked') {
    if (actual < 0.3) return 'high';
    if (actual < 0.8) return 'medium';
    return 'low';
  }

  return 'low';
};

export const getAnomalyDescription = (
  type: AnomalyType,
  expected: number,
  actual: number,
  luggageCount: number,
  position: number
): string => {
  const diff = Math.abs(actual - expected).toFixed(2);
  const ratio = (actual > expected ? actual / expected : expected / actual).toFixed(2);

  switch (type) {
    case 'height_mismatch':
      return `位置${position.toFixed(2)}m处高度错配：标准${expected}m，实际${actual}m，偏差${diff}m(${ratio}倍)`;
    case 'speed_over':
      return `位置${position.toFixed(2)}m处速度过快：上限${expected}m/s，实际${actual}m/s，超出${diff}m/s(${ratio}倍)`;
    case 'stacked':
      return `位置${position.toFixed(2)}m处行李堆积：共${luggageCount}件，速度降至${actual}m/s`;
    default:
      return '未知异常';
  }
};

export const detectHeightMismatch = (
  records: LuggageRecord[],
  chute: ChuteModel
): AnomalyEvent[] => {
  const anomalies: AnomalyEvent[] = [];
  const standardHeight = chute.standardHeight;
  const threshold = standardHeight * HEIGHT_THRESHOLD_RATIO;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.height > threshold) {
      const existing = anomalies.find(
        (a) =>
          a.type === 'height_mismatch' &&
          Math.abs(a.position - record.position) < 1.0 &&
          Math.abs(a.timestamp - record.timestamp) < 60000
      );

      if (existing) {
        if (!existing.luggageIds.includes(record.id)) {
          existing.luggageIds.push(record.id);
        }
      } else {
        const severity = getSeverity('height_mismatch', standardHeight, record.height);
        anomalies.push({
          id: `anom-height-${anomalies.length + 1}`,
          type: 'height_mismatch',
          timestamp: record.timestamp,
          chuteId: record.chuteId,
          position: record.position,
          luggageIds: [record.id],
          severity,
          reviewed: false,
          expectedValue: standardHeight,
          actualValue: record.height,
          description: getAnomalyDescription(
            'height_mismatch',
            standardHeight,
            record.height,
            1,
            record.position
          ),
        });
      }
    }
  }

  return anomalies;
};

export const detectSpeedOver = (
  records: LuggageRecord[],
  chute: ChuteModel
): AnomalyEvent[] => {
  const anomalies: AnomalyEvent[] = [];
  const maxSpeed = chute.maxSpeed;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.speed > maxSpeed) {
      const existing = anomalies.find(
        (a) =>
          a.type === 'speed_over' &&
          Math.abs(a.position - record.position) < 2.0 &&
          Math.abs(a.timestamp - record.timestamp) < 30000
      );

      if (existing) {
        if (!existing.luggageIds.includes(record.id)) {
          existing.luggageIds.push(record.id);
          existing.actualValue = Math.max(existing.actualValue, record.speed);
        }
      } else {
        const severity = getSeverity('speed_over', maxSpeed, record.speed);
        anomalies.push({
          id: `anom-speed-${anomalies.length + 1}`,
          type: 'speed_over',
          timestamp: record.timestamp,
          chuteId: record.chuteId,
          position: record.position,
          luggageIds: [record.id],
          severity,
          reviewed: false,
          expectedValue: maxSpeed,
          actualValue: record.speed,
          description: getAnomalyDescription(
            'speed_over',
            maxSpeed,
            record.speed,
            1,
            record.position
          ),
        });
      }
    }
  }

  return anomalies;
};

export const detectStacked = (
  records: LuggageRecord[],
  chute: ChuteModel
): AnomalyEvent[] => {
  const anomalies: AnomalyEvent[] = [];
  const sortedRecords = [...records].sort((a, b) => a.timestamp - b.timestamp);

  let cluster: LuggageRecord[] = [];
  let clusterStartPosition = 0;

  for (let i = 0; i < sortedRecords.length; i++) {
    const current = sortedRecords[i];

    if (cluster.length === 0) {
      cluster.push(current);
      clusterStartPosition = current.position;
      continue;
    }

    const last = cluster[cluster.length - 1];
    const positionDiff = Math.abs(current.position - last.position);
    const timeDiff = current.timestamp - last.timestamp;

    if (positionDiff < STACK_DISTANCE_THRESHOLD && timeDiff < 30000) {
      cluster.push(current);
    } else {
      if (cluster.length >= MIN_STACK_COUNT) {
        const avgSpeed = cluster.reduce((sum, r) => sum + r.speed, 0) / cluster.length;
        const avgPosition = cluster.reduce((sum, r) => sum + r.position, 0) / cluster.length;
        const expectedSpeed = 1.5;
        const severity = getSeverity('stacked', expectedSpeed, avgSpeed);

        anomalies.push({
          id: `anom-stack-${anomalies.length + 1}`,
          type: 'stacked',
          timestamp: cluster[0].timestamp,
          chuteId: current.chuteId,
          position: avgPosition,
          luggageIds: cluster.map((r) => r.id),
          severity,
          reviewed: false,
          expectedValue: expectedSpeed,
          actualValue: avgSpeed,
          description: getAnomalyDescription(
            'stacked',
            expectedSpeed,
            avgSpeed,
            cluster.length,
            avgPosition
          ),
        });
      }
      cluster = [current];
      clusterStartPosition = current.position;
    }
  }

  if (cluster.length >= MIN_STACK_COUNT) {
    const avgSpeed = cluster.reduce((sum, r) => sum + r.speed, 0) / cluster.length;
    const avgPosition = cluster.reduce((sum, r) => sum + r.position, 0) / cluster.length;
    const expectedSpeed = 1.5;
    const severity = getSeverity('stacked', expectedSpeed, avgSpeed);

    anomalies.push({
      id: `anom-stack-${anomalies.length + 1}`,
      type: 'stacked',
      timestamp: cluster[0].timestamp,
      chuteId: cluster[0].chuteId,
      position: avgPosition,
      luggageIds: cluster.map((r) => r.id),
      severity,
      reviewed: false,
      expectedValue: expectedSpeed,
      actualValue: avgSpeed,
      description: getAnomalyDescription(
        'stacked',
        expectedSpeed,
        avgSpeed,
        cluster.length,
        avgPosition
      ),
    });
  }

  return anomalies;
};

export const detectAllAnomalies = (
  records: LuggageRecord[],
  chute: ChuteModel
): AnomalyEvent[] => {
  const heightAnomalies = detectHeightMismatch(records, chute);
  const speedAnomalies = detectSpeedOver(records, chute);
  const stackAnomalies = detectStacked(records, chute);

  return [...heightAnomalies, ...speedAnomalies, ...stackAnomalies].sort(
    (a, b) => a.timestamp - b.timestamp
  );
};

export const getAnomalyTypeLabel = (type: AnomalyType): string => {
  const labels: Record<AnomalyType, string> = {
    height_mismatch: '高度错配',
    speed_over: '速度过快',
    stacked: '行李堆积',
  };
  return labels[type];
};

export const getSeverityLabel = (severity: Severity): string => {
  const labels: Record<Severity, string> = {
    low: '低',
    medium: '中',
    high: '高',
  };
  return labels[severity];
};

export const getAnomalyTypeColor = (type: AnomalyType): string => {
  const colors: Record<AnomalyType, string> = {
    height_mismatch: '#F53F3F',
    speed_over: '#FF7D00',
    stacked: '#FFAA00',
  };
  return colors[type];
};

export const getSeverityColor = (severity: Severity): string => {
  const colors: Record<Severity, string> = {
    low: '#00B42A',
    medium: '#FF7D00',
    high: '#F53F3F',
  };
  return colors[severity];
};
