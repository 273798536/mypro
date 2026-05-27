import type { PredictionRecord, CorrectionRecord } from '../types';

const CATEGORIES = ['电子产品', '服装', '食品', '家居', '美妆'];
const SOURCES = ['预测系统_v2.1', '人工校准版', '历史模型对比'];

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function gaussianRandom(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * std;
}

export function generateMockPredictionData(days: number = 90): PredictionRecord[] {
  const records: PredictionRecord[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = formatDate(currentDate);

    for (const category of CATEGORIES) {
      const baseValue = getCategoryBaseValue(category);
      const dayOfWeek = currentDate.getDay();
      const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1;
      
      const isPromotion = Math.random() < 0.15;
      const promotionMultiplier = isPromotion ? 1.5 + Math.random() * 0.5 : 1;

      const predictedValue = Math.round(baseValue * weekendMultiplier * (0.9 + Math.random() * 0.2));
      const intervalWidth = predictedValue * (0.1 + Math.random() * 0.1);
      
      let lowerBound = Math.round(predictedValue - intervalWidth * 0.5);
      let upperBound = Math.round(predictedValue + intervalWidth * 0.5);

      const covered = Math.random() < 0.85;
      let actualValue: number;
      
      if (isPromotion && Math.random() < 0.4) {
        actualValue = Math.round(upperBound * (1.2 + Math.random() * 0.3));
      } else if (!covered) {
        if (Math.random() < 0.5) {
          actualValue = Math.round(lowerBound * (0.7 + Math.random() * 0.2));
        } else {
          actualValue = Math.round(upperBound * (1.1 + Math.random() * 0.2));
        }
      } else {
        actualValue = Math.round(gaussianRandom(predictedValue, (upperBound - lowerBound) / 4) * promotionMultiplier);
      }

      actualValue = Math.max(0, actualValue);
      lowerBound = Math.max(0, lowerBound);

      records.push({
        id: generateId(),
        date: dateStr,
        category,
        predictedValue,
        lowerBound,
        upperBound,
        actualValue,
        isPromotion,
        source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
        confidenceLevel: 0.95
      });
    }
  }

  return records.sort((a, b) => a.date.localeCompare(b.date));
}

function getCategoryBaseValue(category: string): number {
  const baseValues: Record<string, number> = {
    '电子产品': 5000,
    '服装': 3000,
    '食品': 2000,
    '家居': 4000,
    '美妆': 2500
  };
  return baseValues[category] || 3000;
}

export function generateMockCorrections(): CorrectionRecord[] {
  return [
    {
      id: generateId(),
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      operator: '数据分析师-李明',
      type: 'annotation',
      targetRecordIds: [],
      beforeValue: null,
      afterValue: '618促销期间',
      reason: '标注618大促期间数据异常，需单独分析',
      source: '人工校准'
    },
    {
      id: generateId(),
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      operator: '数据分析师-王芳',
      type: 'adjustment',
      targetRecordIds: [],
      beforeValue: { coverage: 0.82 },
      afterValue: { coverage: 0.88 },
      reason: '扩大家居品类预测区间±10%',
      source: '预测系统_v2.1'
    }
  ];
}
