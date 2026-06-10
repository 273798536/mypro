import type {
  Experiment,
  CalculationResult,
  ResultStatus,
} from '@/types';

export const CALCULATION_CONFIG = {
  MIN_WATER_CONTENT: 0.5,
  MAX_WATER_CONTENT: 50.0,
  PARALLEL_DEVIATION_THRESHOLD: 0.5,
  DEFAULT_BLANK_HISTORY_DAYS: 30,
  DEFAULT_BLANK_FALLBACK: 0.0023,
  FORMULA_STANDARD: 'H₂O(%) = [(m₁ - m₂ - B) / m₁] × 100%',
  FORMULA_FALLBACK: 'H₂O(%) = [(m₁ - m₂ - B̄) / m₁] × 100%',
  APPLICABLE_RANGE: '结晶水含量 0.5% ~ 50.0% 的无机/有机晶体样品',
  UNIT: '%',
};

export interface CalculationParams {
  sampleMass: number;
  dryMass: number;
  blankControl: number | null;
  parallelResults?: number[];
  historicalBlanks?: number[];
  reagentName?: string;
  sampleNo?: string;
  batchNo?: string;
}

export interface CalculationOutput {
  result: CalculationResult | null;
  errors: string[];
  warnings: string[];
}

function generateId(): string {
  return `res_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function calculateWaterContent(
  sampleMass: number,
  dryMass: number,
  blank: number
): number {
  const waterLoss = sampleMass - dryMass - blank;
  return (waterLoss / sampleMass) * 100;
}

function validateInputs(params: CalculationParams): string[] {
  const errors: string[] = [];

  if (!params.sampleMass || params.sampleMass <= 0) {
    errors.push('样品质量必须大于 0 g');
  }
  if (params.dryMass === undefined || params.dryMass === null || params.dryMass < 0) {
    errors.push('干燥后质量不能为空且不能为负数');
  }
  if (params.sampleMass && params.dryMass !== undefined && params.dryMass >= params.sampleMass) {
    errors.push('干燥后质量不能大于或等于样品质量');
  }
  if (params.parallelResults && params.parallelResults.length > 1) {
    const hasInvalid = params.parallelResults.some(
      (v) => v === undefined || v === null || isNaN(v)
    );
    if (hasInvalid) {
      errors.push('平行样数据存在无效值');
    }
  }

  return errors;
}

function getParallelDeviation(results: number[]): number | undefined {
  if (!results || results.length < 2) return undefined;
  const valid = results.filter((v) => !isNaN(v) && isFinite(v));
  if (valid.length < 2) return undefined;
  const max = Math.max(...valid);
  const min = Math.min(...valid);
  return Number((max - min).toFixed(4));
}

function getHistoricalBlankMean(blanks?: number[]): number | null {
  if (!blanks || blanks.length === 0) return null;
  const valid = blanks.filter((v) => !isNaN(v) && isFinite(v) && v > 0);
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Number((sum / valid.length).toFixed(6));
}

function determineStatus(
  waterContent: number,
  blankFallback: boolean,
  deviation?: number
): { status: ResultStatus; reason?: string } {
  if (
    waterContent < CALCULATION_CONFIG.MIN_WATER_CONTENT ||
    waterContent > CALCULATION_CONFIG.MAX_WATER_CONTENT
  ) {
    return {
      status: 'FAIL',
      reason: `计算结果 ${waterContent.toFixed(3)}% 超出适用范围 ${CALCULATION_CONFIG.MIN_WATER_CONTENT}% ~ ${CALCULATION_CONFIG.MAX_WATER_CONTENT}%，请检查样品质量与干燥后质量数据`,
    };
  }

  if (blankFallback) {
    return {
      status: 'REVIEW',
      reason: '空白对照缺失，已使用历史均值替代计算，请管理员复核',
    };
  }

  if (deviation !== undefined && deviation > CALCULATION_CONFIG.PARALLEL_DEVIATION_THRESHOLD) {
    return {
      status: 'REVIEW',
      reason: `平行样偏差 ${deviation.toFixed(3)}% 超过阈值 ${CALCULATION_CONFIG.PARALLEL_DEVIATION_THRESHOLD}%，建议复查`,
    };
  }

  return { status: 'PASS' };
}

function generateSafetyTip(waterContent: number, reagentName?: string): string {
  const tips: string[] = [];

  if (waterContent > 20) {
    tips.push('水含量较高，注意防潮密封保存');
  } else if (waterContent < 1) {
    tips.push('水含量较低，确认是否为无水晶体');
  } else {
    tips.push('水含量处于正常范围');
  }

  if (reagentName) {
    tips.push(`使用试剂：${reagentName}，请核对试剂有效期`);
  }

  tips.push('实验废弃物请按晶体类化合物规范处理');
  return tips.join('；');
}

function generateRetestAdvice(
  status: ResultStatus,
  failureReason?: string,
  blankFallback?: boolean
): string | undefined {
  if (status === 'PASS' && !blankFallback) return undefined;

  const advices: string[] = [];

  if (blankFallback) {
    advices.push('1. 优先补做空白对照实验，使用新鲜干燥皿');
    advices.push('2. 确认同批次试剂的历史空白数据稳定性');
  }

  if (failureReason?.includes('超出适用范围')) {
    advices.push('3. 重新称量样品，检查电子天平是否校准');
    advices.push('4. 确认干燥温度与时间是否符合该晶体要求');
    advices.push('5. 检查干燥器内干燥剂是否失效');
  } else if (failureReason?.includes('平行样偏差')) {
    advices.push('3. 检查样品研磨均匀度，重新取样进行平行测定');
    advices.push('4. 确认每次称量时冷却时间是否一致');
  }

  if (advices.length === 0) {
    advices.push('请联系实验室管理员复核本次计算原始记录');
  }

  return advices.join('\n');
}

function buildSourceTrace(
  sampleNo?: string,
  batchNo?: string,
  reagentName?: string
): string {
  const parts: string[] = [];
  if (sampleNo) parts.push(`样品：${sampleNo}`);
  if (batchNo) parts.push(`批次：${batchNo}`);
  if (reagentName) parts.push(`试剂：${reagentName}`);
  return parts.length > 0 ? parts.join(' | ') : '来源信息待补充';
}

export function calculateWaterContentResult(
  experimentId: string,
  params: CalculationParams
): CalculationOutput {
  const errors = validateInputs(params);
  const warnings: string[] = [];

  if (errors.length > 0) {
    return { result: null, errors, warnings };
  }

  let blankValue: number;
  let blankFallback = false;
  let blankFallbackValue: number | undefined;

  if (params.blankControl !== null && params.blankControl !== undefined && !isNaN(params.blankControl)) {
    blankValue = params.blankControl;
  } else {
    const historicalMean = getHistoricalBlankMean(params.historicalBlanks);
    if (historicalMean !== null) {
      blankValue = historicalMean;
      blankFallback = true;
      blankFallbackValue = historicalMean;
      warnings.push(
        `空白对照缺失，已使用近${CALCULATION_CONFIG.DEFAULT_BLANK_HISTORY_DAYS}天空白对照均值 ${historicalMean.toFixed(6)} g 替代计算`
      );
    } else {
      blankValue = CALCULATION_CONFIG.DEFAULT_BLANK_FALLBACK;
      blankFallback = true;
      blankFallbackValue = CALCULATION_CONFIG.DEFAULT_BLANK_FALLBACK;
      warnings.push(
        `空白对照缺失且无历史数据，已使用默认值 ${CALCULATION_CONFIG.DEFAULT_BLANK_FALLBACK} g 替代计算，强烈建议补做空白对照`
      );
    }
  }

  const waterContent = Number(
    calculateWaterContent(params.sampleMass, params.dryMass, blankValue).toFixed(4)
  );

  const deviation = getParallelDeviation(params.parallelResults || []);
  const { status, reason } = determineStatus(waterContent, blankFallback, deviation);

  const formula = blankFallback
    ? CALCULATION_CONFIG.FORMULA_FALLBACK
    : CALCULATION_CONFIG.FORMULA_STANDARD;

  const formulaDetail = blankFallback
    ? `H₂O(%) = [(${params.sampleMass} - ${params.dryMass} - ${blankFallbackValue?.toFixed(6) || 'B̄'}) / ${params.sampleMass}] × 100% = ${waterContent.toFixed(4)}%`
    : `H₂O(%) = [(${params.sampleMass} - ${params.dryMass} - ${blankValue.toFixed(6)}) / ${params.sampleMass}] × 100% = ${waterContent.toFixed(4)}%`;

  const result: CalculationResult = {
    id: generateId(),
    experimentId,
    waterContent,
    status,
    formula,
    formulaDetail,
    failureReason: status === 'FAIL' ? reason : undefined,
    safetyTip: generateSafetyTip(waterContent, params.reagentName),
    retestAdvice: generateRetestAdvice(status, reason, blankFallback),
    blankFallback,
    blankFallbackValue,
    sourceTrace: buildSourceTrace(params.sampleNo, params.batchNo, params.reagentName),
    parallelDeviation: deviation,
    applicableRange: CALCULATION_CONFIG.APPLICABLE_RANGE,
    unit: CALCULATION_CONFIG.UNIT,
    calculatedAt: new Date().toISOString(),
  };

  return { result, errors, warnings };
}

export { calculateWaterContent as pureCalculateWaterContent };
