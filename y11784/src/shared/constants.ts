import type { PresetVectorField, IntegrationMethod } from '@/types';

export const PRESET_VECTOR_FIELDS: PresetVectorField[] = [
  {
    name: '保守场: F(x,y) = (x, y)',
    expressionX: 'x',
    expressionY: 'y',
    description: '径向场，沿闭合路径积分为0',
    range: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
  },
  {
    name: '旋转场: F(x,y) = (-y, x)',
    expressionX: '-y',
    expressionY: 'x',
    description: '涡旋场，非保守场',
    range: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
  },
  {
    name: '重力场: F(x,y) = (0, -1)',
    expressionX: '0',
    expressionY: '-1',
    description: '模拟重力场',
    range: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
  },
  {
    name: '电场: F(x,y) = (x/(x²+y²), y/(x²+y²))',
    expressionX: 'x / (x^2 + y^2 + 0.01)',
    expressionY: 'y / (x^2 + y^2 + 0.01)',
    description: '点电荷电场',
    range: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
  },
  {
    name: '复杂场: F(x,y) = (y, x²)',
    expressionX: 'y',
    expressionY: 'x^2',
    description: '综合练习场',
    range: { minX: -3, maxX: 3, minY: -3, maxY: 3 },
  },
];

export const INTEGRATION_METHODS: { value: IntegrationMethod; label: string; description: string }[] = [
  {
    value: 'trapezoidal',
    label: '梯形法',
    description: 'O(h²) 精度，计算量低',
  },
  {
    value: 'simpson',
    label: 'Simpson 法',
    description: 'O(h⁴) 精度，适合光滑函数',
  },
  {
    value: 'adaptiveSimpson',
    label: '自适应 Simpson 法',
    description: '自适应精度，适合变化剧烈区域',
  },
  {
    value: 'gaussLegendre',
    label: '高斯-勒让德',
    description: '高精度，O(h²ⁿ) 精度',
  },
];

export const DEFAULT_INTEGRATION_CONFIG = {
  method: 'simpson' as IntegrationMethod,
  stepSize: 0.05,
  adaptiveTolerance: 1e-6,
  gaussOrder: 4,
};

export const PATH_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

export const ANOMALY_THRESHOLDS = {
  stepSizeRatio: 50,
  stepSizeWarningRatio: 10,
  directionReversalAngle: 150,
} as const;

export const CANVAS_CONFIG = {
  vectorGridSpacing: 30,
  vectorArrowSize: 8,
  nodeRadius: 8,
  nodeHoverRadius: 12,
  pathLineWidth: 2,
} as const;
