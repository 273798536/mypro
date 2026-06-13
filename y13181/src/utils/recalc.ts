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

export function generateTrendData(baseValue: number, days: number = 7): { date: string; value: number }[] {
  const data = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const variation = (Math.random() - 0.5) * 20;
    const value = Math.round((baseValue + variation) * 10) / 10;
    
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      value,
    });
  }
  
  return data;
}
