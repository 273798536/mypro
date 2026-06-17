import type { TowerData } from '@/types';

const materialNameMap: Record<string, string> = {
  'PVC冷却填料': 'PVC冷却塔填料',
  'PP填料片': 'PP冷却塔填料',
  '玻璃冷却塔': '玻璃钢冷却塔',
  '冷却喷头': '冷却塔喷头',
  '收水器': '冷却塔收水器',
  '冷却风机': '冷却塔风机',
  '布水器': '冷却塔布水器',
};

export function normalizeMaterialName(name: string): string {
  return materialNameMap[name] || name;
}

export function isNameMismatch(name: string): boolean {
  return name in materialNameMap;
}

export function recalculateData(item: TowerData): TowerData {
  if (!item.isNameMismatch || !item.standardMaterialName) {
    return item;
  }

  const newItem = { ...item };

  const adjustmentFactor = 0.98;
  newItem.dropletValue = Math.round(item.dropletValue * adjustmentFactor * 10) / 10;
  newItem.deviation = Math.round((newItem.dropletValue - item.threshold) / item.threshold * 1000) / 10;

  if (newItem.deviation < -5) {
    newItem.status = 'normal';
  } else if (newItem.deviation < 10) {
    newItem.status = 'normal';
  } else if (newItem.deviation < 20) {
    newItem.status = 'warning';
  } else {
    newItem.status = 'critical';
  }

  newItem.materialName = item.standardMaterialName;
  newItem.isNameMismatch = false;
  newItem.updatedAt = new Date().toISOString();

  return newItem;
}

export function compareData(original: TowerData, recalculated: TowerData): {
  hasValueDiff: boolean;
  hasStatusDiff: boolean;
  hasNameDiff: boolean;
  valueDiff: number;
  statusDiff: string;
} {
  return {
    hasValueDiff: Math.abs(original.dropletValue - recalculated.dropletValue) > 0.01,
    hasStatusDiff: original.status !== recalculated.status,
    hasNameDiff: original.materialName !== recalculated.materialName,
    valueDiff: Math.round((recalculated.dropletValue - original.dropletValue) * 10) / 10,
    statusDiff: `${original.status} → ${recalculated.status}`,
  };
}

const BASELINE_DATETIME = '2026-06-18T09:00:00.000Z';

const FIXED_DATE_LABELS = ['6/12', '6/13', '6/14', '6/15', '6/16', '6/17', '6/18'];

const ORIGINAL_TREND_VARIATIONS = [
  [-5.2,  2.1, -1.8,  4.3, -3.6,  1.5,  0.8],
  [ 3.4, -2.7,  5.1, -0.9,  2.8, -4.2,  1.9],
];

const RECALC_TREND_VARIATIONS = [
  [-3.1,  1.5, -0.9,  2.8, -2.4,  0.8,  0.3],
  [ 2.1, -1.8,  3.6, -0.5,  1.9, -2.8,  1.2],
];

function seededIndex(baseValue: number, count: number): number {
  return Math.floor(Math.abs(baseValue * 7)) % count;
}

export function generateTrendData(baseValue: number, days: number = 7): { date: string; value: number }[] {
  const labels = FIXED_DATE_LABELS.slice(-days);
  const seed = seededIndex(baseValue, ORIGINAL_TREND_VARIATIONS.length);
  const variations = ORIGINAL_TREND_VARIATIONS[seed];

  return labels.map((date, idx) => ({
    date,
    value: Math.round((baseValue + variations[idx]) * 10) / 10,
  }));
}

export function generateRecalcTrendData(baseValue: number, days: number = 7): { date: string; value: number }[] {
  const labels = FIXED_DATE_LABELS.slice(-days);
  const seed = seededIndex(baseValue, RECALC_TREND_VARIATIONS.length);
  const variations = RECALC_TREND_VARIATIONS[seed];
  const adjustmentFactor = 0.98;
  const adjustedBase = baseValue * adjustmentFactor;

  return labels.map((date, idx) => ({
    date,
    value: Math.round((adjustedBase + variations[idx]) * 10) / 10,
  }));
}
