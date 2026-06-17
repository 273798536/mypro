import { TideRecord, TideCalculationResult, TideChartPoint, HighLowTide, HarmonicComponent, TideCalculationResponse } from '../types/tide';
import { DataStatus, TideUnit } from '../types/common';
import { correctTimezone } from './timezone';
import { convertTideLevel } from './unitConverter';

export function linearInterpolate(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0;
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

export function interpolateMissingValues(
  records: (TideRecord & { tideLevel: number | null })[],
  method: 'linear' | 'spline' = 'linear'
): { records: (TideRecord & { tideLevel: number })[], interpolatedIds: string[], explanation: string } {
  const result: (TideRecord & { tideLevel: number })[] = [];
  const interpolatedIds: string[] = [];

  const validRecords = records.filter(r => r.tideLevel !== null);
  if (validRecords.length < 2) {
    return {
      records: records.map(r => ({ ...r, tideLevel: r.tideLevel || 0 })),
      interpolatedIds: [],
      explanation: '有效记录不足2条，无法进行插值。请补充更多数据后重试。',
    };
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.tideLevel !== null) {
      result.push({ ...record, tideLevel: record.tideLevel });
      continue;
    }

    let prevValid: typeof validRecords[0] | null = null;
    let nextValid: typeof validRecords[0] | null = null;

    for (let j = i - 1; j >= 0; j--) {
      if (records[j].tideLevel !== null) {
        prevValid = records[j] as typeof validRecords[0];
        break;
      }
    }

    for (let j = i + 1; j < records.length; j++) {
      if (records[j].tideLevel !== null) {
        nextValid = records[j] as typeof validRecords[0];
        break;
      }
    }

    if (prevValid && nextValid) {
      const x0 = prevValid.recordTime.getTime();
      const x1 = nextValid.recordTime.getTime();
      const x = record.recordTime.getTime();
      const y0 = prevValid.tideLevel;
      const y1 = nextValid.tideLevel;

      const interpolatedValue = linearInterpolate(x, x0, x1, y0, y1);
      result.push({ ...record, tideLevel: interpolatedValue });
      interpolatedIds.push(record.id);
    } else if (prevValid) {
      result.push({ ...record, tideLevel: prevValid.tideLevel });
      interpolatedIds.push(record.id);
    } else if (nextValid) {
      result.push({ ...record, tideLevel: nextValid.tideLevel });
      interpolatedIds.push(record.id);
    } else {
      result.push({ ...record, tideLevel: 0 });
    }
  }

  const methodName = method === 'linear' ? '线性插值' : '样条插值';
  const explanation = interpolatedIds.length > 0
    ? `使用${methodName}方法补全了${interpolatedIds.length}条空值记录。插值基于相邻有效记录的潮位值进行估算，建议后续补充实际观测数据以提高准确性。`
    : '所有记录均有有效值，无需插值补全。';

  return { records: result, interpolatedIds, explanation };
}

export function calculateHarmonicComponents(records: { recordTime: Date; tideLevel: number }[]): HarmonicComponent[] {
  const M2_PERIOD = 12.42;
  const S2_PERIOD = 12.00;
  const K1_PERIOD = 23.93;
  const O1_PERIOD = 25.82;

  const components: HarmonicComponent[] = [];
  const n = records.length;
  const t0 = records[0].recordTime.getTime();

  function calculateComponent(name: string, periodHours: number): HarmonicComponent {
    const omega = (2 * Math.PI) / (periodHours * 3600 * 1000);
    let sumCos = 0, sumSin = 0;

    records.forEach((record) => {
      const t = record.recordTime.getTime() - t0;
      const y = record.tideLevel;
      sumCos += y * Math.cos(omega * t);
      sumSin += y * Math.sin(omega * t);
    });

    const amplitude = (2 / n) * Math.sqrt(sumCos * sumCos + sumSin * sumSin);
    const phase = Math.atan2(sumSin, sumCos);

    return {
      name,
      amplitude: Math.round(amplitude * 100) / 100,
      phase: Math.round(phase * 100) / 100,
      period: periodHours,
    };
  }

  components.push(calculateComponent('M2', M2_PERIOD));
  components.push(calculateComponent('S2', S2_PERIOD));
  components.push(calculateComponent('K1', K1_PERIOD));
  components.push(calculateComponent('O1', O1_PERIOD));

  return components;
}

export function predictTideLevel(
  date: Date,
  components: HarmonicComponent[],
  records: { recordTime: Date; tideLevel: number }[]
): { level: number; explanation: string } {
  const t0 = records[0].recordTime.getTime();
  const t = date.getTime() - t0;

  const meanLevel = records.reduce((sum, r) => sum + r.tideLevel, 0) / records.length;
  let predicted = meanLevel;

  components.forEach(comp => {
    const omega = (2 * Math.PI) / (comp.period * 3600 * 1000);
    predicted += comp.amplitude * Math.cos(omega * t - comp.phase);
  });

  const compNames = components.map(c => `${c.name}(${c.amplitude}m)`).join('、');
  const explanation = `基于${components.length}个主要分潮（${compNames}）的调和分析结果，预测该时刻的潮位为${predicted.toFixed(2)}米。预测基于历史观测数据的周期性规律，仅供参考。`;

  return { level: Math.round(predicted * 100) / 100, explanation };
}

