import { StationRecord, CANVAS_WIDTH, CANVAS_HEIGHT, FLIP_THRESHOLD, ColorRule } from '../types';

export function detectCoordinateFlip(record: { xCoordinate: number; yCoordinate: number }): boolean {
  const { xCoordinate, yCoordinate } = record;

  if (xCoordinate < 0 || xCoordinate > CANVAS_WIDTH) {
    return true;
  }

  if (yCoordinate < 0 || yCoordinate > CANVAS_HEIGHT) {
    return true;
  }

  if (xCoordinate > yCoordinate && Math.abs(xCoordinate - yCoordinate) > FLIP_THRESHOLD) {
    return true;
  }

  const reasonableAspect = xCoordinate / (yCoordinate || 1);
  if (reasonableAspect > 5 || reasonableAspect < 0.15) {
    return true;
  }

  return false;
}

export function generateFlipExplanation(record: StationRecord): string {
  if (!record.isFlipped) return '';

  const { xCoordinate, yCoordinate } = record;
  const reasons: string[] = [];

  if (xCoordinate < 0 || xCoordinate > CANVAS_WIDTH) {
    reasons.push(`X坐标 ${xCoordinate} 超出画布有效范围 (0-${CANVAS_WIDTH})`);
  }
  if (yCoordinate < 0 || yCoordinate > CANVAS_HEIGHT) {
    reasons.push(`Y坐标 ${yCoordinate} 超出画布有效范围 (0-${CANVAS_HEIGHT})`);
  }
  if (xCoordinate > yCoordinate && Math.abs(xCoordinate - yCoordinate) > FLIP_THRESHOLD) {
    reasons.push(`X坐标(${xCoordinate})远大于Y坐标(${yCoordinate})，疑似坐标值发生翻转`);
  }

  const reasonText = reasons.length > 0 ? reasons.join('；') : '坐标值分布异常';

  return `【坐标翻转异常说明】记录「${record.label}」检测到坐标异常：X=${xCoordinate}，Y=${yCoordinate}。问题原因：${reasonText}。请车间主管核对原始采集数据，确认横纵坐标是否填写颠倒，或设备定位时坐标系统是否设置正确。处理建议：1. 对照现场站位图重新确认该点位；2. 如确认是录入错误，修正后重新标注；3. 如数据来源本身异常，请标记为坏数据并备注说明。`;
}

export function generateSimpleFlipExplanation(record: StationRecord): string {
  if (!record.isFlipped) return '';
  return `该记录坐标疑似翻转（X=${record.xCoordinate}, Y=${record.yCoordinate}），请核对原始数据后再使用。`;
}

export const COLOR_RULES: ColorRule[] = [
  {
    status: 'success',
    color: '#4CAF50',
    label: '顺利',
    description: '坐标正常、状态明确、无需人工干预，可直接使用的记录',
  },
  {
    status: 'pending',
    color: '#FFC107',
    label: '待确认',
    description: '存在坐标异常或标注不完整，需要人工审核确认后方可使用',
  },
  {
    status: 'error',
    color: '#F44336',
    label: '坏数据',
    description: '明显错误或无法使用的记录，应标记废弃不得投入使用',
  },
  {
    status: 'flipped',
    color: '#FF6B35',
    label: '坐标翻转',
    description: '检测到横纵坐标值疑似颠倒，必须人工复核原始数据',
  },
];

export function getStatusColor(status: string, isFlipped?: boolean): string {
  if (isFlipped) return '#FF6B35';
  switch (status) {
    case 'success':
      return '#4CAF50';
    case 'pending':
      return '#FFC107';
    case 'error':
      return '#F44336';
    default:
      return '#94A3B8';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'success':
      return '顺利';
    case 'pending':
      return '待确认';
    case 'error':
      return '坏数据';
    default:
      return '未知';
  }
}

export function getTypeLabel(type: string): string {
  switch (type) {
    case 'guide':
      return '导流标识';
    case 'warning':
      return '警示标识';
    case 'info':
      return '信息标识';
    default:
      return '未知类型';
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function calculateRecordScore(record: StationRecord): number {
  let score = 100;

  if (record.isFlipped) score -= 40;
  if (record.status === 'error') score -= 60;
  if (record.status === 'pending') score -= 20;
  if (!record.annotation && record.status !== 'success') score -= 10;
  if (!record.deviceId) score -= 10;

  return Math.max(0, Math.min(100, score));
}
