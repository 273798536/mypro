import { DirectionCheckResult } from '@/types/experiment';
import { EXPECTED_DIRECTIONS } from '@/constants/formulas';

export const checkDirectionSigns = (
  data: Record<string, any>,
  mappedFields: { sourceField: string; targetField: string }[]
): DirectionCheckResult => {
  const anomalousFields: string[] = [];
  const detectedValues: Record<string, number> = {};
  let expectedDirection: 'positive' | 'negative' = 'positive';

  for (const { sourceField, targetField } of mappedFields) {
    const value = data[sourceField];
    
    if (value === undefined || value === null || value === '') {
      continue;
    }

    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    
    if (isNaN(numValue)) {
      continue;
    }

    const expectedDir = EXPECTED_DIRECTIONS[targetField] || EXPECTED_DIRECTIONS[sourceField];
    
    if (expectedDir) {
      expectedDirection = expectedDir;
      const hasCorrectSign = expectedDir === 'positive' ? numValue >= 0 : numValue <= 0;
      
      if (!hasCorrectSign) {
        anomalousFields.push(sourceField);
        detectedValues[sourceField] = numValue;
      }
    }
  }

  return {
    hasAnomaly: anomalousFields.length > 0,
    anomalousFields,
    detectedValues,
    expectedDirection,
  };
};

export const generateSuspendDescription = (
  checkResult: DirectionCheckResult,
  fieldLabel?: string
): string => {
  const fields = checkResult.anomalousFields.join('、');
  const values = checkResult.anomalousFields
    .map(f => `${f}=${checkResult.detectedValues[f]}`)
    .join('、');
  
  const directionText = checkResult.expectedDirection === 'positive' ? '正值' : '负值';
  const fieldText = fieldLabel || fields;
  
  return `检测到方向符号异常：${fieldText} 的值为 ${values}，预期应为${directionText}。请项目经理确认是否需要修正。`;
};

export const correctDirectionSign = (value: number): number => {
  return value * -1;
};