export function findHighLowTides(
  records: { recordTime: Date; tideLevel: number }[]
): HighLowTide[] {
  const highLows: HighLowTide[] = [];

  for (let i = 1; i < records.length - 1; i++) {
    const prev = records[i - 1];
    const curr = records[i];
    const next = records[i + 1];

    if (curr.tideLevel > prev.tideLevel && curr.tideLevel > next.tideLevel) {
      highLows.push({
        time: curr.recordTime,
        tideLevel: curr.tideLevel,
        type: 'high',
        explanation: `该时刻为高潮位，潮位${curr.tideLevel.toFixed(2)}米。前后一小时内的潮位均低于此值。`,
      });
    }

    if (curr.tideLevel < prev.tideLevel && curr.tideLevel < next.tideLevel) {
      highLows.push({
        time: curr.recordTime,
        tideLevel: curr.tideLevel,
        type: 'low',
        explanation: `该时刻为低潮位，潮位${curr.tideLevel.toFixed(2)}米。前后一小时内的潮位均高于此值。`,
      });
    }
  }

  return highLows;
}

export function calculateTideRecords(
  rawRecords: TideRecord[],
  targetTimezone: string = 'Asia/Shanghai',
  targetUnit: TideUnit = TideUnit.METER
): TideCalculationResponse {
  const interpolated = interpolateMissingValues(rawRecords as (TideRecord & { tideLevel: number | null })[], 'linear');
  const interpolatedSet = new Set(interpolated.interpolatedIds);

  const validRecords = interpolated.records.filter(r => r.tideLevel !== null);
  const harmonicComponents = calculateHarmonicComponents(validRecords);
  const highLows = findHighLowTides(validRecords);
  const highLowTimes = new Set(highLows.map(h => h.time.getTime()));

  const results: TideCalculationResult[] = rawRecords.map(record => {
    const tzCorrected = correctTimezone(record.recordTime, record.timezone, targetTimezone);
    const levelConverted = record.tideLevel !== null
      ? convertTideLevel(record.tideLevel, record.unit, targetUnit)
      : { value: 0, explanation: '原始数据为空，已使用插值补全' };

    const interpolatedRecord = interpolated.records.find(r => r.id === record.id);
    const isInterpolated = interpolatedSet.has(record.id);
    const tideLevel = interpolatedRecord?.tideLevel ?? record.tideLevel ?? 0;

    const methodParts: string[] = [];
    if (tzCorrected.originalTimezone !== tzCorrected.correctedTimezone) {
      methodParts.push('时区校正');
    }
    if (isInterpolated) {
      methodParts.push('线性插值补全');
    }
    if (levelConverted.explanation.includes('转换')) {
      methodParts.push('单位转换');
    }
    const method = methodParts.length > 0 ? methodParts.join(' + ') : '直接使用原始数据';

    const qualityScore = isInterpolated ? 85 : 100;

    const explanation = `该记录${methodParts.length > 0 ? '经过' + method : '未经过特殊处理'}。${tzCorrected.correctionExplanation} ${isInterpolated ? interpolated.explanation : levelConverted.explanation}`;

    return {
      recordId: record.id,
      originalTime: record.recordTime,
      originalTimezone: record.timezone,
      correctedTime: tzCorrected.correctedTime,
      correctedTimezone: tzCorrected.correctedTimezone,
      tideLevel,
      unit: targetUnit,
      isInterpolated,
      calculationMethod: method,
      explanation,
      qualityScore,
      issues: [],
    };
  });

  const chartData: TideChartPoint[] = results.map(r => ({
    time: r.correctedTime,
    tideLevel: r.tideLevel,
    isHigh: highLowTimes.has(r.correctedTime.getTime()) && highLows.find(h => h.time.getTime() === r.correctedTime.getTime())?.type === 'high',
    isLow: highLowTimes.has(r.correctedTime.getTime()) && highLows.find(h => h.time.getTime() === r.correctedTime.getTime())?.type === 'low',
    isInterpolated: r.isInterpolated,
    status: r.qualityScore >= 95 ? DataStatus.AVAILABLE : DataStatus.PENDING,
  }));

  const avgQuality = Math.round(results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length);

  const totalRecords = rawRecords.length;
  const interpolatedCount = interpolated.interpolatedIds.length;
  const tzCorrectedCount = results.filter(r => r.originalTimezone !== r.correctedTimezone).length;

  const explanation = `本次共处理${totalRecords}条潮汐记录。其中${interpolatedCount}条空值使用线性插值补全，${tzCorrectedCount}条记录进行了时区校正。数据质量综合评分：${avgQuality}/100。主要分潮包括：${harmonicComponents.map(c => `${c.name}(${c.amplitude}m)`).join('、')}。`;

  return {
    results,
    chartData,
    highLows,
    harmonicComponents,
    qualityScore: avgQuality,
    explanation,
    interpolatedCount,
    timezoneCorrectedCount: tzCorrectedCount,
  };
}
