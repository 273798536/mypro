import type { Formula } from '@/types';

export const formulas: Formula[] = [
  {
    id: 'body-weight-index',
    name: '体重指数计算',
    code: 'BMI',
    description: '根据体重和体长计算小鼠体重指数，用于评估小鼠生长发育状态',
    expression: 'weight / (bodyLength * bodyLength) * 100',
    unit: 'g/cm²',
    applicableScope: '适用于 6-24 周龄 C57BL/6 品系小鼠，正常体重范围 18-35g',
    failureConditions: [
      '体长短于 5cm 或长于 15cm 时结果不可靠',
      '体重低于 10g 或高于 50g 时需复核样本',
    ],
    parameters: [
      {
        name: 'weight',
        label: '体重',
        unit: 'g',
        type: 'number',
        required: true,
        min: 5,
        max: 60,
      },
      {
        name: 'bodyLength',
        label: '体长',
        unit: 'cm',
        type: 'number',
        required: true,
        min: 3,
        max: 20,
      },
    ],
    referenceRange: {
      min: 2.5,
      max: 5.0,
    },
    category: '生长发育',
  },
  {
    id: 'blood-glucose-correction',
    name: '血糖浓度校正',
    code: 'BGC',
    description: '根据红细胞压积校正全血血糖值，获得血浆血糖浓度',
    expression: 'wholeBloodGlucose * (1 - 0.3 * hematocrit / 100) * correctionFactor',
    unit: 'mmol/L',
    applicableScope: '适用于空腹或随机血糖检测，红细胞压积范围 35%-55%',
    failureConditions: [
      '红细胞压积低于 30% 或高于 60% 时校正公式不适用',
      '血糖值低于 2mmol/L 或高于 30mmol/L 时需稀释重测',
    ],
    parameters: [
      {
        name: 'wholeBloodGlucose',
        label: '全血血糖',
        unit: 'mmol/L',
        type: 'number',
        required: true,
        min: 1,
        max: 40,
      },
      {
        name: 'hematocrit',
        label: '红细胞压积',
        unit: '%',
        type: 'number',
        required: true,
        min: 20,
        max: 70,
      },
      {
        name: 'correctionFactor',
        label: '校正系数',
        unit: '',
        type: 'number',
        required: true,
        defaultValue: 1.12,
        min: 0.8,
        max: 1.5,
      },
    ],
    referenceRange: {
      min: 3.9,
      max: 8.1,
    },
    category: '生化检测',
  },
  {
    id: 'tissue-homogenate-concentration',
    name: '组织匀浆浓度计算',
    code: 'THC',
    description: '根据组织重量和匀浆体积计算目标蛋白或物质的组织浓度',
    expression: 'measuredConcentration * homogenateVolume / tissueWeight',
    unit: 'μg/g',
    applicableScope: '适用于肝、肾、脑等实体组织匀浆样本检测',
    failureConditions: [
      '组织重量低于 10mg 时误差较大',
      '匀浆体积与组织重量比例超过 20:1 时需注意稀释效应',
    ],
    parameters: [
      {
        name: 'measuredConcentration',
        label: '测定浓度',
        unit: 'μg/mL',
        type: 'number',
        required: true,
        min: 0.001,
        max: 10000,
      },
      {
        name: 'homogenateVolume',
        label: '匀浆体积',
        unit: 'mL',
        type: 'number',
        required: true,
        min: 0.1,
        max: 50,
      },
      {
        name: 'tissueWeight',
        label: '组织重量',
        unit: 'g',
        type: 'number',
        required: true,
        min: 0.005,
        max: 10,
      },
    ],
    category: '组织检测',
  },
  {
    id: 'survival-rate-calculation',
    name: '生存率计算',
    code: 'SRC',
    description: '计算特定时间点的小鼠存活率及标准误差',
    expression: 'survivalCount / totalCount * 100',
    unit: '%',
    applicableScope: '适用于动物实验生存分析，每组样本量建议不少于 10 只',
    failureConditions: [
      '总数量为 0 时无法计算',
      '存活数大于总数量时数据异常',
    ],
    parameters: [
      {
        name: 'survivalCount',
        label: '存活数',
        unit: '只',
        type: 'number',
        required: true,
        min: 0,
      },
      {
        name: 'totalCount',
        label: '总数量',
        unit: '只',
        type: 'number',
        required: true,
        min: 1,
      },
    ],
    referenceRange: {
      min: 0,
      max: 100,
    },
    category: '动物实验',
  },
  {
    id: 'quality-control-cv',
    name: '质控变异系数',
    code: 'QCCV',
    description: '计算质控样本的变异系数，评估检测方法的精密度',
    expression: 'standardDeviation / meanValue * 100',
    unit: '%',
    applicableScope: '适用于室内质量控制，至少 20 个质控数据点',
    failureConditions: [
      '均值为 0 或负值时 CV 无意义',
      '数据点少于 5 个时 CV 不可靠',
    ],
    parameters: [
      {
        name: 'standardDeviation',
        label: '标准差',
        unit: '',
        type: 'number',
        required: true,
        min: 0,
      },
      {
        name: 'meanValue',
        label: '均值',
        unit: '',
        type: 'number',
        required: true,
        min: 0.001,
      },
    ],
    referenceRange: {
      min: 0,
      max: 10,
    },
    category: '质量控制',
  },
];

export function getFormulaById(id: string): Formula | undefined {
  return formulas.find((f) => f.id === id);
}

export function getFormulasByCategory(category: string): Formula[] {
  return formulas.filter((f) => f.category === category);
}

export function getFormulaCategories(): string[] {
  const categories = new Set(formulas.map((f) => f.category));
  return Array.from(categories);
}
