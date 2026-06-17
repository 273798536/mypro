import type { TideCorrelation, DataRecord, TidePrediction } from '@/types';

export function calculateTideLevel(timestamp: number, baseLevel = 0): number {
  const date = new Date(timestamp);
  const hours = date.getHours() + date.getMinutes() / 60;
  const lunarDay = (hours + 3) / 12.42;
  const tide = Math.sin(lunarDay * Math.PI * 2) * 1.5;
  return baseLevel + tide;
}

export function calculateTideCorrelation(
  records: DataRecord[],
  period: { start: number; end: number }
): TideCorrelation {
  const filtered = records.filter(
    r => r.timestamp >= period.start && r.timestamp <= period.end
  );

  const loadData = filtered.map(r => {
    let load = 0;
    if (r.type === 'ship_track') load = r.powerConsumption;
    else if (r.type === 'aquaculture_log') load = r.dailyPowerUsage;
    else if (r.type === 'salinity') load = r.relatedLoad;
    return { time: r.timestamp, load, tide: calculateTideLevel(r.timestamp) };
  }).filter(d => d.load > 0);

  if (loadData.length < 5) {
    return {
      correlation: 0,
      explanation: '数据量不足，无法计算潮汐与供电负荷的相关性。',
      anomalies: [],
      avgTideHeight: 0,
      avgLoad: 0,
      tideRange: { min: 0, max: 0 },
      peakTideHour: 12,
      lowTideHour: 0,
      hourlyCorrelation: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        avgLoad: 0,
        avgTideHeight: 0
      }))
    };
  }

  const n = loadData.length;
  const sumLoad = loadData.reduce((s, d) => s + d.load, 0);
  const sumTide = loadData.reduce((s, d) => s + d.tide, 0);
  const meanLoad = sumLoad / n;
  const meanTide = sumTide / n;

  let numerator = 0;
  let denomLoad = 0;
  let denomTide = 0;

  loadData.forEach(d => {
    const diffLoad = d.load - meanLoad;
    const diffTide = d.tide - meanTide;
    numerator += diffLoad * diffTide;
    denomLoad += diffLoad * diffLoad;
    denomTide += diffTide * diffTide;
  });

  const correlation = denomLoad > 0 && denomTide > 0
    ? numerator / Math.sqrt(denomLoad * denomTide)
    : 0;

  const stdLoad = Math.sqrt(denomLoad / n);
  const anomalies = loadData.filter(d => Math.abs(d.load - meanLoad) > 2 * stdLoad);

  let explanation = '';
  const absCorr = Math.abs(correlation);
  if (absCorr >= 0.7) {
    explanation = `潮汐与供电负荷呈${correlation > 0 ? '正' : '负'}强相关（相关系数${correlation.toFixed(2)}），潮汐变化可解释大部分负荷波动。`;
  } else if (absCorr >= 0.3) {
    explanation = `潮汐与供电负荷呈${correlation > 0 ? '正' : '负'}中等相关（相关系数${correlation.toFixed(2)}），需结合其他因素分析。`;
  } else {
    explanation = `潮汐与供电负荷相关性较弱（相关系数${correlation.toFixed(2)}），负荷异常可能由其他因素引起。`;
  }

  if (anomalies.length > 0) {
    explanation += ` 检测到${anomalies.length}个负荷异常点，建议重点复核。`;
  }

  const tideHeights = loadData.map(d => d.tide);
  const avgTideHeight = sumTide / n;
  const tideRange = {
    min: Math.min(...tideHeights),
    max: Math.max(...tideHeights)
  };
  const avgLoad = sumLoad / n;

  const hourlyData: Record<number, { loads: number[]; tides: number[] }> = {};
  for (let h = 0; h < 24; h++) {
    hourlyData[h] = { loads: [], tides: [] };
  }
  loadData.forEach(d => {
    const hour = new Date(d.time).getHours();
    hourlyData[hour].loads.push(d.load);
    hourlyData[hour].tides.push(d.tide);
  });

  const hourlyCorrelation = Object.entries(hourlyData).map(([hour, data]) => ({
    hour: parseInt(hour),
    avgLoad: data.loads.length > 0 ? data.loads.reduce((a, b) => a + b, 0) / data.loads.length : 0,
    avgTideHeight: data.tides.length > 0 ? data.tides.reduce((a, b) => a + b, 0) / data.tides.length : 0
  }));

  let peakTideHour = 0;
  let lowTideHour = 0;
  let maxTide = -Infinity;
  let minTide = Infinity;
  hourlyCorrelation.forEach(h => {
    if (h.avgTideHeight > maxTide) {
      maxTide = h.avgTideHeight;
      peakTideHour = h.hour;
    }
    if (h.avgTideHeight < minTide) {
      minTide = h.avgTideHeight;
      lowTideHour = h.hour;
    }
  });

  return {
    correlation,
    explanation,
    anomalies,
    avgTideHeight,
    avgLoad,
    tideRange,
    peakTideHour,
    lowTideHour,
    hourlyCorrelation
  };
}

export function generateTidePrediction(days: number): TidePrediction[] {
  const predictions: TidePrediction[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const baseLoad = 150;
  const peakThreshold = baseLoad * 1.3;

  for (let i = 0; i < days; i++) {
    const date = now + i * dayMs;
    const tide = calculateTideLevel(date);
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const seasonalFactor = 1 + Math.sin((new Date(date).getMonth() / 12) * Math.PI * 2) * 0.15;
    const weekendFactor = isWeekend ? 0.85 : 1.0;
    const tideInfluence = 1 + tide * 0.1;

    const predictedLoad = baseLoad * seasonalFactor * weekendFactor * tideInfluence;
    const isPeak = predictedLoad > peakThreshold;

    let confidence = 0.75 - (i / days) * 0.3;
    if (isWeekend) confidence *= 0.9;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (predictedLoad > baseLoad * 1.2) riskLevel = 'medium';
    if (predictedLoad > baseLoad * 1.4 || confidence < 0.5) riskLevel = 'high';

    let recommendation: string | undefined;
    if (isPeak) {
      recommendation = '预计负荷高峰，建议做好供电调度准备';
    } else if (riskLevel === 'high') {
      recommendation = '预测置信度较低，建议多维度复核';
    }

    predictions.push({
      date,
      predictedLoad,
      predictedTide: tide,
      confidence,
      riskLevel,
      isPeak,
      recommendation
    });
  }

  return predictions;
}
