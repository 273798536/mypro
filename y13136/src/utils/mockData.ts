import type { RawParameterRecord } from '@/types';
import { generateId } from './common';

export function createMockRawRecords(): RawParameterRecord[] {
  const now = Date.now();
  const data = [
    { state: '活跃用户', weight: '0.35', probability: '0.65' },
    { state: '沉睡用户', weight: '0.25', probability: '0.75' },
    { state: '流失用户', weight: '0.15', probability: '0.85' },
    { state: '新注册', weight: '0.10', probability: '0.90' },
    { state: '付费用户', weight: '0.08', probability: '0.92' },
    { state: '免费用户', weight: '0.07', probability: '0.93' },
    { state: '高价值用户', weight: '0.04', probability: '0.96' },
    { state: '低价值用户', weight: '0.03', probability: '0.97' },
    { state: 'VIP用户', weight: '0.02', probability: '0.98' },
    { state: '普通用户', weight: '0.01', probability: '0.99' },
    { state: '测试用户A', weight: '0.00', probability: '1.00' },
    { state: '测试用户B', weight: '0.50', probability: '0.00' },
    { state: '异常状态X', weight: '1.20', probability: '-0.20' },
    { state: '边界状态Y', weight: '0.55', probability: '0.40' },
    { state: '脏数据Z', weight: 'N/A', probability: '无效值' },
  ];

  return data.map((row, index) => ({
    id: generateId(),
    rowIndex: index,
    rawData: {
      state: row.state,
      weight: row.weight,
      probability: row.probability,
    },
    sourceFile: '示例参数表.csv',
    uploadedAt: now,
  }));
}

export function createMockSecondVersion(): RawParameterRecord[] {
  const now = Date.now() - 86400000;
  const data = [
    { state: '活跃用户', weight: '0.38', probability: '0.62' },
    { state: '沉睡用户', weight: '0.22', probability: '0.78' },
    { state: '流失用户', weight: '0.18', probability: '0.82' },
    { state: '新注册', weight: '0.12', probability: '0.88' },
    { state: '付费用户', weight: '0.06', probability: '0.94' },
    { state: '免费用户', weight: '0.08', probability: '0.92' },
    { state: '高价值用户', weight: '0.05', probability: '0.95' },
    { state: '低价值用户', weight: '0.02', probability: '0.98' },
    { state: 'VIP用户', weight: '0.03', probability: '0.97' },
    { state: '普通用户', weight: '0.01', probability: '0.99' },
    { state: '测试用户A', weight: '0.00', probability: '1.00' },
    { state: '测试用户B', weight: '0.45', probability: '0.00' },
    { state: '异常状态X', weight: '1.10', probability: '-0.10' },
    { state: '边界状态Y', weight: '0.52', probability: '0.43' },
    { state: '脏数据Z', weight: 'N/A', probability: '无效值' },
  ];

  return data.map((row, index) => ({
    id: generateId(),
    rowIndex: index,
    rawData: {
      state: row.state,
      weight: row.weight,
      probability: row.probability,
    },
    sourceFile: '参数表_v2.csv',
    uploadedAt: now,
  }));
}
