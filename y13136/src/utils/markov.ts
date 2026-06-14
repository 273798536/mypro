import type {
  RawParameterRecord,
  VerificationRecord,
  CalculationStep,
  BoundaryStatus,
  UnitConversion,
  ZeroDivisionSource,
} from '@/types';
import { generateId, isApproximatelyZero, safeDivide, formatNumber } from './common';

const BOUNDARY_THRESHOLD_NORMAL = 0.05;
const BOUNDARY_THRESHOLD_ANOMALY = 0.20;

const UNIT_PATTERNS: { suffix: string; unit: string; factor: number }[] = [
  { suffix: '%', unit: '%', factor: 0.01 },
  { suffix: '‰', unit: '‰', factor: 0.001 },
  { suffix: '‱', unit: '‱', factor: 0.0001 },
];

function detectAndConvertUnit(
  raw: string,
  field: 'weight' | 'probability'
): { value: number; conversion?: UnitConversion; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: NaN, error: '空值' };
  }

  for (const pattern of UNIT_PATTERNS) {
    if (trimmed.endsWith(pattern.suffix)) {
      const numPart = trimmed.slice(0, -pattern.suffix.length).trim().replace(/,/g, '');
      const parsed = parseFloat(numPart);
      if (isNaN(parsed)) {
        return { value: NaN, error: `带单位"${pattern.unit}"但无法解析为数字` };
      }
      const converted = parsed * pattern.factor;
      const conversion: UnitConversion = {
        id: generateId(),
        fromUnit: pattern.unit,
        toUnit: '小数',
        factor: pattern.factor,
        valueBefore: parsed,
        valueAfter: converted,
        appliedField: field,
        note: `原始值 "${raw}" 按单位 ${pattern.unit} 换算（×${pattern.factor}）`,
      };
      return { value: converted, conversion };
    }
  }

  const cleaned = trimmed.replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    return { value: NaN, error: `无法解析为数字："${raw}"` };
  }

  if (parsed > 1.0 && parsed <= 100.0 && field === 'probability') {
    const converted = parsed / 100;
    const conversion: UnitConversion = {
      id: generateId(),
      fromUnit: '百分数（无%号）',
      toUnit: '小数',
      factor: 0.01,
      valueBefore: parsed,
      valueAfter: converted,
      appliedField: field,
      note: `概率值 ${parsed} > 1，推测为百分数表示，自动除以 100（可在原始数据中加%号明确）`,
    };
    return { value: converted, conversion };
  }

  return { value: parsed };
}

interface ParsedInput {
  stateName: string;
  weightValue: number;
  rawWeight: string;
  probValue: number;
  rawProb: string;
  weightConversion?: UnitConversion;
  probConversion?: UnitConversion;
  parseErrors: string[];
}

function parseRawInput(raw: RawParameterRecord): ParsedInput {
  const rawData = raw.rawData;
  const stateName = rawData['state'] || rawData['状态'] || rawData['name'] || `state_${raw.rowIndex}`;
  const rawWeight = rawData['weight'] || rawData['权重'] || rawData['w'] || '';
  const rawProb = rawData['probability'] || rawData['转移概率'] || rawData['prob'] || rawData['p'] || '';
  const parseErrors: string[] = [];

  const wResult = rawWeight ? detectAndConvertUnit(rawWeight, 'weight') : { value: 0, error: '缺失' };
  const pResult = rawProb ? detectAndConvertUnit(rawProb, 'probability') : { value: 0, error: '缺失' };

  if (wResult.error) parseErrors.push(`权重${wResult.error}`);
  if (pResult.error) parseErrors.push(`概率${pResult.error}`);

  return {
    stateName,
    weightValue: wResult.value,
    rawWeight: rawWeight || '(空)',
    probValue: pResult.value,
    rawProb: rawProb || '(空)',
    weightConversion: wResult.conversion,
    probConversion: pResult.conversion,
    parseErrors,
  };
}

function statusToCode(status: BoundaryStatus): number {
  return status === 'normal' ? 0 : status === 'boundary' ? 1 : 2;
}

