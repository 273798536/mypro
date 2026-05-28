export const formatAmount = (amount: number, decimals: number = 2): string => {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatAmountWan = (amount: number): string => {
  const wan = amount / 10000;
  return `${wan.toFixed(2)}万`;
};

export const formatAmountYi = (amount: number): string => {
  const yi = amount / 100000000;
  return `${yi.toFixed(4)}亿`;
};

export const formatPercent = (value: number, decimals: number = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const calculateDiffRate = (expected: number, actual: number): number => {
  if (expected === 0) return 0;
  return (actual - expected) / expected;
};

export const isAmountMatch = (expected: number, actual: number, tolerance: number = 0.01): boolean => {
  return Math.abs(expected - actual) <= tolerance;
};

export const isPartialAmount = (expected: number, actual: number, threshold: number = 0.99): boolean => {
  if (expected === 0) return false;
  return actual > 0 && actual < expected * threshold;
};
