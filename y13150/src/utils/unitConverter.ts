import { UnitConversion } from '../types';

const unitFactors: Record<string, Record<string, number>> = {
  's': { 'ms': 1000, 'μs': 1000000, 'min': 1/60, 's': 1 },
  'ms': { 's': 0.001, 'μs': 1000, 'min': 1/60000, 'ms': 1 },
  'μs': { 's': 0.000001, 'ms': 0.001, 'min': 1/60000000, 'μs': 1 },
  'min': { 's': 60, 'ms': 60000, 'μs': 60000000, 'min': 1 },
  'm': { 'cm': 100, 'mm': 1000, 'km': 0.001, 'ft': 3.28084, 'in': 39.3701, 'm': 1 },
  'cm': { 'm': 0.01, 'mm': 10, 'km': 0.00001, 'ft': 0.0328084, 'in': 0.393701, 'cm': 1 },
  'mm': { 'm': 0.001, 'cm': 0.1, 'km': 0.000001, 'ft': 0.00328084, 'in': 0.0393701, 'mm': 1 },
  'km': { 'm': 1000, 'cm': 100000, 'mm': 1000000, 'ft': 3280.84, 'in': 39370.1, 'km': 1 },
  'ft': { 'm': 0.3048, 'cm': 30.48, 'mm': 304.8, 'km': 0.0003048, 'in': 12, 'ft': 1 },
  'in': { 'm': 0.0254, 'cm': 2.54, 'mm': 25.4, 'km': 0.0000254, 'ft': 1/12, 'in': 1 },
  'm³': { 'cm³': 1e6, 'mm³': 1e9, 'L': 1000, 'ft³': 35.3147, 'm³': 1 },
  'cm³': { 'm³': 1e-6, 'mm³': 1000, 'L': 0.001, 'ft³': 3.53147e-5, 'cm³': 1 },
  'L': { 'm³': 0.001, 'cm³': 1000, 'mm³': 1e6, 'ft³': 0.0353147, 'L': 1 },
  'ft³': { 'm³': 0.0283168, 'cm³': 28316.8, 'L': 28.3168, 'mm³': 2.83168e7, 'ft³': 1 },
  'm²': { 'cm²': 10000, 'mm²': 1e6, 'ft²': 10.7639, 'dm²': 100, 'm²': 1 },
  'cm²': { 'm²': 0.0001, 'mm²': 100, 'ft²': 0.00107639, 'dm²': 0.01, 'cm²': 1 },
  'dm²': { 'm²': 0.01, 'cm²': 100, 'mm²': 10000, 'ft²': 0.107639, 'dm²': 1 },
  'ft²': { 'm²': 0.092903, 'cm²': 929.03, 'mm²': 92903, 'dm²': 9.2903, 'ft²': 1 },
  'Hz': { 'kHz': 0.001, 'MHz': 1e-6, 'Hz': 1 },
  'kHz': { 'Hz': 1000, 'MHz': 0.001, 'kHz': 1 },
  'MHz': { 'Hz': 1e6, 'kHz': 1000, 'MHz': 1 },
  'dB': { 'dB': 1 },
  '°C': { '°C': 1 },
  '%': { '%': 1 },
};

const unitDisplayNames: Record<string, string> = {
  's': '秒',
  'ms': '毫秒',
  'μs': '微秒',
  'min': '分钟',
  'm': '米',
  'cm': '厘米',
  'mm': '毫米',
  'km': '千米',
  'ft': '英尺',
  'in': '英寸',
  'm³': '立方米',
  'cm³': '立方厘米',
  'L': '升',
  'ft³': '立方英尺',
  'm²': '平方米',
  'cm²': '平方厘米',
  'dm²': '平方分米',
  'ft²': '平方英尺',
  'Hz': '赫兹',
  'kHz': '千赫',
  'MHz': '兆赫',
  'dB': '分贝',
  '°C': '摄氏度',
  '%': '百分比',
};

