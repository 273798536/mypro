import { evaluate } from 'mathjs';
import type { Preset, InterpolationConfig } from '../engine/types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createConfig(
  functionExpression: string,
  order: number,
  sampleStart: number,
  sampleEnd: number,
  pointCount: number,
  source: string,
  note: string
): InterpolationConfig {
  return {
    id: generateId(),
    functionExpression,
    order,
    sampleStart,
    sampleEnd,
    pointCount,
    method: 'lagrange',
    source,
    note,
    createdAt: Date.now(),
  };
}

export const classicPresets: Preset[] = [
  {
    id: 'runge-classic',
    name: '龙格函数（经典案例）',
    description: '展示龙格现象的经典案例：f(x) = 1/(1+25x²) 在 [-5, 5] 区间的高次插值振荡',
    category: 'classic',
    config: createConfig(
      '1/(1+25*x^2)',
      10,
      -5,
      5,
      11,
      '经典数值分析教材 - 龙格现象示例',
      '这是展示龙格现象最经典的例子。当使用等距节点进行高次多项式插值时，在区间边缘会产生剧烈的振荡。'
    ),
  },
  {
    id: 'runge-low-order',
    name: '龙格函数（低阶对比）',
    description: '低阶插值对比，展示降低阶数如何缓解振荡',
    category: 'classic',
    config: createConfig(
      '1/(1+25*x^2)',
      4,
      -5,
      5,
      11,
      '经典数值分析教材 - 低阶插值对比',
      '使用4阶多项式插值龙格函数，振荡明显减弱，但整体精度会有所下降。'
    ),
  },
  {
    id: 'sine-function',
    name: '正弦函数',
    description: 'f(x) = sin(x) 在 [0, 2π] 区间的插值，展示光滑函数的插值效果',
    category: 'classic',
    config: createConfig(
      'sin(x)',
      8,
      0,
      evaluate('2*pi') as number,
      9,
      '数学教学示例 - 光滑函数插值',
      '正弦函数是无穷可微的光滑函数，多项式插值通常能取得较好的效果。'
    ),
  },
  {
    id: 'exponential',
    name: '指数函数',
    description: 'f(x) = e^x 在 [-2, 2] 区间的插值',
    category: 'classic',
    config: createConfig(
      'exp(x)',
      6,
      -2,
      2,
      7,
      '数学教学示例 - 指数函数插值',
      '指数函数增长迅速，观察多项式在多大程度上能够逼近它。'
    ),
  },
  {
    id: 'absolute-value',
    name: '绝对值函数',
    description: 'f(x) = |x| 在 [-1, 1] 区间的插值，展示非光滑函数的问题',
    category: 'classic',
    config: createConfig(
      'abs(x)',
      8,
      -1,
      1,
      9,
      '数学教学示例 - 非光滑函数插值',
      '绝对值函数在x=0处不可导，观察多项式插值如何处理这个尖点。'
    ),
  },
  {
    id: 'step-function',
    name: '阶跃函数近似',
    description: 'f(x) = atan(10x) 在 [-1, 1] 区间，模拟阶跃函数',
    category: 'classic',
    config: createConfig(
      'atan(10*x)',
      10,
      -1,
      1,
      11,
      '数学教学示例 - 剧烈变化函数',
      '这个函数在x=0附近变化剧烈，观察高次插值是否会产生振荡。'
    ),
  },
];

export function createCustomPreset(
  name: string,
  description: string,
  config: InterpolationConfig
): Preset {
  return {
    id: `custom-${generateId()}`,
    name,
    description,
    category: 'custom',
    config: { ...config, id: generateId(), createdAt: Date.now() },
  };
}

export function getAllPresets(customPresets: Preset[] = []): Preset[] {
  return [...classicPresets, ...customPresets];
}

export function findPresetById(id: string, customPresets: Preset[] = []): Preset | undefined {
  return getAllPresets(customPresets).find(p => p.id === id);
}
