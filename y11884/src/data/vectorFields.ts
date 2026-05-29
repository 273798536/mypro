import type { VectorField } from '../types';

export const vectorFields: VectorField[] = [
  {
    id: 'conservative-radial',
    name: '保守场：径向场',
    description: 'F(x,y) = (x, y)，典型的保守场，积分与路径无关',
    formula: 'F(x,y) = (x, y)',
    formulaLatex: '\\vec{F}(x,y) = x \\, \\hat{i} + y \\, \\hat{j}',
    bounds: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
    gridStep: 0.8,
    computeVector: (x: number, y: number) => ({ x, y }),
    isConservative: true,
    requiredFields: ['name', 'formula', 'computeVector'],
  },
  {
    id: 'non-conservative-rotational',
    name: '非保守场：旋转场',
    description: 'F(x,y) = (-y, x)，典型的非保守场，积分与路径有关',
    formula: 'F(x,y) = (-y, x)',
    formulaLatex: '\\vec{F}(x,y) = -y \\, \\hat{i} + x \\, \\hat{j}',
    bounds: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
    gridStep: 0.8,
    computeVector: (x: number, y: number) => ({ x: -y, y: x }),
    isConservative: false,
    requiredFields: ['name', 'formula', 'computeVector'],
  },
  {
    id: 'vortex-field',
    name: '涡旋场（含奇点）',
    description: 'F(x,y) = (-y/(x²+y²), x/(x²+y²))，原点处有奇点',
    formula: 'F(x,y) = (-y/r², x/r²)',
    formulaLatex:
      '\\vec{F}(x,y) = \\frac{-y}{x^2+y^2} \\, \\hat{i} + \\frac{x}{x^2+y^2} \\, \\hat{j}',
    bounds: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
    gridStep: 0.8,
    computeVector: (x: number, y: number) => {
      const r2 = x * x + y * y;
      if (r2 < 0.01) return { x: 0, y: 0 };
      return { x: -y / r2, y: x / r2 };
    },
    isConservative: false,
    hasSingularity: true,
    singularityPoints: [{ x: 0, y: 0 }],
    requiredFields: ['name', 'formula', 'computeVector'],
  },
  {
    id: 'gravity-like',
    name: '重力场模拟',
    description: 'F(x,y) = (-x, -y)，模拟中心引力场',
    formula: 'F(x,y) = (-x, -y)',
    formulaLatex: '\\vec{F}(x,y) = -x \\, \\hat{i} - y \\, \\hat{j}',
    bounds: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
    gridStep: 0.8,
    computeVector: (x: number, y: number) => ({ x: -x, y: -y }),
    isConservative: true,
    requiredFields: ['name', 'formula', 'computeVector'],
  },
  {
    id: 'complex-shear',
    name: '复杂剪切场',
    description: 'F(x,y) = (y + sin(x), x + cos(y))，非保守场，适合路径对比',
    formula: 'F(x,y) = (y + sin(x), x + cos(y))',
    formulaLatex:
      '\\vec{F}(x,y) = (y + \\sin x) \\, \\hat{i} + (x + \\cos y) \\, \\hat{j}',
    bounds: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
    gridStep: 0.8,
    computeVector: (x: number, y: number) => ({
      x: y + Math.sin(x),
      y: x + Math.cos(y),
    }),
    isConservative: false,
    requiredFields: ['name', 'formula', 'computeVector'],
  },
];

export const samplePaths = {
  straightLine: {
    name: '直线路径',
    nodes: [
      { x: -3, y: -3 },
      { x: 3, y: 3 },
    ],
  },
  curvedPath: {
    name: '曲线路径',
    nodes: [
      { x: -3, y: -3 },
      { x: -2, y: 0 },
      { x: 0, y: 2 },
      { x: 2, y: 1 },
      { x: 3, y: 3 },
    ],
  },
  clockwiseCircle: {
    name: '顺时针圆环',
    nodes: [
      { x: 2, y: 0 },
      { x: 1.414, y: 1.414 },
      { x: 0, y: 2 },
      { x: -1.414, y: 1.414 },
      { x: -2, y: 0 },
      { x: -1.414, y: -1.414 },
      { x: 0, y: -2 },
      { x: 1.414, y: -1.414 },
      { x: 2, y: 0 },
    ],
  },
  counterClockwiseCircle: {
    name: '逆时针圆环',
    nodes: [
      { x: 2, y: 0 },
      { x: 1.414, y: -1.414 },
      { x: 0, y: -2 },
      { x: -1.414, y: -1.414 },
      { x: -2, y: 0 },
      { x: -1.414, y: 1.414 },
      { x: 0, y: 2 },
      { x: 1.414, y: 1.414 },
      { x: 2, y: 0 },
    ],
  },
  selfIntersecting: {
    name: '自交路径（8字形）',
    nodes: [
      { x: 0, y: 2 },
      { x: 2, y: 0 },
      { x: 0, y: -2 },
      { x: -2, y: 0 },
      { x: 0, y: 2 },
      { x: 1.5, y: 1 },
      { x: 1.5, y: -1 },
      { x: 0, y: -2 },
    ],
  },
  largeStepPath: {
    name: '粗略采样路径',
    nodes: [
      { x: -3, y: 0 },
      { x: 0, y: 2 },
      { x: 3, y: 0 },
    ],
  },
};

export function validateVectorFieldImport(data: Partial<VectorField> & { samplePoints?: unknown[] }): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.name) {
    errors.push('缺少必填字段: name (向量场名称)');
  }
  if (!data.formula) {
    errors.push('缺少必填字段: formula (公式描述)');
  }
  if (!data.computeVector && !data.samplePoints) {
    errors.push('需要提供 computeVector 函数或 samplePoints 数据');
  }
  if (!data.bounds) {
    warnings.push('未指定边界范围，使用默认边界 [-5, 5] × [-5, 5]');
  }
  if (data.gridStep === undefined) {
    warnings.push('未指定网格步长，使用默认值 0.8');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
