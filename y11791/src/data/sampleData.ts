import type { SampleData } from '../types/simulation';

export const sampleData: Record<string, SampleData> = {
  normal: {
    name: '正常雨滴',
    description: '典型中雨雨滴参数，可作为教学演示',
    params: {
      radius: 1.5,
      airDensity: 1.225,
      dragCoefficient: 0.47,
      initialVelocity: 0,
      height: 1000,
      source: '气象科普教材 - 第3版',
    },
  },
  boundary: {
    name: '边界情况',
    description: '接近模型适用上限的大雨滴，用于展示模型边界',
    params: {
      radius: 5.0,
      airDensity: 1.225,
      dragCoefficient: 0.47,
      initialVelocity: 0,
      height: 2000,
      source: '极端天气观测记录',
    },
  },
  badData: {
    name: '异常数据',
    description: '超出合理范围的参数，用于测试异常检测',
    params: {
      radius: 50.0,
      airDensity: 0.5,
      dragCoefficient: 2.5,
      initialVelocity: -100,
      height: 5000,
      source: '错误输入样例',
    },
  },
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
