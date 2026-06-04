import { ArrowRecord, RecordStatus } from '@/types';

export function detectCoordinateFlip(
  current: ArrowRecord,
  previous: ArrowRecord | null
): RecordStatus {
  if (!previous) {
    return current.status;
  }

  const directionDiff = Math.abs(current.direction - previous.direction);
  if (directionDiff > 170 && directionDiff < 190) {
    return 'flipped';
  }

  const yDiff = current.y - previous.y;
  if (Math.abs(yDiff) > 100 && previous.y !== 0) {
    const ratio = yDiff / previous.y;
    if (ratio < -0.8) {
      return 'flipped';
    }
  }

  if (directionDiff > 90) {
    return 'warning';
  }

  return 'normal';
}

export function detectAnomalies(records: ArrowRecord[]): ArrowRecord[] {
  return records.map((record, index) => {
    if (index === 0) return record;
    
    const prevRecord = records[index - 1];
    const detectedStatus = detectCoordinateFlip(record, prevRecord);
    
    if (detectedStatus !== record.status && record.status === 'normal') {
      return { ...record, status: detectedStatus };
    }
    
    return record;
  });
}

export function getStatusExplanation(status: RecordStatus): string {
  const explanations: Record<RecordStatus, string> = {
    normal: '该记录数据正常，方向和坐标均在合理范围内。',
    flipped: '【重要】坐标翻转！该记录的方向与前后记录相差约180度，或Y轴坐标出现异常反转。这种数据不能用于教研分析，可能是传感器故障或数据采集错误导致的。',
    warning: '该记录存在潜在问题，方向或坐标变化超出正常范围，建议人工复核确认。',
    pending: '该记录尚未经过复核，请检查确认后标记状态。',
  };
  return explanations[status];
}