export function verifyRecords(rawRecords: RawParameterRecord[]): VerificationRecord[] {
  const allWeightSum = rawRecords.reduce((acc, raw) => {
    const parsed = parseRawInput(raw);
    return acc + (isNaN(parsed.weightValue) ? 0 : parsed.weightValue);
  }, 0);

  return rawRecords.map((raw) => {
    const parsed = parseRawInput(raw);
    const steps: CalculationStep[] = [];
    const unitConversions: UnitConversion[] = [];
    const zeroSources: ZeroDivisionSource[] = [];
    const computeErrors: string[] = [];

    const {
      stateName,
      weightValue: W_raw,
      rawWeight,
      probValue: P_raw,
      rawProb,
      weightConversion,
      probConversion,
      parseErrors,
    } = parsed;

    if (weightConversion) {
      unitConversions.push(weightConversion);
      steps.push({
        stepName: '权重单位换算',
        formula: `W = W_raw × factor`,
        inputs: {
          W_raw_input: weightConversion.valueBefore,
          from_unit: weightConversion.fromUnit,
          factor: weightConversion.factor,
        },
        output: weightConversion.valueAfter,
        description: weightConversion.note || `权重单位换算：${weightConversion.fromUnit} → ${weightConversion.toUnit}`,
        unitConversionId: weightConversion.id,
      });
    } else {
      steps.push({
        stepName: '权重解析（无单位换算）',
        formula: 'W = parse(raw_weight)',
        inputs: { raw_weight: rawWeight },
        output: W_raw,
        description: parseErrors.length > 0
          ? `解析失败：${parseErrors.join('；')}`
          : `原始值 "${rawWeight}" 直接解析为 ${formatNumber(W_raw)}`,
      });
    }

    if (probConversion) {
      unitConversions.push(probConversion);
      steps.push({
        stepName: '概率单位换算',
        formula: `P = P_raw × factor`,
        inputs: {
          P_raw_input: probConversion.valueBefore,
          from_unit: probConversion.fromUnit,
          factor: probConversion.factor,
        },
        output: probConversion.valueAfter,
        description: probConversion.note || `概率单位换算：${probConversion.fromUnit} → ${probConversion.toUnit}`,
        unitConversionId: probConversion.id,
      });
    } else {
      steps.push({
        stepName: '概率解析（无单位换算）',
        formula: 'P = parse(raw_probability)',
        inputs: { raw_probability: rawProb },
        output: P_raw,
        description: isNaN(P_raw)
          ? `解析失败："${rawProb}" 无法转为数字`
          : `原始值 "${rawProb}" 直接解析为 ${formatNumber(P_raw)}`,
      });
    }

    if (isApproximatelyZero(W_raw)) {
      zeroSources.push('weight_raw_zero');
      steps.push({
        stepName: '原始值除零检测 - 权重',
        formula: 'check(W ≈ 0)',
        inputs: { W: W_raw, epsilon: 1e-10 },
        output: 1,
        description: `权重 W = ${formatNumber(W_raw)} ≈ 0，为零边界（source: weight_raw_zero）`,
        isZeroDivision: true,
        zeroDivisionSource: 'weight_raw_zero',
        zeroDivisionDetail: '权重本身为零，若作为分母将触发除零',
      });
    }

    if (isApproximatelyZero(P_raw)) {
      zeroSources.push('probability_raw_zero');
      steps.push({
        stepName: '原始值除零检测 - 概率',
        formula: 'check(P ≈ 0)',
        inputs: { P: P_raw, epsilon: 1e-10 },
        output: 1,
        description: `概率 P = ${formatNumber(P_raw)} ≈ 0，为零边界（source: probability_raw_zero）`,
        isZeroDivision: true,
        zeroDivisionSource: 'probability_raw_zero',
        zeroDivisionDetail: '转移概率本身为零，若进入转移矩阵会导致整行吸收态',
      });
    }

    steps.push({
      stepName: '行和初步计算',
      formula: 'row_sum_0 = W + P',
      inputs: { W: W_raw, P: P_raw },
      output: W_raw + P_raw,
      description: isNaN(W_raw) || isNaN(P_raw)
        ? `存在 NaN，无法计算行和（W=${formatNumber(W_raw)}, P=${formatNumber(P_raw)}）`
        : `初值行和 = ${formatNumber(W_raw)} + ${formatNumber(P_raw)} = ${formatNumber(W_raw + P_raw)}`,
    });

    if (!isNaN(W_raw) && !isNaN(P_raw)) {
      const transitionCountA = W_raw * 1000;
      const transitionCountB = P_raw * 1000;
      const transitionCountSum = transitionCountA + transitionCountB;

      steps.push({
        stepName: '转移计数汇总',
        formula: 'count_sum = count(A→A) + count(A→B)',
        inputs: { 'count(A→A)': transitionCountA, 'count(A→B)': transitionCountB },
        output: transitionCountSum,
        description: `用等比整数计数模拟：合计转移次数 = ${formatNumber(transitionCountA)} + ${formatNumber(transitionCountB)}`,
      });

      const normA = safeDivide(transitionCountA, transitionCountSum);
      if (normA.isZeroDivision) {
        zeroSources.push('transition_count_sum');
        computeErrors.push('转移计数汇总=0，归一化失败');
        steps.push({
          stepName: '转移概率归一化 ⚠️ 除零',
          formula: 'P_norm = count / count_sum',
          inputs: { count: transitionCountA, count_sum: transitionCountSum },
          output: NaN,
          description: `归一化失败：count_sum = ${formatNumber(transitionCountSum)} ≈ 0（source: transition_count_sum）`,
          isZeroDivision: true,
          zeroDivisionSource: 'transition_count_sum',
          zeroDivisionDetail: normA.reason,
        });
      } else {
        steps.push({
          stepName: '转移概率归一化',
          formula: 'P_norm = count / count_sum',
          inputs: { count: transitionCountA, count_sum: transitionCountSum },
          output: normA.result,
          description: `归一化结果 = ${formatNumber(transitionCountA)} / ${formatNumber(transitionCountSum)} = ${formatNumber(normA.result)}`,
        });
      }
    }

    if (!isNaN(W_raw) && W_raw > 0) {
      const numerator = P_raw;
      const steadDenom = 1 - W_raw;
      const steady = safeDivide(numerator, steadDenom);
      if (steady.isZeroDivision) {
        zeroSources.push('steady_state_denominator');
        computeErrors.push('稳态求解分母=0（1-W=0）');
        steps.push({
          stepName: '稳态分布求解 ⚠️ 除零',
          formula: 'π_B = P / (1 - W)',
          inputs: { P: numerator, '1-W': steadDenom },
          output: NaN,
          description: `稳态求解失败：分母 1-W = ${formatNumber(steadDenom)} ≈ 0（source: steady_state_denominator）`,
          isZeroDivision: true,
          zeroDivisionSource: 'steady_state_denominator',
          zeroDivisionDetail: steady.reason,
        });
      } else {
        steps.push({
          stepName: '稳态分布求解',
          formula: 'π_B = P / (1 - W)',
          inputs: { P: numerator, '1-W': steadDenom },
          output: steady.result,
          description: `稳态 π_B = ${formatNumber(numerator)} / ${formatNumber(steadDenom)} = ${formatNumber(steady.result)}`,
        });
      }
    }

    if (!isNaN(W_raw) && !isNaN(P_raw) && allWeightSum > 0) {
      const weightNorm = safeDivide(W_raw, allWeightSum);
      if (weightNorm.isZeroDivision) {
        zeroSources.push('weight_normalize_sum');
        computeErrors.push('全局权重求和=0，权重归一化失败');
        steps.push({
          stepName: '全局权重归一化 ⚠️ 除零',
          formula: 'w_i_norm = w_i / Σ(w)',
          inputs: { w_i: W_raw, 'Σ(w)': allWeightSum },
          output: NaN,
          description: `权重归一化失败：Σ(w) = ${formatNumber(allWeightSum)} ≈ 0（source: weight_normalize_sum）`,
          isZeroDivision: true,
          zeroDivisionSource: 'weight_normalize_sum',
          zeroDivisionDetail: weightNorm.reason,
        });
      } else {
        steps.push({
          stepName: '全局权重归一化',
          formula: 'w_i_norm = w_i / Σ(w)',
          inputs: { w_i: W_raw, 'Σ(w)': allWeightSum },
          output: weightNorm.result,
          description: `归一化权重 = ${formatNumber(W_raw)} / ${formatNumber(allWeightSum)} = ${formatNumber(weightNorm.result)}`,
        });
      }
    }

    const rowSum = W_raw + P_raw;
    const deviation = Math.abs(rowSum - 1.0);
    let boundaryStatus: BoundaryStatus = 'normal';
    if (parseErrors.length > 0 || isNaN(W_raw) || isNaN(P_raw)) {
      boundaryStatus = 'anomaly';
    } else if (deviation >= BOUNDARY_THRESHOLD_ANOMALY) {
      boundaryStatus = 'anomaly';
    } else if (deviation >= BOUNDARY_THRESHOLD_NORMAL) {
      boundaryStatus = 'boundary';
    }

    steps.push({
      stepName: '边界偏差计算',
      formula: 'deviation = |(W+P) - 1.0|',
      inputs: { 'W+P': rowSum, target: 1.0 },
      output: deviation,
      description: isNaN(rowSum)
        ? `行和为 NaN，无法计算偏差（判定为异常）`
        : `偏差 = |${formatNumber(rowSum)} - 1.0| = ${formatNumber(deviation)}`,
    });

    steps.push({
      stepName: '边界状态判定',
      formula: 'status = classify(deviation, [5%, 20%])',
      inputs: {
        deviation,
        parse_error_count: parseErrors.length,
        normal_threshold: BOUNDARY_THRESHOLD_NORMAL,
        anomaly_threshold: BOUNDARY_THRESHOLD_ANOMALY,
      },
      output: statusToCode(boundaryStatus),
      description: parseErrors.length > 0
        ? `存在解析错误（${parseErrors.length}项），直接判定为异常`
        : `偏差 ${formatNumber(deviation)} 对应判定：${boundaryStatus === 'normal' ? '正常(<5%)' : boundaryStatus === 'boundary' ? '边界(5%~20%)' : '异常(≥20%)'}`,
    });

    const uniqueZeroSources = Array.from(new Set(zeroSources));
    let zeroReason: string | undefined;
    if (uniqueZeroSources.length > 0) {
      const labels: Record<ZeroDivisionSource, string> = {
        weight_raw_zero: '原始权重为零',
        probability_raw_zero: '原始概率为零',
        transition_count_sum: '转移计数归一化分母为零',
        steady_state_denominator: '稳态求解分母为零',
        weight_normalize_sum: '权重归一化总分母为零',
      };
      zeroReason = uniqueZeroSources.map((s) => labels[s]).join('、');
    }

    return {
      id: generateId(),
      rawRecordId: raw.id,
      stateName,
      weight: W_raw,
      rawWeight,
      transitionProbability: P_raw,
      rawProbability: rawProb,
      boundaryStatus,
      isZeroDivision: uniqueZeroSources.length > 0,
      zeroDivisionReason: zeroReason,
      zeroDivisionSources: uniqueZeroSources,
      calculationSteps: steps,
      unitConversions,
      parseError: parseErrors.length > 0 ? parseErrors.join('；') : undefined,
      computeError: computeErrors.length > 0 ? computeErrors.join('；') : undefined,
    };
  });
}