export function detectUnit(rawValue: string): { value: number; unit: string; raw: string } {
  const trimmed = rawValue.trim();
  
  const patterns = [
    /^([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*(s|ms|μs|min|m|cm|mm|km|ft|in|m³|cm³|dm³|L|ft³|m²|cm²|dm²|ft²|Hz|kHz|MHz|dB|°C|%)?$/i,
    /^([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*(秒|毫秒|微秒|分钟|米|厘米|毫米|千米|英尺|英寸|立方米|立方厘米|立方分米|升|立方英尺|平方米|平方厘米|平方分米|平方英尺|赫兹|千赫|兆赫|分贝|摄氏度|%)?$/,
  ];

  const unitMap: Record<string, string> = {
    '秒': 's',
    '毫秒': 'ms',
    '微秒': 'μs',
    '分钟': 'min',
    '米': 'm',
    '厘米': 'cm',
    '毫米': 'mm',
    '千米': 'km',
    '英尺': 'ft',
    '英寸': 'in',
    '立方米': 'm³',
    '立方厘米': 'cm³',
    '立方分米': 'dm³',
    '升': 'L',
    '立方英尺': 'ft³',
    '平方米': 'm²',
    '平方厘米': 'cm²',
    '平方分米': 'dm²',
    '平方英尺': 'ft²',
    '赫兹': 'Hz',
    '千赫': 'kHz',
    '兆赫': 'MHz',
    '分贝': 'dB',
    '摄氏度': '°C',
  };

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      let unit = match[2] || '';
      unit = unitMap[unit] || unit || '';
      return { value, unit, raw: trimmed };
    }
  }

  const numMatch = trimmed.match(/^([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/);
  if (numMatch) {
    return { value: parseFloat(numMatch[1]), unit: '', raw: trimmed };
  }

  return { value: NaN, unit: '', raw: trimmed };
}

export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string
): { result: number; conversion: UnitConversion | null } {
  if (fromUnit === toUnit || !fromUnit || !toUnit) {
    return {
      result: value,
      conversion: fromUnit === toUnit ? {
        fromUnit,
        toUnit,
        factor: 1,
        formula: `${value} ${fromUnit} = ${value} ${toUnit}`
      } : null
    };
  }

  const fromLower = fromUnit;
  const toLower = toUnit;

  if (unitFactors[fromLower] && unitFactors[fromLower][toLower] !== undefined) {
    const factor = unitFactors[fromLower][toLower];
    const result = value * factor;
    return {
      result,
      conversion: {
        fromUnit,
        toUnit,
        factor,
        formula: `${value} ${fromUnit} × ${factor} = ${result.toFixed(6)} ${toUnit}`
      }
    };
  }

  return { result: value, conversion: null };
}

export function getUnitDisplayName(unit: string): string {
  return unitDisplayNames[unit] || unit;
}

export function normalizeToSI(value: number, unit: string): { value: number; unit: string; conversion: UnitConversion | null } {
  const siTargets: Record<string, string> = {
    'ms': 's',
    'μs': 's',
    'min': 's',
    'cm': 'm',
    'mm': 'm',
    'km': 'm',
    'ft': 'm',
    'in': 'm',
    'cm³': 'm³',
    'dm³': 'm³',
    'L': 'm³',
    'ft³': 'm³',
    'cm²': 'm²',
    'dm²': 'm²',
    'ft²': 'm²',
    'kHz': 'Hz',
    'MHz': 'Hz',
  };

  const targetUnit = siTargets[unit] || unit;
  if (targetUnit === unit) {
    return { value, unit, conversion: null };
  }

  const { result, conversion } = convertUnit(value, unit, targetUnit);
  return { value: result, unit: targetUnit, conversion };
}

export function listCompatibleUnits(unit: string): string[] {
  if (unitFactors[unit]) {
    return Object.keys(unitFactors[unit]);
  }
  return [unit];
}
