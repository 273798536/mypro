import type { FitModel, SampleDataset } from './types';

export const models: FitModel[] = [
  {
    id: 'exponential',
    name: '指数衰减',
    latexFormula: 'y = A \\cdot e^{-\\lambda x} + C',
    fn: (p, x) => p[0] * Math.exp(-p[1] * x) + p[2],
    jacobian: (p, x) => {
      const expPart = Math.exp(-p[1] * x);
      return [expPart, -p[0] * x * expPart, 1];
    },
    paramNames: ['A', 'λ', 'C'],
    defaultInitial: [1, 0.1, 0],
    paramBounds: [
      { lower: -1e6, upper: 1e6 },
      { lower: -100, upper: 100 },
      { lower: -1e6, upper: 1e6 },
    ],
    description: '指数衰减模型，适用于放射性衰变、药物代谢等',
  },
  {
    id: 'polynomial',
    name: '二次多项式',
    latexFormula: 'y = ax^2 + bx + c',
    fn: (p, x) => p[0] * x * x + p[1] * x + p[2],
    jacobian: (_p, x) => [x * x, x, 1],
    paramNames: ['a', 'b', 'c'],
    defaultInitial: [1, 0, 0],
    paramBounds: [
      { lower: -1e6, upper: 1e6 },
      { lower: -1e6, upper: 1e6 },
      { lower: -1e6, upper: 1e6 },
    ],
    description: '二次多项式，适用于抛物线型数据',
  },
  {
    id: 'gaussian',
    name: '高斯峰',
    latexFormula: 'y = A \\cdot e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}} + B',
    fn: (p, x) => {
      const diff = x - p[1];
      return p[0] * Math.exp(-(diff * diff) / (2 * p[2] * p[2])) + p[3];
    },
    jacobian: (p, x) => {
      const diff = x - p[1];
      const sigma2 = p[2] * p[2];
      const expPart = Math.exp(-(diff * diff) / (2 * sigma2));
      return [
        expPart,
        p[0] * expPart * diff / (sigma2),
        p[0] * expPart * diff * diff / (sigma2 * p[2]),
        1,
      ];
    },
    paramNames: ['A', 'μ', 'σ', 'B'],
    defaultInitial: [1, 0, 1, 0],
    paramBounds: [
      { lower: -1e6, upper: 1e6 },
      { lower: -1e6, upper: 1e6 },
      { lower: 1e-6, upper: 1e6 },
      { lower: -1e6, upper: 1e6 },
    ],
    description: '高斯峰模型，适用于光谱分析、正态分布拟合',
  },
  {
    id: 'logistic',
    name: 'Logistic增长',
    latexFormula: 'y = \\frac{L}{1 + e^{-k(x - x_0)}}',
    fn: (p, x) => p[0] / (1 + Math.exp(-p[1] * (x - p[2]))),
    jacobian: (p, x) => {
      const expPart = Math.exp(-p[1] * (x - p[2]));
      const denom = 1 + expPart;
      const denom2 = denom * denom;
      return [
        1 / denom,
        p[0] * expPart * (x - p[2]) / denom2,
        -p[0] * expPart * p[1] / denom2,
      ];
    },
    paramNames: ['L', 'k', 'x₀'],
    defaultInitial: [1, 1, 0],
    paramBounds: [
      { lower: -1e6, upper: 1e6 },
      { lower: -100, upper: 100 },
      { lower: -1e6, upper: 1e6 },
    ],
    description: 'Logistic增长模型，适用于种群增长、市场渗透等S型曲线',
  },
];

export const sampleDatasets: SampleDataset[] = [
  {
    id: 'exp_decay',
    name: '指数衰减（正常收敛）',
    description: '放射性衰变实验数据，拟合应正常收敛',
    modelId: 'exponential',
    data: [
      { x: 0, y: 100.2 },
      { x: 1, y: 60.5 },
      { x: 2, y: 36.8 },
      { x: 3, y: 22.1 },
      { x: 4, y: 13.4 },
      { x: 5, y: 8.2 },
      { x: 6, y: 5.0 },
      { x: 7, y: 3.1 },
    ],
    expectedBehavior: '正常收敛，参数估计可靠',
  },
  {
    id: 'gaussian_outlier',
    name: '高斯峰（含离群点）',
    description: '光谱峰数据，包含2个明显离群点',
    modelId: 'gaussian',
    data: [
      { x: -4, y: 0.3 },
      { x: -3, y: 0.8 },
      { x: -2, y: 2.1 },
      { x: -1, y: 4.5 },
      { x: 0, y: 9.8 },
      { x: 1, y: 15.2 },
      { x: 2, y: 10.1 },
      { x: 3, y: 3.9 },
      { x: 4, y: 1.2 },
      { x: 0.5, y: 28.5 },
      { x: 1.5, y: 0.05 },
      { x: -0.5, y: 12.7 },
    ],
    expectedBehavior: '检测到2个离群点（第10、11行），可能为测量错误',
  },
  {
    id: 'logistic_diverge',
    name: 'Logistic增长（初值发散）',
    description: '种群增长数据，k初值过大导致数值溢出发散',
    modelId: 'logistic',
    data: [
      { x: 0, y: 2.1 },
      { x: 1, y: 3.5 },
      { x: 2, y: 5.8 },
      { x: 3, y: 12.4 },
      { x: 4, y: 28.7 },
      { x: 5, y: 52.3 },
      { x: 6, y: 78.9 },
      { x: 7, y: 92.1 },
      { x: 8, y: 97.5 },
      { x: 9, y: 99.1 },
    ],
    expectedBehavior: '初值k=1000过大导致Jacobian溢出，需调小k至1~3',
    customInitial: [0.001, 1000, 5],
  },
];

export function getModelById(id: string): FitModel | undefined {
  return models.find((m) => m.id === id);
}
