import type { FormulaDefinition, CalculationResult } from '@/types';

export const formulaDefinitions: FormulaDefinition[] = [
  {
    id: 'cylindrical',
    name: '圆柱形舱体容量',
    formula: 'V = π × r² × h',
    unit: 'm³',
    scope: '圆柱形压载水舱，r > 0, h > 0，误差 < 3%',
    failureReasons: [
      '半径 r 必须大于 0',
      '高度 h 必须大于 0',
      '输入值包含非数字字符',
      '参数超出设备测量范围',
    ],
    parameters: [
      { name: 'radius', label: '半径 (r)', unit: 'm', min: 0.1, max: 20, defaultValue: 3.5 },
      { name: 'height', label: '高度 (h)', unit: 'm', min: 0.1, max: 50, defaultValue: 12.0 },
    ],
    calculate: (params) => {
      return Math.PI * Math.pow(params.radius, 2) * params.height;
    },
    validate: (params) => {
      const errors: string[] = [];
      if (params.radius <= 0) errors.push('半径 r 必须大于 0');
      if (params.height <= 0) errors.push('高度 h 必须大于 0');
      if (params.radius > 20) errors.push('半径 r 超出合理范围 (0-20m)');
      if (params.height > 50) errors.push('高度 h 超出合理范围 (0-50m)');
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'spherical',
    name: '球形舱体容量',
    formula: 'V = (4/3) × π × r³',
    unit: 'm³',
    scope: '球形压载水舱，r > 0，误差 < 5%',
    failureReasons: [
      '半径 r 必须大于 0',
      '输入值包含非数字字符',
      '参数超出设备测量范围',
    ],
    parameters: [
      { name: 'radius', label: '半径 (r)', unit: 'm', min: 0.1, max: 15, defaultValue: 4.0 },
    ],
    calculate: (params) => {
      return (4 / 3) * Math.PI * Math.pow(params.radius, 3);
    },
    validate: (params) => {
      const errors: string[] = [];
      if (params.radius <= 0) errors.push('半径 r 必须大于 0');
      if (params.radius > 15) errors.push('半径 r 超出合理范围 (0-15m)');
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'conical',
    name: '锥形舱体容量',
    formula: 'V = (1/3) × π × r² × h',
    unit: 'm³',
    scope: '圆锥形压载水舱，r > 0, h > 0，误差 < 4%',
    failureReasons: [
      '半径 r 必须大于 0',
      '高度 h 必须大于 0',
      '输入值包含非数字字符',
      '参数超出设备测量范围',
    ],
    parameters: [
      { name: 'radius', label: '底部半径 (r)', unit: 'm', min: 0.1, max: 20, defaultValue: 4.0 },
      { name: 'height', label: '高度 (h)', unit: 'm', min: 0.1, max: 50, defaultValue: 12.5 },
    ],
    calculate: (params) => {
      return (1 / 3) * Math.PI * Math.pow(params.radius, 2) * params.height;
    },
    validate: (params) => {
      const errors: string[] = [];
      if (params.radius <= 0) errors.push('底部半径 r 必须大于 0');
      if (params.height <= 0) errors.push('高度 h 必须大于 0');
      if (params.radius > 20) errors.push('半径 r 超出合理范围 (0-20m)');
      if (params.height > 50) errors.push('高度 h 超出合理范围 (0-50m)');
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'pointDensity',
    name: '点云密度',
    formula: 'ρ = N / V',
    unit: 'points/m³',
    scope: '点云质量评估，正常范围 100-500 points/m³',
    failureReasons: [
      '点数 N 必须大于 0',
      '体积 V 必须大于 0',
      '输入值包含非数字字符',
    ],
    parameters: [
      { name: 'pointCount', label: '点数 (N)', unit: 'points', min: 1, defaultValue: 10000 },
      { name: 'volume', label: '体积 (V)', unit: 'm³', min: 0.1, defaultValue: 461.8 },
    ],
    calculate: (params) => {
      return params.pointCount / params.volume;
    },
    validate: (params) => {
      const errors: string[] = [];
      if (params.pointCount <= 0) errors.push('点数 N 必须大于 0');
      if (params.volume <= 0) errors.push('体积 V 必须大于 0');
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'collisionIndex',
    name: '碰撞风险指数',
    formula: 'CI = (1/V) × Σ(1/d²)',
    unit: '1/m⁴',
    scope: '碰撞风险评估，正常 < 1000，异常阈值 > 2000',
    failureReasons: [
      '体积 V 必须大于 0',
      '点间距数据不完整',
      '输入值包含非数字字符',
    ],
    parameters: [
      { name: 'spacingSum', label: '间距倒数平方和 Σ(1/d²)', unit: '1/m²', min: 0, defaultValue: 378676 },
      { name: 'volume', label: '体积 (V)', unit: 'm³', min: 0.1, defaultValue: 461.8 },
    ],
    calculate: (params) => {
      return params.spacingSum / params.volume;
    },
    validate: (params) => {
      const errors: string[] = [];
      if (params.spacingSum < 0) errors.push('间距倒数平方和不能为负数');
      if (params.volume <= 0) errors.push('体积 V 必须大于 0');
      return { valid: errors.length === 0, errors };
    },
  },
];

export function calculateWithFormula(
  formulaId: string,
  params: Record<string, number>
): CalculationResult {
  const formula = formulaDefinitions.find((f) => f.id === formulaId);
  if (!formula) {
    return { success: false, errors: ['未找到指定的计算公式'] };
  }

  const validation = formula.validate(params);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  try {
    const value = formula.calculate(params);
    if (!isFinite(value) || isNaN(value)) {
      return { success: false, errors: ['计算结果无效，请检查输入参数'] };
    }
    return {
      success: true,
      value: Math.round(value * 100) / 100,
      unit: formula.unit,
      formulaUsed: formula.formula,
    };
  } catch {
    return { success: false, errors: ['计算过程发生异常'] };
  }
}

export function getFormulaById(id: string): FormulaDefinition | undefined {
  return formulaDefinitions.find((f) => f.id === id);
}
