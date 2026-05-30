import type { CalculationRecord } from '../types/records';
import { calculateVolume } from '../utils/math/volumeCalculator';

export interface SampleRecord {
  name: string;
  functionExpr: string;
  rotationAxis: 'x' | 'y' | 'custom';
  intervalA: number;
  intervalB: number;
  sliceCount: number;
  description: string;
  category: string;
}

export const SAMPLE_RECORDS: SampleRecord[] = [
  {
    name: '圆锥体',
    functionExpr: 'x',
    rotationAxis: 'x',
    intervalA: 0,
    intervalB: 1,
    sliceCount: 20,
    description: 'y=x 绕X轴旋转，形成底面半径1、高1的圆锥，体积=π/3',
    category: '基础几何体',
  },
  {
    name: '圆球体',
    functionExpr: 'sqrt(1-x^2)',
    rotationAxis: 'x',
    intervalA: -1,
    intervalB: 1,
    sliceCount: 30,
    description: '上半圆绕X轴旋转，形成半径1的球体，体积=4π/3',
    category: '基础几何体',
  },
  {
    name: '旋转抛物面',
    functionExpr: 'x^2',
    rotationAxis: 'x',
    intervalA: 0,
    intervalB: 1,
    sliceCount: 25,
    description: '抛物线y=x²绕X轴旋转，体积=π/5',
    category: '经典例题',
  },
  {
    name: '圆环体（甜甜圈）',
    functionExpr: '1+sqrt(0.25-(x-0.5)^2)',
    rotationAxis: 'x',
    intervalA: 0.25,
    intervalB: 0.75,
    sliceCount: 40,
    description: '圆绕X轴旋转形成圆环体',
    category: '进阶示例',
  },
  {
    name: '正弦旋转体',
    functionExpr: 'sin(x)',
    rotationAxis: 'x',
    intervalA: 0,
    intervalB: 'π' as unknown as number,
    sliceCount: 30,
    description: '正弦曲线一拱绕X轴旋转，体积=π²/2',
    category: '三角函数',
  },
  {
    name: '指数旋转体',
    functionExpr: 'e^(-x)',
    rotationAxis: 'x',
    intervalA: 0,
    intervalB: 2,
    sliceCount: 25,
    description: '指数衰减曲线旋转体',
    category: '指数函数',
  },
  {
    name: '区间反向示例',
    functionExpr: 'x^2',
    rotationAxis: 'x',
    intervalA: 1,
    intervalB: 0,
    sliceCount: 15,
    description: '演示区间反向校验流程（a > b）',
    category: '审核示例',
  },
  {
    name: '切片过少示例',
    functionExpr: 'sqrt(x)',
    rotationAxis: 'x',
    intervalA: 0,
    intervalB: 4,
    sliceCount: 5,
    description: '演示切片数量过少的精度问题',
    category: '审核示例',
  },
];

export function generateSampleRecords(): CalculationRecord[] {
  return SAMPLE_RECORDS.slice(0, 5).map((sample, index) => {
    const intervalB = typeof sample.intervalB === 'number' ? sample.intervalB : Math.PI;
    const result = calculateVolume(
      sample.functionExpr,
      sample.intervalA,
      intervalB,
      'disk',
      sample.rotationAxis,
      0
    );

    return {
      id: `sample-${index}`,
      createdAt: new Date(Date.now() - (index + 1) * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - (index + 1) * 3600000).toISOString(),
      params: {
        functionExpr: sample.functionExpr,
        rotationAxis: sample.rotationAxis,
        axisOffset: 0,
        intervalA: sample.intervalA,
        intervalB: intervalB,
        sliceCount: sample.sliceCount,
        showSlices: false,
        method: 'disk',
        validation: {
          isIntervalReversed: sample.intervalA > intervalB,
          isAxisAmbiguous: false,
          isSliceInsufficient: sample.sliceCount < 10,
          reviewStatus:
            sample.intervalA > intervalB || sample.sliceCount < 10 ? 'needs_review' : 'approved',
          assignedReviewer: sample.intervalA > intervalB ? 'li' : sample.sliceCount < 10 ? 'zhang' : null,
          issues: [],
        },
      },
      result,
      modificationHistory: [],
      reviewStatus:
        sample.intervalA > intervalB || sample.sliceCount < 10 ? 'needs_review' : 'approved',
      reviewNotes: sample.description,
    };
  });
}
