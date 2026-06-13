import { CalculationParameters, FormulaInfo } from '@/types/experiment';

export const FORMULA_DEFINITIONS = {
  liftCoefficient: {
    name: '升力系数',
    expression: 'C_L = L / (0.5 × ρ × V² × S)',
    description: '升力系数是无量纲量，描述物体在流体中产生升力的能力',
    unit: '无量纲',
  },
  dragCoefficient: {
    name: '阻力系数',
    expression: 'C_D = D / (0.5 × ρ × V² × S)',
    description: '阻力系数是无量纲量，描述物体在流体中运动时受到的阻力大小',
    unit: '无量纲',
  },
  reynoldsNumber: {
    name: '雷诺数',
    expression: 'Re = ρ × V × L / μ',
    description: '雷诺数是惯性力与粘性力之比，用于判断流动状态',
    unit: '无量纲',
  },
  flowVelocity: {
    name: '流动速度',
    expression: 'V = V_wind × cos(α) + V_perp × sin(α)',
    description: '考虑攻角影响的有效流动速度',
    unit: 'm/s',
  },
  pressureCoefficient: {
    name: '压力系数',
    expression: 'C_p = (P - P_∞) / (0.5 × ρ × V²)',
    description: '压力系数描述流场中某点压力与来流压力的差值',
    unit: '无量纲',
  },
};

export const buildFormulaInfo = (
  formulaKey: keyof typeof FORMULA_DEFINITIONS,
  parameters: CalculationParameters,
  result: number
): FormulaInfo => {
  const def = FORMULA_DEFINITIONS[formulaKey];
  
  const variables: FormulaInfo['variables'] = {
    ρ: {
      value: parameters.airDensity,
      unit: 'kg/m³',
      description: '空气密度',
    },
    V: {
      value: parameters.windSpeed,
      unit: 'm/s',
      description: '来流风速',
    },
    α: {
      value: parameters.angleOfAttack,
      unit: '°',
      description: '攻角',
    },
    d: {
      value: parameters.smokeLineDiameter,
      unit: 'mm',
      description: '烟线直径',
    },
    I: {
      value: parameters.turbulenceIntensity,
      unit: '%',
      description: '湍流强度',
    },
  };

  return {
    expression: def.expression,
    variables,
    unit: def.unit,
    description: def.description,
  };
};

export const EXPECTED_DIRECTIONS: Record<string, 'positive' | 'negative'> = {
  liftCoefficient: 'positive',
  lift_coefficient: 'positive',
  升力系数: 'positive',
  dragCoefficient: 'positive',
  drag_coefficient: 'positive',
  阻力系数: 'positive',
  normalForce: 'positive',
  normal_force: 'positive',
  法向力: 'positive',
  pressureCoefficient: 'negative',
  pressure_coefficient: 'negative',
  压力系数: 'negative',
  suction: 'negative',
  吸力: 'negative',
};
