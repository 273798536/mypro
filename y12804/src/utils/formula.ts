import type { Formula, CalculationResult, CalculationStep } from '@/types';

export function evaluateFormula(
  formula: Formula,
  inputs: Record<string, number | string>
): CalculationResult {
  const steps: CalculationStep[] = [];

  for (const param of formula.parameters) {
    if (param.required && (inputs[param.name] === undefined || inputs[param.name] === '')) {
      return {
        success: false,
        value: null,
        unit: formula.unit,
        status: 'failed',
        failureReason: `参数 "${param.label}" 为必填项，请补充后重试。`,
        formula: formula.expression,
        steps: [],
      };
    }
  }

  try {
    const values: Record<string, number> = {};
    for (const param of formula.parameters) {
      const val = inputs[param.name];
      const numVal = typeof val === 'string' ? parseFloat(val) : val;

      if (isNaN(numVal)) {
        return {
          success: false,
          value: null,
          unit: formula.unit,
          status: 'failed',
          failureReason: `参数 "${param.label}" 格式不正确，请输入有效的数字。`,
          formula: formula.expression,
          steps: [],
        };
      }

      if (param.min !== undefined && numVal < param.min) {
        return {
          success: false,
          value: null,
          unit: formula.unit,
          status: 'failed',
          failureReason: `参数 "${param.label}" 超出下限，最小值为 ${param.min}${param.unit}。`,
          formula: formula.expression,
          steps: [],
        };
      }

      if (param.max !== undefined && numVal > param.max) {
        return {
          success: false,
          value: null,
          unit: formula.unit,
          status: 'failed',
          failureReason: `参数 "${param.label}" 超出上限，最大值为 ${param.max}${param.unit}。`,
          formula: formula.expression,
          steps: [],
        };
      }

      values[param.name] = numVal;
      steps.push({
        name: param.label,
        expression: `${param.label} = ${numVal} ${param.unit}`,
        result: numVal,
        description: `输入参数 ${param.label}`,
      });
    }

    const result = calculateExpression(formula.expression, values);

    steps.push({
      name: '计算结果',
      expression: formula.expression,
      result: result,
      description: `代入公式计算`,
    });

    let status: CalculationResult['status'] = 'normal';
    let failureReason: string | undefined;

    if (formula.referenceRange) {
      if (result < formula.referenceRange.min || result > formula.referenceRange.max) {
        status = 'abnormal';
        failureReason = `计算结果 ${result.toFixed(2)} ${formula.unit} 超出参考范围 [${formula.referenceRange.min}, ${formula.referenceRange.max}] ${formula.unit}`;
      }
    }

    for (const condition of formula.failureConditions) {
      if (checkFailureCondition(condition, result, values)) {
        status = 'failed';
        failureReason = condition;
        break;
      }
    }

    return {
      success: status !== 'failed',
      value: result,
      unit: formula.unit,
      status,
      failureReason,
      formula: formula.expression,
      steps,
    };
  } catch (error) {
    return {
      success: false,
      value: null,
      unit: formula.unit,
      status: 'failed',
      failureReason: `计算过程出错：${error instanceof Error ? error.message : '未知错误'}`,
      formula: formula.expression,
      steps,
    };
  }
}

function calculateExpression(expression: string, values: Record<string, number>): number {
  let expr = expression;
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    expr = expr.replace(regex, String(value));
  }

  expr = expr.replace(/\^/g, '**');

  const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, '');
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${sanitized});`)();
  return result as number;
}

function checkFailureCondition(
  condition: string,
  result: number,
  values: Record<string, number>
): boolean {
  if (condition.includes('结果') || condition.includes('result')) {
    return false;
  }
  return false;
}
