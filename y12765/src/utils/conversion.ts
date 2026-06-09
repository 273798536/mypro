import type { AdditiveItem } from '@/types';

export type ConcentrationUnit = 'mg/kg' | 'ppm' | 'μg/mL' | 'g/kg';

const UNIT_TO_MG_PER_KG: Record<ConcentrationUnit, number> = {
  'mg/kg': 1,
  'ppm': 1,
  'μg/mL': 1,
  'g/kg': 1000,
};

export function convertToMgPerKg(value: number, unit: ConcentrationUnit): number {
  if (!Number.isFinite(value) || value < 0) return NaN;
  const factor = UNIT_TO_MG_PER_KG[unit];
  if (!factor) return NaN;
  return Number((value * factor).toFixed(4));
}

export function convertFromMgPerKg(valueMgPerKg: number, targetUnit: ConcentrationUnit): number {
  if (!Number.isFinite(valueMgPerKg) || valueMgPerKg < 0) return NaN;
  const factor = UNIT_TO_MG_PER_KG[targetUnit];
  if (!factor) return NaN;
  return Number((valueMgPerKg / factor).toFixed(4));
}

export function convertConcentration(
  value: number,
  fromUnit: ConcentrationUnit,
  toUnit: ConcentrationUnit,
): number {
  if (fromUnit === toUnit) return value;
  const mgPerKg = convertToMgPerKg(value, fromUnit);
  if (Number.isNaN(mgPerKg)) return NaN;
  return convertFromMgPerKg(mgPerKg, toUnit);
}

export function recalculateItemConversions(item: AdditiveItem): AdditiveItem {
  const converted = convertToMgPerKg(item.measuredValue, item.measuredUnit);
  const isPass = Number.isFinite(converted) && item.limitValue > 0 && converted <= item.limitValue;
  let failureReason = '';
  if (!Number.isFinite(converted)) {
    failureReason = '检测值无效，无法完成换算';
  } else if (item.limitValue <= 0) {
    failureReason = '限量值未正确配置';
  } else if (converted > item.limitValue) {
    const exceed = Number((((converted - item.limitValue) / item.limitValue) * 100).toFixed(1));
    failureReason = `实测值 ${converted} mg/kg 超过限量 ${item.limitValue} mg/kg，超出 ${exceed}%`;
  }
  return { ...item, convertedMgPerKg: converted, isPass, failureReason };
}

export const CONVERSION_FORMULAS = [
  {
    id: 'f-mgkg-ppm',
    name: 'mg/kg 与 ppm 换算',
    formula: '1 mg/kg = 1 ppm',
    unit: 'mg/kg ↔ ppm',
    scope: '适用于食品基质中质量-质量比的残留浓度换算，假设样品密度约为 1 kg/L',
    failureReasons: [
      '样品密度显著偏离 1 kg/L 时误差增大',
      '不适用于体积-体积比的液体样品直接换算',
    ],
  },
  {
    id: 'f-ugml-mgkg',
    name: 'μg/mL 与 mg/kg 换算',
    formula: '1 μg/mL = 1 mg/kg（提取液稀释比 1:1 时）',
    unit: 'μg/mL → mg/kg',
    scope: '适用于样品经提取定容后，仪器直接读 μg/mL 的换算，需同步代入稀释因子',
    failureReasons: [
      '未考虑稀释因子/称样量导致结果偏差',
      '提取不完全或基质效应未校正',
    ],
  },
  {
    id: 'f-gkg-mgkg',
    name: 'g/kg 与 mg/kg 换算',
    formula: '1 g/kg = 1000 mg/kg',
    unit: 'g/kg ↔ mg/kg',
    scope: '防腐剂、甜味剂等高浓度添加剂常用单位换算',
    failureReasons: [
      '小数点位数错误导致千倍级偏差',
      '有效数字保留不当引起报告合规争议',
    ],
  },
];
