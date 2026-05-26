import { ValidationError, Building, SunlightTimeSlot, SunlightGap } from '../types';

export function validateBuildingData(
  building: Building,
  index: number
): ValidationError | null {
  const errors: string[] = [];

  if (building.height <= 0) {
    errors.push(`楼栋高度必须大于0，当前值: ${building.height}`);
  }

  if (building.height > 200) {
    errors.push(`楼栋高度异常 (>200m)，当前值: ${building.height}`);
  }

  if (!building.name || building.name.trim() === '') {
    errors.push('楼栋名称不能为空');
  }

  if (building.dimensions.some(d => d <= 0)) {
    errors.push(`楼栋尺寸必须大于0，当前值: [${building.dimensions.join(', ')}]`);
  }

  if (errors.length > 0) {
    return {
      id: `building-error-${building.id}-${Date.now()}`,
      type: 'data',
      message: errors.join('; '),
      source: building.source,
      sourceLine: building.sourceLine,
      severity: building.height > 200 ? 'warning' : 'error',
      timestamp: Date.now()
    };
  }

  return null;
}

export function validateShadowClipping(
  buildingHeight: number,
  shadowLength: number,
  source: string,
  sourceLine: number
): ValidationError | null {
  const ratio = shadowLength / Math.max(buildingHeight, 1);
  
  if (ratio > 15) {
    return {
      id: `clipping-error-${Date.now()}`,
      type: 'clipping',
      message: `阴影长度异常，阴影/楼高比=${ratio.toFixed(2)}，可能存在穿模问题`,
      source,
      sourceLine,
      severity: 'warning',
      timestamp: Date.now()
    };
  }

  return null;
}

export function detectTimeGaps(
  timeSlots: SunlightTimeSlot[],
  expectedInterval: number = 5,
  source: string,
  sourceLine: number
): { gaps: SunlightGap[]; errors: ValidationError[] } {
  const gaps: SunlightGap[] = [];
  const errors: ValidationError[] = [];

  if (timeSlots.length < 2) {
    return { gaps, errors };
  }

  for (let i = 1; i < timeSlots.length; i++) {
    const prevEnd = timeSlots[i - 1].end;
    const currStart = timeSlots[i].start;
    const diff = currStart - prevEnd;

    if (diff > expectedInterval * 2) {
      const gap: SunlightGap = {
        start: prevEnd,
        end: currStart,
        reason: `数据间隔异常: 期望${expectedInterval}分钟，实际${diff}分钟`
      };
      gaps.push(gap);

      errors.push({
        id: `gap-error-${i}-${Date.now()}`,
        type: 'gap',
        message: `日照统计时段漏检: 第${i}个时段前存在${diff}分钟数据缺口 (${formatTime(prevEnd)} - ${formatTime(currStart)})`,
        source,
        sourceLine: sourceLine + i,
        severity: 'error',
        timestamp: Date.now()
      });
    }
  }

  return { gaps, errors };
}

export function checkDataContinuity(
  startTime: number,
  endTime: number,
  expectedSlots: number,
  actualSlots: number,
  source: string,
  sourceLine: number
): ValidationError | null {
  const missingRatio = 1 - (actualSlots / expectedSlots);
  
  if (missingRatio > 0.1) {
    return {
      id: `continuity-error-${Date.now()}`,
      type: 'gap',
      message: `数据连续性不足，缺失${(missingRatio * 100).toFixed(1)}%的时段数据。期望${expectedSlots}条，实际${actualSlots}条`,
      source,
      sourceLine,
      severity: 'error',
      timestamp: Date.now()
    };
  }

  return null;
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function formatErrorLocation(error: ValidationError): string {
  return `[${error.source}:${error.sourceLine}]`;
}

export function getErrorTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    timezone: '时区错误',
    clipping: '阴影穿模',
    gap: '时段漏检',
    data: '数据错误'
  };
  return labels[type] || type;
}
