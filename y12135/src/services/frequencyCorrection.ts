import { CableArchive, TemperatureRecord, MonitoringDetail } from '../types';

export interface CorrectionResult {
  corrected_frequency: number | null;
  temperature_correction: number | null;
  wind_effect_estimate: number | null;
  deviation_from_design: number | null;
}

export function correctFrequency(
  rawFrequency: number | null,
  rawTemperature: number | null,
  windSpeed: number | null,
  cableArchive?: CableArchive
): CorrectionResult {
  if (rawFrequency === null || rawFrequency === undefined) {
    return {
      corrected_frequency: null,
      temperature_correction: null,
      wind_effect_estimate: null,
      deviation_from_design: null
    };
  }

  let correctedFrequency = rawFrequency;
  let temperatureCorrection: number | null = null;
  let windEffectEstimate: number | null = null;
  let deviationFromDesign: number | null = null;

  if (cableArchive && rawTemperature !== null && rawTemperature !== undefined) {
    const tempDiff = rawTemperature - cableArchive.reference_temperature;
    temperatureCorrection = -cableArchive.temperature_coefficient * tempDiff * cableArchive.design_frequency;
    correctedFrequency += temperatureCorrection;
  }

  if (windSpeed !== null && windSpeed !== undefined) {
    windEffectEstimate = calculateWindEffect(windSpeed, correctedFrequency, cableArchive);
    correctedFrequency -= windEffectEstimate;
  }

  if (cableArchive) {
    deviationFromDesign = ((correctedFrequency - cableArchive.design_frequency) / cableArchive.design_frequency) * 100;
  }

  return {
    corrected_frequency: Math.round(correctedFrequency * 1000) / 1000,
    temperature_correction: temperatureCorrection !== null ? Math.round(temperatureCorrection * 1000000) / 1000000 : null,
    wind_effect_estimate: windEffectEstimate !== null ? Math.round(windEffectEstimate * 10000) / 10000 : null,
    deviation_from_design: deviationFromDesign !== null ? Math.round(deviationFromDesign * 100) / 100 : null
  };
}

function calculateWindEffect(
  windSpeed: number,
  currentFrequency: number,
  cableArchive?: CableArchive
): number {
  const dampingRatio = 0.005;
  const windPressure = 0.613 * windSpeed * windSpeed;
  
  let diameter = 0.1;
  let length = 100;
  let massPerUnitLength = 50;
  
  if (cableArchive) {
    diameter = cableArchive.diameter;
    length = cableArchive.length;
    const area = Math.PI * Math.pow(cableArchive.diameter / 2, 2);
    const density = cableArchive.material === 'steel' ? 7850 : 2700;
    massPerUnitLength = area * density;
  }
  
  const windForce = windPressure * diameter * length;
  const criticalDamping = 2 * massPerUnitLength * currentFrequency * Math.PI;
  const windEffect = windForce / (2 * criticalDamping * dampingRatio);
  
  return Math.abs(windEffect) * 0.001 * currentFrequency;
}

export function detectTemperatureDrift(
  records: Array<{ record_time: string; temperature: number | null }>,
  currentRecord: { record_time: string; temperature: number | null }
): { isDrift: boolean; driftRate: number; explanation: string } {
  const recentRecords = records
    .filter(r => r.temperature !== null)
    .sort((a, b) => new Date(a.record_time).getTime() - new Date(b.record_time).getTime())
    .slice(-20);

  if (recentRecords.length < 5 || currentRecord.temperature === null) {
    return { isDrift: false, driftRate: 0, explanation: '数据不足，无法判断温度漂移' };
  }

  const temps = recentRecords.map(r => r.temperature as number);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const stdTemp = Math.sqrt(temps.reduce((a, b) => a + Math.pow(b - avgTemp, 2), 0) / temps.length);
  
  const currentTemp = currentRecord.temperature;
  const deviation = Math.abs(currentTemp - avgTemp);
  
  if (deviation > 3 * stdTemp && stdTemp > 0.5) {
    const driftRate = ((currentTemp - avgTemp) / avgTemp) * 100;
    return {
      isDrift: true,
      driftRate: Math.round(driftRate * 100) / 100,
      explanation: `温度偏离历史平均值 ${deviation.toFixed(2)}°C，超过3倍标准差 (${stdTemp.toFixed(2)}°C)，疑似温度漂移`
    };
  }

  return {
    isDrift: false,
    driftRate: 0,
    explanation: '温度在正常波动范围内'
  };
}

export function detectSensorBreak(
  currentRecord: { frequency: number | null; temperature: number | null },
  previousRecord?: { frequency: number | null; temperature: number | null }
): { isBreak: boolean; explanation: string } {
  if (currentRecord.frequency === null && currentRecord.temperature === null) {
    return {
      isBreak: true,
      explanation: '频率和温度数据同时缺失，疑似传感器断点'
    };
  }

  if (currentRecord.frequency === null || currentRecord.temperature === null) {
    return {
      isBreak: true,
      explanation: `${currentRecord.frequency === null ? '频率' : '温度'}数据缺失，疑似传感器部分故障`
    };
  }

  if (previousRecord && previousRecord.frequency !== null) {
    const freqChange = Math.abs(currentRecord.frequency - previousRecord.frequency) / previousRecord.frequency;
    if (freqChange > 0.5) {
      return {
        isBreak: true,
        explanation: `频率突变 ${(freqChange * 100).toFixed(1)}%，超出正常范围，疑似传感器异常`
      };
    }
  }

  return {
    isBreak: false,
    explanation: '传感器数据正常'
  };
}

export function detectWindMissing(windSpeed: number | null): { isMissing: boolean; explanation: string } {
  if (windSpeed === null || windSpeed === undefined) {
    return {
      isMissing: true,
      explanation: '风速数据缺失，将使用默认风速模型进行估算'
    };
  }
  return {
    isMissing: false,
    explanation: '风速数据正常'
  };
}

export function analyzeTrend(
  currentDetail: MonitoringDetail,
  historicalDetails: MonitoringDetail[]
): { trend: string; comparison: string } {
  const recentDetails = historicalDetails
    .filter(d => d.corrected_frequency !== null)
    .sort((a, b) => new Date(a.record_time).getTime() - new Date(b.record_time).getTime())
    .slice(-10);

  if (recentDetails.length < 3 || currentDetail.corrected_frequency === null) {
    return {
      trend: '数据不足，无法分析趋势',
      comparison: '历史数据不足'
    };
  }

  const recentFreqs = recentDetails.map(d => d.corrected_frequency as number);
  const avgRecent = recentFreqs.reduce((a, b) => a + b, 0) / recentFreqs.length;
  const currentFreq = currentDetail.corrected_frequency;
  const changePercent = ((currentFreq - avgRecent) / avgRecent) * 100;

  let trend = '稳定';
  if (changePercent > 2) trend = '上升趋势';
  else if (changePercent < -2) trend = '下降趋势';

  const comparison = `当前频率 ${currentFreq.toFixed(3)} Hz，相较近期均值 ${avgRecent.toFixed(3)} Hz ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;

  return { trend, comparison };
}
