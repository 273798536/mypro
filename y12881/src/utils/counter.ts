import { PlanktonSample, WaterQuality, CalculationResult, DataGap, CountSummary } from '@/types';

function getMissingFields(quality: WaterQuality): string[] {
  const fields: string[] = [];
  if (quality.temperature === undefined) fields.push('温度');
  if (quality.salinity === undefined) fields.push('盐度');
  if (quality.ph === undefined) fields.push('pH');
  if (quality.dissolvedOxygen === undefined) fields.push('溶解氧');
  return fields;
}

export function calculateCounts(
  samples: PlanktonSample[],
  waterQualities: WaterQuality[],
): CountSummary {
  const results: CalculationResult[] = [];
  const gaps: DataGap[] = [];
  let totalCount = 0;
  let estimatedCount = 0;
  let highConfidenceCount = 0;

  for (const sample of samples) {
    const waterQuality = waterQualities.find((w) => w.sampleId === sample.id);

    if (waterQuality?.isMissing) {
      const missingFields = getMissingFields(waterQuality);
      const hasCriticalMissing = missingFields.length >= 2;

      gaps.push({
        sampleId: sample.id,
        missingFields,
        impact: hasCriticalMissing
          ? `水质参数（${missingFields.join('、')}）缺失，计数参考权重降低 40%`
          : `水质参数（${missingFields.join('、')}）缺失，计数参考权重降低 20%`,
      });

      const weight = hasCriticalMissing ? 0.6 : 0.8;
      const adjustedCount = Math.round(sample.count * weight);
      results.push({
        sampleId: sample.id,
        adjustedCount,
        confidence: 'low',
        note: `基于估算值（权重 ${weight}）`,
      });
      totalCount += adjustedCount;
      estimatedCount += adjustedCount;
    } else if (sample.riskLevel === 'high') {
      gaps.push({
        sampleId: sample.id,
        missingFields: ['浮标可靠性'],
        impact: '浮标离线，数据完整性存疑，计数参考权重降低 35%',
      });
      const adjustedCount = Math.round(sample.count * 0.65);
      results.push({
        sampleId: sample.id,
        adjustedCount,
        confidence: 'low',
        note: '浮标异常，基于估算值（权重 0.65）',
      });
      totalCount += adjustedCount;
      estimatedCount += adjustedCount;
    } else if (sample.riskLevel === 'low') {
      results.push({
        sampleId: sample.id,
        adjustedCount: sample.count,
        confidence: 'medium',
        note: '存在计数异常，建议人工复核',
      });
      totalCount += sample.count;
      highConfidenceCount += sample.count;
    } else {
      results.push({
        sampleId: sample.id,
        adjustedCount: sample.count,
        confidence: 'high',
        note: '正常计算',
      });
      totalCount += sample.count;
      highConfidenceCount += sample.count;
    }
  }

  return {
    results,
    gaps,
    totalCount,
    estimatedCount,
    highConfidenceCount,
  };
}

export function countBySpecies(samples: PlanktonSample[]): Record<string, number> {
  const counts: Record<string, number> = {};
  samples.forEach((s) => {
    counts[s.species] = (counts[s.species] || 0) + s.count;
  });
  return counts;
}

export function countByLayer(samples: PlanktonSample[]): Record<string, number> {
  const counts: Record<string, number> = { surface: 0, middle: 0, deep: 0 };
  samples.forEach((s) => {
    counts[s.waterLayer] += s.count;
  });
  return counts;
}

export function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}
