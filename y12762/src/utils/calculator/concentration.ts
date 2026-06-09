import type { ConcentrationUnit, ConversionResult } from '../../types';

const WATER_DENSITY = 1000;

export function convertConcentration(
  value: number,
  fromUnit: ConcentrationUnit,
  toUnit: ConcentrationUnit,
  molarMass?: number,
  density: number = WATER_DENSITY
): ConversionResult {
  let toValue = value;

  if (fromUnit === toUnit) {
    return { fromUnit, toUnit, fromValue: value, toValue: value, molarMass, density };
  }

  let molPerL: number;

  switch (fromUnit) {
    case 'mol/L':
      molPerL = value;
      break;
    case 'g/L':
      if (!molarMass) throw new Error('摩尔质量缺失，无法从g/L换算');
      molPerL = value / molarMass;
      break;
    case 'mass_fraction':
      if (!molarMass) throw new Error('摩尔质量缺失，无法从质量分数换算');
      molPerL = (value * density) / (molarMass * 100);
      break;
  }

  switch (toUnit) {
    case 'mol/L':
      toValue = molPerL;
      break;
    case 'g/L':
      if (!molarMass) throw new Error('摩尔质量缺失，无法换算至g/L');
      toValue = molPerL * molarMass;
      break;
    case 'mass_fraction':
      if (!molarMass) throw new Error('摩尔质量缺失，无法换算至质量分数');
      toValue = (molPerL * molarMass * 100) / density;
      break;
  }

  return {
    fromUnit,
    toUnit,
    fromValue: value,
    toValue: Number(toValue.toFixed(4)),
    molarMass,
    density,
  };
}

export function getConcentrationExplanation(
  result: ConversionResult,
  reagentName: string
): { explanation: string; detailedExplanation: string } {
  const unitLabels: Record<ConcentrationUnit, string> = {
    'mol/L': '摩尔浓度(mol/L)',
    'g/L': '质量浓度(g/L)',
    'mass_fraction': '质量分数(%)',
  };

  const explanation = `${reagentName}的${unitLabels[result.fromUnit]} ${result.fromValue} 换算为${unitLabels[result.toUnit]}为 ${result.toValue}。`;

  let processText = '';
  if (result.fromUnit === 'mol/L' && result.toUnit === 'g/L') {
    processText = `换算过程：${result.fromValue} mol/L × ${result.molarMass} g/mol = ${result.toValue} g/L`;
  } else if (result.fromUnit === 'g/L' && result.toUnit === 'mol/L') {
    processText = `换算过程：${result.fromValue} g/L ÷ ${result.molarMass} g/mol = ${result.toValue} mol/L`;
  } else if (result.fromUnit === 'mol/L' && result.toUnit === 'mass_fraction') {
    processText = `换算过程：(${result.fromValue} mol/L × ${result.molarMass} g/mol × 100) ÷ ${result.density} g/L = ${result.toValue}%`;
  } else if (result.fromUnit === 'mass_fraction' && result.toUnit === 'mol/L') {
    processText = `换算过程：(${result.fromValue}% × ${result.density} g/L) ÷ (${result.molarMass} g/mol × 100) = ${result.toValue} mol/L`;
  } else {
    processText = `单位相同，数值不变。`;
  }

  const detailedExplanation = `
【浓度换算说明】
试剂：${reagentName}
原始值：${result.fromValue} ${unitLabels[result.fromUnit]}
换算结果：${result.toValue} ${unitLabels[result.toUnit]}
${result.molarMass ? `使用摩尔质量：${result.molarMass} g/mol` : ''}

换算原理：
${processText}

教学提示：
浓度换算的核心是"物质的量守恒"——无论用哪种单位表示，溶液中溶质的物质的量是不变的。
- mol/L（摩尔浓度）：1升溶液中所含溶质的摩尔数
- g/L（质量浓度）：1升溶液中所含溶质的克数
- 质量分数(%)：每100克溶液中所含溶质的克数
`.trim();

  return { explanation, detailedExplanation };
}

export function validateConcentration(
  value: number,
  unit: ConcentrationUnit,
  reagentName: string
): { valid: boolean; message?: string; userFriendlyMessage?: string } {
  if (value <= 0) {
    return {
      valid: false,
      message: '浓度必须为正数',
      userFriendlyMessage: `${reagentName}的浓度值为${value}，不能为零或负数，请检查称量记录是否录入正确。`,
    };
  }

  if (unit === 'mass_fraction' && value > 100) {
    return {
      valid: false,
      message: '质量分数不能超过100%',
      userFriendlyMessage: `${reagentName}的质量分数为${value}%，超过了理论最大值100%。可能是将质量浓度误填为质量分数，请核对原始称量单。`,
    };
  }

  if (unit === 'mol/L' && value > 50) {
    return {
      valid: false,
      message: '摩尔浓度异常偏高',
      userFriendlyMessage: `${reagentName}的摩尔浓度为${value} mol/L，远超常见物质的溶解度上限。可能原因：单位选择错误（应为g/L）或小数点位置错误，请核对实验记录。`,
    };
  }

  return { valid: true };
}
