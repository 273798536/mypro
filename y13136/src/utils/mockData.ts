import type { RawParameterRecord } from '@/types';
import { generateId } from './common';

export function createMockRawRecords(): RawParameterRecord[] {
  const now = Date.now();
  const data = [
    { state: '活跃用户', weight: '35%', probability: '65%' },
    { state: '沉睡用户', weight: '25%', probability: '75%' },
    { state: '流失用户', weight: '15%', probability: '85%' },
    { state: '新注册', weight: '10%', probability: '90%' },
    { state: '付费用户', weight: '80‰', probability: '92%' },
    { state: '免费用户', weight: '7%', probability: '93' },
    { state: '高价值用户', weight: '0.04', probability: '0.96' },
    { state: '低价值用户', weight: '3%', probability: '970‱' },
    { state: 'VIP用户', weight: '2%', probability: '1.00' },
    { state: '普通用户', weight: '1%', probability: '0.99' },
    { state: '测试用户A', weight: '0.00', probability: '1.00' },
    { state: '测试用户B', weight: '50%', probability: '0%' },
    { state: '吸收态C', weight: '100%', probability: '0.00' },
    { state: '边界状态Y', weight: '55%', probability: '40%' },
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
    { state: '活跃用户', weight: '38%', probability: '62%' },
    { state: '沉睡用户', weight: '22%', probability: '78%' },
    { state: '流失用户', weight: '18%', probability: '82%' },
    { state: '新注册', weight: '12%', probability: '88%' },
    { state: '付费用户', weight: '6%', probability: '94%' },
    { state: '免费用户', weight: '8%', probability: '92%' },
    { state: '高价值用户', weight: '5%', probability: '95%' },
    { state: '低价值用户', weight: '2%', probability: '98%' },
    { state: 'VIP用户', weight: '3%', probability: '97%' },
    { state: '普通用户', weight: '1%', probability: '0.99' },
    { state: '测试用户A', weight: '0.00', probability: '1.00' },
    { state: '测试用户B', weight: '45%', probability: '0%' },
    { state: '吸收态C', weight: '110%', probability: '-10%' },
    { state: '边界状态Y', weight: '52%', probability: '43%' },
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
