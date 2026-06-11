import { BoomPoint, MixedUnitRecord } from '../types';

const FLOOR_UNIT_PATTERNS: Record<string, string[]> = {
  meter: ['米', 'm', 'M', '公尺'],
  floor: ['层', '楼', 'F', 'f', 'floor'],
};

export function detectFloorUnitCategory(unit: string): string {
  const normalized = unit.trim().toLowerCase();
  for (const [category, patterns] of Object.entries(FLOOR_UNIT_PATTERNS)) {
    if (patterns.some(p => normalized.includes(p.toLowerCase()))) {
      return category;
    }
  }
  return 'unknown';
}

export function normalizeFloorUnit(unit: string, targetUnit: string): string {
  return targetUnit;
}

export function detectMixedUnits(points: BoomPoint[]): MixedUnitRecord[] {
  const boomGroups = new Map<string, BoomPoint[]>();

  for (const point of points) {
    const group = boomGroups.get(point.boomId) || [];
    group.push(point);
    boomGroups.set(point.boomId, group);
  }

  const mixedRecords: MixedUnitRecord[] = [];

  for (const [boomId, boomPoints] of boomGroups) {
    const unitCounts = new Map<string, number>();
    for (const p of boomPoints) {
      const category = detectFloorUnitCategory(p.floorUnit);
      unitCounts.set(category, (unitCounts.get(category) || 0) + 1);
    }

    if (unitCounts.size <= 1) continue;

    let dominantUnit = '';
    let maxCount = 0;
    for (const [unit, count] of unitCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantUnit = unit;
      }
    }

    for (const point of boomPoints) {
      const category = detectFloorUnitCategory(point.floorUnit);
      if (category !== dominantUnit && category !== 'unknown') {
        mixedRecords.push({
          pointId: point.id,
          boomId,
          floorUnit: point.floorUnit,
          detectedUnit: dominantUnit,
          confidence: 0.85,
          suggestion: `建议统一为 "${dominantUnit === 'meter' ? '米' : '层'}" 单位`,
        });
      }
    }
  }

  return mixedRecords;
}

export function isMixedUnitPoint(point: BoomPoint, allPoints: BoomPoint[]): boolean {
  const mixed = detectMixedUnits(allPoints);
  return mixed.some(m => m.pointId === point.id);
}

export function getAnomalyTypeLabel(type?: string): string {
  const labels: Record<string, string> = {
    value_out_of_range: '数值越界',
    unit_mismatch: '单位不匹配',
    floor_mismatch: '楼层异常',
    other: '其他异常',
  };
  return type ? labels[type] || '未知' : '正常';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '待处理',
    confirmed: '已确认',
    resolved: '已解决',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#ffa502',
    confirmed: '#ff4757',
    resolved: '#2ed573',
  };
  return colors[status] || '#888';
}
