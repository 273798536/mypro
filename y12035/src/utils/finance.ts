import { RateEvent, DurationSettlement, CashflowMiss } from '@/types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const calculateModifiedDuration = (macaulayDuration: number, yieldRate: number): number => {
  return macaulayDuration / (1 + yieldRate / 100);
};

export const calculatePriceChange = (modifiedDuration: number, rateChange: number): number => {
  return -modifiedDuration * rateChange;
};

export const createRateEvent = (
  rateBefore: number,
  rateChange: number,
  paddleId: string,
  isConsecutiveJump: boolean,
  jumpCount: number
): RateEvent => {
  const rateAfter = rateBefore + rateChange;
  const formula = isConsecutiveJump
    ? `连跳${jumpCount}次: ${rateBefore.toFixed(2)}% + (${jumpCount} × ${(rateChange / jumpCount).toFixed(2)}%) = ${rateAfter.toFixed(2)}%`
    : `${rateBefore.toFixed(2)}% + ${rateChange.toFixed(2)}% = ${rateAfter.toFixed(2)}%`;

  return {
    id: generateId(),
    timestamp: Date.now(),
    rateBefore,
    rateAfter,
    rateChange,
    isConsecutiveJump,
    jumpCount,
    paddleId,
    formula,
  };
};

export const createDurationSettlement = (
  bondId: string,
  initialDuration: number,
  rateChange: number,
  currentYield: number
): DurationSettlement => {
  const modifiedDuration = calculateModifiedDuration(initialDuration, currentYield);
  const priceChange = calculatePriceChange(modifiedDuration, rateChange);
  const finalDuration = initialDuration * (1 + priceChange / 100);
  const expectedDirection = rateChange > 0 ? 'down' : 'up';
  const actualDirection = priceChange < 0 ? 'down' : 'up';
  const isDirectionCorrect = expectedDirection === actualDirection;

  let correctionSuggestion: string | undefined;
  if (!isDirectionCorrect) {
    correctionSuggestion = `久期方向错误：利率${rateChange > 0 ? '上升' : '下降'}时，债券价格应该${rateChange > 0 ? '下降' : '上升'}。修正步骤：1) 确认利率变动方向；2) 应用公式：价格变动% = -修正久期 × 利率变动；3) 利率↑→价格↓，利率↓→价格↑`;
  }

  return {
    id: generateId(),
    timestamp: Date.now(),
    bondId,
    initialDuration,
    rateChange,
    priceChange,
    finalDuration: Math.max(0, finalDuration),
    isDirectionCorrect,
    correctionSuggestion,
  };
};

export const createCashflowMiss = (itemId: string, missedAmount: number): CashflowMiss => {
  const correctionSteps = [
    `补记现金流金额：${missedAmount}元`,
    `补记时间：${new Date().toLocaleTimeString()}`,
    `影响分析：漏计导致当前现金流总额少计${missedAmount}元`,
    '建议：在5秒内点击现金流道具进行确认收集',
  ];

  return {
    id: generateId(),
    timestamp: Date.now(),
    itemId,
    missedAmount,
    correctionSteps,
  };
};

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const exportToJSON = (data: unknown): string => {
  return JSON.stringify(data, null, 2);
};

export const exportToCSV = (headers: string[], rows: (string | number)[][]): string => {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
  return csvContent;
};

export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
