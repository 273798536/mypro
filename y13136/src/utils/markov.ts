import type { RawParameterRecord, VerificationRecord, CalculationStep, BoundaryStatus } from '@/types';
import { generateId, isApproximatelyZero, safeDivide, formatNumber } from './common';

const BOUNDARY_THRESHOLD_NORMAL = 0.05;
const BOUNDARY_THRESHOLD_ANOMALY = 0.20;

function parseNumber(raw: string): number {
  const cleaned = raw.trim().replace(/,/g, '').replace(/%/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? NaN : num;
}

function createCalculationSteps(
  stateName: string,
  weight: number,
  rawWeight: string,
  transitionProb: number,
  rawProb: string,
  isZeroDivision: boolean,
  zeroDivisionReason?: string
): CalculationStep[] {
  const steps: CalculationStep[] = [];

  steps.push({
    stepName: '原始权重解析',
    formula: 'weight_raw → weight',
    inputs: { weight_raw_input: isNaN(weight) ? NaN : weight },
    output: weight,
    description: isNaN(weight)
      ? `原始值 "${rawWeight}" 无法解析为数字`
      : `从原始值 "${rawWeight}" 解析得到权重 ${formatNumber(weight)}`,
  });

  steps.push({
    stepName: '转移概率解析',
    formula: 'prob_raw → prob',
    inputs: { prob_raw_input: isNaN(transitionProb) ? NaN : transitionProb },
    output: transitionProb,
    description: isNaN(transitionProb)
      ? `原始值 "${rawProb}" 无法解析为数字`
      : `从原始值 "${rawProb}" 解析得到转移概率 ${formatNumber(transitionProb)}`,
  });

  const rowSum = weight + transitionProb;
  steps.push({
    stepName: '行和计算',
    formula: 'row_sum = weight + transition_probability',
    inputs: { weight, transition_probability: transitionProb },
    output: rowSum,
    description: `权重 + 转移概率 = ${formatNumber(weight)} + ${formatNumber(transitionProb)} = ${formatNumber(rowSum)}`,
  });

  if (isApproximatelyZero(weight) || isApproximatelyZero(transitionProb)) {
    steps.push({
      stepName: '除零边界检测',
      formula: 'check_zero_division(weight, probability)',
      inputs: { weight, transition_probability: transitionProb },
      output: 1,
      description: zeroDivisionReason || '检测到接近零的数值，标记为除零边界',
    });
  }

  const deviation = Math.abs(rowSum - 1.0);
  steps.push({
    stepName: '边界偏差计算',
    formula: 'deviation = |row_sum - 1.0|',
    inputs: { row_sum: rowSum, target: 1.0 },
    output: deviation,
    description: `行和与目标值 1.0 的偏差绝对值 = |${formatNumber(rowSum)} - 1.0| = ${formatNumber(deviation)}`,
  });

  let status: BoundaryStatus = 'normal';
  if (deviation >= BOUNDARY_THRESHOLD_ANOMALY) {
    status = 'anomaly';
  } else if (deviation >= BOUNDARY_THRESHOLD_NORMAL) {
    status = 'boundary';
  }

  steps.push({
    stepName: '边界状态判定',
    formula: 'status = classify(deviation, thresholds)',
    inputs: {
      deviation,
      normal_threshold: BOUNDARY_THRESHOLD_NORMAL,
      anomaly_threshold: BOUNDARY_THRESHOLD_ANOMALY,
    },
    output: status === 'normal' ? 0 : status === 'boundary' ? 1 : 2,
    description: `偏差 ${formatNumber(deviation)} ${
      status === 'normal'
        ? `< 5%，判定为正常`
        : status === 'boundary'
        ? `在 5% ~ 20% 之间，判定为边界`
        : `≥ 20%，判定为异常`
    }`,
  });

  return steps;
}

function determineZeroDivision(weight: number, transitionProb: number): { isZero: boolean; reason?: string } {
  const reasons: string[] = [];
  if (isApproximatelyZero(weight)) {
    reasons.push(`权重 ${formatNumber(weight)} 接近零`);
  }
  if (isApproximatelyZero(transitionProb)) {
    reasons.push(`转移概率 ${formatNumber(transitionProb)} 接近零`);
  }
  if (reasons.length > 0) {
    return { isZero: true, reason: reasons.join('；') };
  }
  return { isZero: false };
}

function determineBoundaryStatus(weight: number, transitionProb: number): BoundaryStatus {
  if (isNaN(weight) || isNaN(transitionProb)) return 'anomaly';
  const rowSum = weight + transitionProb;
  const deviation = Math.abs(rowSum - 1.0);
  if (deviation >= BOUNDARY_THRESHOLD_ANOMALY) return 'anomaly';
  if (deviation >= BOUNDARY_THRESHOLD_NORMAL) return 'boundary';
  return 'normal';
}

export function verifyRecords(rawRecords: RawParameterRecord[]): VerificationRecord[] {
  return rawRecords.map((raw) => {
    const rawData = raw.rawData;
    const stateName = rawData['state'] || rawData['状态'] || rawData['name'] || `state_${raw.rowIndex}`;
    const rawWeight = rawData['weight'] || rawData['权重'] || rawData['w'] || '0';
    const rawProb = rawData['probability'] || rawData['转移概率'] || rawData['prob'] || rawData['p'] || '0';

    const weight = parseNumber(rawWeight);
    const transitionProb = parseNumber(rawProb);

    const { isZero: isZeroDiv, reason: zeroDivReason } = determineZeroDivision(weight, transitionProb);
    const boundaryStatus = determineBoundaryStatus(weight, transitionProb);
    const calculationSteps = createCalculationSteps(
      stateName,
      weight,
      rawWeight,
      transitionProb,
      rawProb,
      isZeroDiv,
      zeroDivReason
    );

    return {
      id: generateId(),
      rawRecordId: raw.id,
      stateName,
      weight,
      rawWeight,
      transitionProbability: transitionProb,
      rawProbability: rawProb,
      boundaryStatus,
      isZeroDivision: isZeroDiv,
      zeroDivisionReason: zeroDivReason,
      calculationSteps,
    };
  });
}

export function calculateStatistics(records: VerificationRecord[], filteredRecords: VerificationRecord[]): {
  total: number;
  normalCount: number;
  boundaryCount: number;
  anomalyCount: number;
  zeroDivisionCount: number;
  filteredTotal: number;
} {
  const total = records.length;
  const normalCount = records.filter((r) => r.boundaryStatus === 'normal').length;
  const boundaryCount = records.filter((r) => r.boundaryStatus === 'boundary').length;
  const anomalyCount = records.filter((r) => r.boundaryStatus === 'anomaly').length;
  const zeroDivisionCount = records.filter((r) => r.isZeroDivision).length;
  const filteredTotal = filteredRecords.length;
  return { total, normalCount, boundaryCount, anomalyCount, zeroDivisionCount, filteredTotal };
}

export function applyFilter(
  records: VerificationRecord[],
  filter: {
    boundaryStatus: BoundaryStatus[];
    isZeroDivision: boolean | null;
    weightRange: [number, number] | null;
    searchKeyword: string;
  }
): VerificationRecord[] {
  return records.filter((record) => {
    if (filter.boundaryStatus.length > 0 && !filter.boundaryStatus.includes(record.boundaryStatus)) {
      return false;
    }
    if (filter.isZeroDivision !== null && record.isZeroDivision !== filter.isZeroDivision) {
      return false;
    }
    if (filter.weightRange) {
      const [min, max] = filter.weightRange;
      if (record.weight < min || record.weight > max) return false;
    }
    if (filter.searchKeyword) {
      const keyword = filter.searchKeyword.toLowerCase();
      const stateMatch = record.stateName.toLowerCase().includes(keyword);
      const rawMatch = Object.values(record).some((v) =>
        typeof v === 'string' ? v.toLowerCase().includes(keyword) : false
      );
      if (!stateMatch && !rawMatch) return false;
    }
    return true;
  });
}

export function computeWeightedDeviation(records: VerificationRecord[]): number {
  let totalWeight = 0;
  let weightedDeviation = 0;
  for (const r of records) {
    if (!isNaN(r.weight) && isFinite(r.weight) && r.weight > 0) {
      const dev = Math.abs(r.weight + r.transitionProbability - 1.0);
      totalWeight += r.weight;
      weightedDeviation += dev * r.weight;
    }
  }
  if (totalWeight === 0) return 0;
  return weightedDeviation / totalWeight;
}
