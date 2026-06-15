import { SalinityUnit, SALINITY_UNIT_FACTORS, TideUnit } from '../types/common';

export function convertSalinity(
  value: number,
  fromUnit: SalinityUnit,
  toUnit: SalinityUnit = SalinityUnit.PSU
): { value: number; explanation: string } {
  const fromFactor = SALINITY_UNIT_FACTORS[fromUnit];
  const toFactor = SALINITY_UNIT_FACTORS[toUnit];
  const converted = (value * fromFactor) / toFactor;

  const explanation = `原始数据使用${fromUnit}单位，已按照 1 ${fromUnit} = ${fromFactor / toFactor} ${toUnit} 的换算关系转换为标准${toUnit}单位。`;

  return { value: converted, explanation };
}

export function convertTideLevel(
  value: number,
  fromUnit: TideUnit,
  toUnit: TideUnit = TideUnit.METER
): { value: number; explanation: string } {
  let converted: number;
  if (fromUnit === TideUnit.CENTIMETER && toUnit === TideUnit.METER) {
    converted = value / 100;
  } else if (fromUnit === TideUnit.METER && toUnit === TideUnit.CENTIMETER) {
    converted = value * 100;
  } else {
    converted = value;
  }

  const explanation = fromUnit === toUnit
    ? `潮位单位已为${toUnit}，无需转换。`
    : `原始数据使用${fromUnit}，已转换为标准${toUnit}（${fromUnit === TideUnit.CENTIMETER ? '除以100' : '乘以100'}）。`;

  return { value: converted, explanation };
}

export function normalizeSalinityUnit(unit: string): SalinityUnit {
  const normalized = unit.trim().toLowerCase();
  if (normalized === 'psu' || normalized === 'p.s.u.') return SalinityUnit.PSU;
  if (normalized === 'ppt' || normalized === 'parts per thousand') return SalinityUnit.PPT;
  if (normalized === '‰' || normalized === 'per mille' || normalized === 'permille') return SalinityUnit.PERMILLE;
  if (normalized === 'mg/l' || normalized === 'mg/l' || normalized === 'milligram per liter') return SalinityUnit.MG_L;
  return SalinityUnit.PSU;
}

export function detectSalinityUnitMismatch(
  records: { salinityUnit: SalinityUnit }[],
  expectedUnit: SalinityUnit = SalinityUnit.PSU
): { mismatched: number; explanation: string } {
  const uniqueUnits = new Set(records.map(r => r.salinityUnit));
  const mismatched = records.filter(r => r.salinityUnit !== expectedUnit).length;

  const unitList = Array.from(uniqueUnits).join('、');
  const explanation = uniqueUnits.size > 1
    ? `检测到${uniqueUnits.size}种盐度单位混用：${unitList}。建议统一为标准${expectedUnit}单位。`
    : `所有记录盐度单位一致，均为${expectedUnit}。`;

  return { mismatched, explanation };
}
