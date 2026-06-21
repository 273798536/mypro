import type { Parameter, CostSnapshot } from '@/types';

export const validateBoundary = (param: Parameter): { valid: boolean; message: string } => {
  if (param.value < param.minBoundary) {
    return {
      valid: false,
      message: `${param.name} 当前值 ${param.value}${param.unit} 低于下限 ${param.minBoundary}${param.unit}`
    };
  }
  if (param.value > param.maxBoundary) {
    return {
      valid: false,
      message: `${param.name} 当前值 ${param.value}${param.unit} 超出上限 ${param.maxBoundary}${param.unit}`
    };
  }
  return { valid: true, message: '' };
};

export const calculateTotalCost = (snapshot: CostSnapshot): number => {
  const params = snapshot.parameters;
  const clientCount = params.find(p => p.name === '客户端数量')?.value || 0;
  const hours = params.find(p => p.name === '单轮训练时长')?.value || 0;
  const price = params.find(p => p.name === '算力单价')?.value || 0;
  const grayRatio = (params.find(p => p.name === '灰度比例')?.value || 0) / 100;
  const rounds = params.find(p => p.name === '训练轮次')?.value || 0;
  const commCost = params.find(p => p.name === '通信成本')?.value || 0;

  return clientCount * hours * price * grayRatio * rounds + commCost;
};

export const getCostBreakdown = (snapshot: CostSnapshot) => {
  const params = snapshot.parameters;
  const clientCount = params.find(p => p.name === '客户端数量')?.value || 0;
  const hours = params.find(p => p.name === '单轮训练时长')?.value || 0;
  const price = params.find(p => p.name === '算力单价')?.value || 0;
  const grayRatio = (params.find(p => p.name === '灰度比例')?.value || 0) / 100;
  const rounds = params.find(p => p.name === '训练轮次')?.value || 0;
  const commCost = params.find(p => p.name === '通信成本')?.value || 0;

  const computeCost = clientCount * hours * price * grayRatio * rounds;

  return [
    { name: '算力成本', value: computeCost, percentage: (computeCost / snapshot.totalCost) * 100 },
    { name: '通信成本', value: commCost, percentage: (commCost / snapshot.totalCost) * 100 }
  ];
};
