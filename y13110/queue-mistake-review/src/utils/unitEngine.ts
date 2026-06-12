import type { UnitInfo, UnitCheckResult } from '../types';

interface UnitConversion {
  category: string;
  baseUnit: string;
  units: Record<string, number>;
}

export const unitConversions: UnitConversion[] = [
  {
    category: '长度',
    baseUnit: 'm',
    units: {
      'm': 1,
      '米': 1,
      'km': 1000,
      '千米': 1000,
      '公里': 1000,
      'cm': 0.01,
      '厘米': 0.01,
      'mm': 0.001,
      '毫米': 0.001,
      'dm': 0.1,
      '分米': 0.1,
    }
  },
  {
    category: '质量',
    baseUnit: 'kg',
    units: {
      'kg': 1,
      '千克': 1,
      '公斤': 1,
      'g': 0.001,
      '克': 0.001,
      'mg': 0.000001,
      '毫克': 0.000001,
      't': 1000,
      '吨': 1000,
    }
  },
  {
    category: '时间',
    baseUnit: 's',
    units: {
      's': 1,
      '秒': 1,
      'min': 60,
      '分钟': 60,
      '分': 60,
      'h': 3600,
      '小时': 3600,
      '时': 3600,
      '天': 86400,
      '日': 86400,
    }
  },
  {
    category: '面积',
    baseUnit: 'm²',
    units: {
      'm²': 1,
      '平方米': 1,
      '平米': 1,
      'km²': 1000000,
      '平方千米': 1000000,
      '平方公里': 1000000,
      'cm²': 0.0001,
      '平方厘米': 0.0001,
      '公顷': 10000,
      '亩': 666.67,
    }
  },
  {
    category: '体积',
    baseUnit: 'm³',
    units: {
      'm³': 1,
      '立方米': 1,
      'L': 0.001,
      '升': 0.001,
      'mL': 0.000001,
      '毫升': 0.000001,
      'cm³': 0.000001,
      '立方厘米': 0.000001,
    }
  },
  {
    category: '速度',
    baseUnit: 'm/s',
    units: {
      'm/s': 1,
      '米/秒': 1,
      'km/h': 0.27778,
      '千米/时': 0.27778,
      '公里/小时': 0.27778,
    }
  },
  {
    category: '密度',
    baseUnit: 'kg/m³',
    units: {
      'kg/m³': 1,
      '千克/立方米': 1,
      'g/cm³': 1000,
      '克/立方厘米': 1000,
    }
  },
  {
    category: '压强',
    baseUnit: 'Pa',
    units: {
      'Pa': 1,
      '帕': 1,
      '帕斯卡': 1,
      'kPa': 1000,
      '千帕': 1000,
      'MPa': 1000000,
      '兆帕': 1000000,
      'atm': 101325,
      '标准大气压': 101325,
    }
  },
  {
    category: '能量',
    baseUnit: 'J',
    units: {
      'J': 1,
      '焦耳': 1,
      'kJ': 1000,
      '千焦': 1000,
      'cal': 4.184,
      '卡路里': 4.184,
      'kcal': 4184,
      '千卡': 4184,
      '度': 3600000,
      '千瓦时': 3600000,
      'kW·h': 3600000,
    }
  },
  {
    category: '功率',
    baseUnit: 'W',
    units: {
      'W': 1,
      '瓦': 1,
      '瓦特': 1,
      'kW': 1000,
      '千瓦': 1000,
      'MW': 1000000,
      '兆瓦': 1000000,
    }
  }
];

export function findUnitCategory(unit: string): UnitConversion | null {
  for (const conv of unitConversions) {
    if (unit in conv.units) {
      return conv;
    }
  }
  return null;
}

export function getUnitCategory(unit: string): string {
  const category = findUnitCategory(unit);
  return category ? category.category : '未知';
}

export function isSameCategory(unit1: string, unit2: string): boolean {
  const cat1 = findUnitCategory(unit1);
  const cat2 = findUnitCategory(unit2);
  if (!cat1 || !cat2) return false;
  return cat1.category === cat2.category;
}

export function convertUnit(value: number, fromUnit: string, toUnit: string): number | null {
  const category = findUnitCategory(fromUnit);
  if (!category) return null;
  if (!(toUnit in category.units)) return null;
  
  const baseValue = value * category.units[fromUnit];
  const result = baseValue / category.units[toUnit];
  return result;
}

export function parseUnitText(text: string): UnitInfo | null {
  if (!text || text.trim() === '') return null;
  
  const trimmed = text.trim();
  const match = trimmed.match(/^([\d.]+)\s*(.*)$/);
  
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].trim() || '';
    return {
      value,
      unit,
      rawText: trimmed
    };
  }
  
  const numMatch = trimmed.match(/^[\d.]+$/);
  if (numMatch) {
    return {
      value: parseFloat(trimmed),
      unit: '',
      rawText: trimmed
    };
  }
  
  return null;
}

export function checkUnits(
  formulaUnit: string | undefined,
  answerUnit: string | undefined,
  studentAnswerText?: string
): UnitCheckResult {
  const missingUnits: string[] = [];
  let unitMismatch: UnitCheckResult['unitMismatch'] = null;
  let conversionHint: string | undefined;
  
  if (!formulaUnit || formulaUnit.trim() === '') {
    missingUnits.push('公式单位');
  }
  
  if (!answerUnit || answerUnit.trim() === '') {
    missingUnits.push('答案单位');
  }
  
  if (studentAnswerText) {
    const parsed = parseUnitText(studentAnswerText);
    if (parsed && !parsed.unit) {
      missingUnits.push('学生答案单位');
    }
  }
  
  if (formulaUnit && answerUnit && formulaUnit !== answerUnit) {
    if (isSameCategory(formulaUnit, answerUnit)) {
      const converted = convertUnit(1, formulaUnit, answerUnit);
      if (converted !== null) {
        unitMismatch = {
          formulaUnit,
          answerUnit,
          suggestion: `1 ${formulaUnit} = ${converted.toFixed(4)} ${answerUnit}`
        };
        const deviationPercent = Math.abs(1 - converted) * 100;
        conversionHint = `提示：公式单位为${formulaUnit}，答案单位为${answerUnit}，计算时注意单位换算，结果可能偏差${deviationPercent.toFixed(2)}%`;
      }
    } else {
      const cat1 = getUnitCategory(formulaUnit);
      const cat2 = getUnitCategory(answerUnit);
      unitMismatch = {
        formulaUnit,
        answerUnit,
        suggestion: `公式单位属于「${cat1}」类，答案单位属于「${cat2}」类，单位类别不匹配`
      };
    }
  }
  
  return {
    passed: missingUnits.length === 0 && !unitMismatch,
    missingUnits,
    unitMismatch,
    conversionHint
  };
}

export function formatUnitValue(value: number, unit: string, decimals: number = 2): string {
  return `${value.toFixed(decimals)} ${unit}`;
}

export function getCommonUnits(): string[] {
  const units: string[] = [];
  for (const conv of unitConversions) {
    units.push(...Object.keys(conv.units));
  }
  return [...new Set(units)];
}
