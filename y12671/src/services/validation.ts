import { ValidationResult, CalculatorInput } from '@/types';

export function validateSectionCut(
  actualValue: number,
  nominalValue: number,
  tolerance: number
): ValidationResult {
  const lowerBound = nominalValue - tolerance;
  const upperBound = nominalValue + tolerance;
  const deviation = actualValue - nominalValue;
  const absDeviation = Math.abs(deviation);
  const isValid = actualValue >= lowerBound && actualValue <= upperBound;

  let failureReason: string | undefined;
  if (!isValid) {
    if (actualValue < lowerBound) {
      failureReason = `测量值 ${actualValue}mm 低于允许下限 ${lowerBound}mm，偏差 ${(actualValue - lowerBound).toFixed(2)}mm（相对标称值 ${deviation >= 0 ? '+' : ''}${deviation.toFixed(2)}mm）`;
    } else {
      failureReason = `测量值 ${actualValue}mm 高于允许上限 ${upperBound}mm，超出 ${(actualValue - upperBound).toFixed(2)}mm（相对标称值 ${deviation >= 0 ? '+' : ''}${deviation.toFixed(2)}mm）`;
    }
  }

  return {
    isValid,
    value: actualValue,
    deviation,
    lowerBound,
    upperBound,
    formula: `Δ = |${actualValue} - ${nominalValue}| = ${absDeviation.toFixed(2)} ≤ ${tolerance}  →  ${isValid ? '✓ 通过' : '✗ 越界'}`,
    unit: 'mm',
    scope: '适用于工业机器人臂展关键剖切面尺寸校验（标称值范围 100~5000mm），基于 ISO 9283 工业机器人性能标准',
    failureReason,
  };
}

export function calculateValidation(input: CalculatorInput): ValidationResult {
  return validateSectionCut(
    input.actualValue,
    input.nominalValue,
    input.tolerance
  );
}

export function batchValidate(
  values: number[],
  nominalValue: number,
  tolerance: number
): ValidationResult[] {
  return values.map(v => validateSectionCut(v, nominalValue, tolerance));
}
