import type { AdditiveItem, SafetyAlert, AlertLevel } from '@/types';

export function evaluateAlertLevel(item: AdditiveItem): AlertLevel {
  if (!Number.isFinite(item.convertedMgPerKg) || item.limitValue <= 0) return 'warning';
  const ratio = item.convertedMgPerKg / item.limitValue;
  if (ratio >= 1) return 'danger';
  if (ratio >= 0.8) return 'warning';
  return 'safe';
}

const STANDARD_CLAUSES: Record<string, string> = {
  'GB 2760 山梨酸钾': 'GB 2760-2014 表 A.1 山梨酸及其钾盐，使用范围及最大使用量以山梨酸计',
  'GB 2760 苯甲酸': 'GB 2760-2014 表 A.1 苯甲酸及其钠盐，使用范围及最大使用量以苯甲酸计',
  'GB 2760 柠檬黄': 'GB 2760-2014 表 A.1 柠檬黄及其铝色淀，以柠檬黄计',
  'GB 2760 胭脂红': 'GB 2760-2014 表 A.1 胭脂红及其铝色淀，以胭脂红计',
  'GB 2760 甜蜜素': 'GB 2760-2014 表 A.1 环己基氨基磺酸钠（甜蜜素），以环己基氨基磺酸计',
  'GB 2760 安赛蜜': 'GB 2760-2014 表 A.1 乙酰磺胺酸钾（安赛蜜）',
  'GB 2760 糖精钠': 'GB 2760-2014 表 A.1 糖精钠，以糖精计',
  'GB 2760 亚硝酸钠': 'GB 2760-2014 表 A.1 亚硝酸钠、亚硝酸钾，以亚硝酸钠计',
};

export function findStandardClause(limitStandard: string): string {
  return STANDARD_CLAUSES[limitStandard] || `执行标准：${limitStandard || '未注明'}`;
}

export function buildSafetyAlert(item: AdditiveItem): SafetyAlert {
  const level = evaluateAlertLevel(item);
  const clause = findStandardClause(item.limitStandard);

  let message = '';
  if (level === 'safe') {
    const ratio = item.limitValue > 0 ? (item.convertedMgPerKg / item.limitValue * 100).toFixed(1) : '—';
    message = `${item.name} 实测 ${item.convertedMgPerKg} mg/kg，占限量 ${ratio}%，处于安全区间`;
  } else if (level === 'warning') {
    message = `${item.name} 实测值已达限量 80% 以上，建议复核人员重点关注工艺稳定性，必要时启动复测`;
  } else {
    const exceed = item.limitValue > 0
      ? (((item.convertedMgPerKg - item.limitValue) / item.limitValue) * 100).toFixed(1)
      : '—';
    message = `${item.name} 实测值超过国家标准限量 ${exceed}%，判为不合格，不得放行`;
  }

  return {
    id: `alert-${item.id}`,
    recordId: item.recordId,
    level,
    message,
    standardClause: clause,
    additiveName: item.name,
  };
}

export function generateAllSafetyAlerts(items: AdditiveItem[]): SafetyAlert[] {
  return items.map(buildSafetyAlert);
}