export function calculateStatistics(records: VerificationRecord[], filteredRecords: VerificationRecord[]): {
  total: number;
  normalCount: number;
  boundaryCount: number;
  anomalyCount: number;
  zeroDivisionCount: number;
  parseErrorCount: number;
  computeErrorCount: number;
  filteredTotal: number;
} {
  const total = records.length;
  const normalCount = records.filter((r) => r.boundaryStatus === 'normal').length;
  const boundaryCount = records.filter((r) => r.boundaryStatus === 'boundary').length;
  const anomalyCount = records.filter((r) => r.boundaryStatus === 'anomaly').length;
  const zeroDivisionCount = records.filter((r) => r.isZeroDivision).length;
  const parseErrorCount = records.filter((r) => r.parseError).length;
  const computeErrorCount = records.filter((r) => r.computeError).length;
  const filteredTotal = filteredRecords.length;
  return { total, normalCount, boundaryCount, anomalyCount, zeroDivisionCount, parseErrorCount, computeErrorCount, filteredTotal };
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
      if (isNaN(record.weight)) return false;
      if (record.weight < min || record.weight > max) return false;
    }
    if (filter.searchKeyword) {
      const keyword = filter.searchKeyword.toLowerCase();
      const stateMatch = record.stateName.toLowerCase().includes(keyword);
      const zeroMatch = record.zeroDivisionSources.some((s) => s.toLowerCase().includes(keyword));
      const errMatch = (record.parseError || '').toLowerCase().includes(keyword) || (record.computeError || '').toLowerCase().includes(keyword);
      const rawMatch = Object.values(record).some((v) =>
        typeof v === 'string' ? v.toLowerCase().includes(keyword) : false
      );
      if (!stateMatch && !rawMatch && !zeroMatch && !errMatch) return false;
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
