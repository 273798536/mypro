import { CalculationInput, ValidationError } from '../types';

export function validateInput(input: CalculationInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.smallPistonArea < 0) {
    errors.push({
      field: 'smallPistonArea',
      code: 'AREA_NEGATIVE',
      message: '小活塞面积不能为负数',
      suggestion: '请输入大于0的面积值',
      severity: 'error',
    });
  }

  if (input.smallPistonArea === 0) {
    errors.push({
      field: 'smallPistonArea',
      code: 'AREA_ZERO',
      message: '小活塞面积不能为0',
      suggestion: '活塞面积必须为正数才能产生压强',
      severity: 'error',
    });
  }

  if (input.largePistonArea < 0) {
    errors.push({
      field: 'largePistonArea',
      code: 'AREA_NEGATIVE',
      message: '大活塞面积不能为负数',
      suggestion: '请输入大于0的面积值',
      severity: 'error',
    });
  }

  if (input.largePistonArea === 0) {
    errors.push({
      field: 'largePistonArea',
      code: 'AREA_ZERO',
      message: '大活塞面积不能为0',
      suggestion: '活塞面积必须为正数才能产生推力',
      severity: 'error',
    });
  }

  if (input.smallPistonAreaUnit !== input.largePistonAreaUnit) {
    errors.push({
      field: 'areaUnit',
      code: 'AREA_UNIT_MISMATCH',
      message: '两个活塞面积单位不同',
      suggestion: `系统已自动转换为统一单位计算，建议使用相同单位便于比较`,
      severity: 'warning',
    });
  }

  if (input.inputForce < 0) {
    errors.push({
      field: 'inputForce',
      code: 'FORCE_NEGATIVE',
      message: '输入力不能为负数',
      suggestion: '力的大小为标量，请输入正值',
      severity: 'error',
    });
  }

  if (input.inputForce === 0) {
    errors.push({
      field: 'inputForce',
      code: 'FORCE_ZERO',
      message: '输入力不能为0',
      suggestion: '需要施加力才能产生液压效果',
      severity: 'error',
    });
  }

  if (input.inputStroke < 0) {
    errors.push({
      field: 'inputStroke',
      code: 'STROKE_NEGATIVE',
      message: '输入行程不能为负数',
      suggestion: '行程为标量，请输入正值',
      severity: 'error',
    });
  }

  if (input.inputStroke === 0) {
    errors.push({
      field: 'inputStroke',
      code: 'STROKE_ZERO',
      message: '输入行程不能为0',
      suggestion: '活塞需要移动才能做功',
      severity: 'error',
    });
  }

  if (input.efficiency > 1) {
    errors.push({
      field: 'efficiency',
      code: 'EFFICIENCY_TOO_HIGH',
      message: '效率不能超过100%',
      suggestion: '根据热力学第二定律，实际系统必有能量损失，效率应小于1。建议值：0.85-0.95',
      severity: 'error',
    });
  }

  if (input.efficiency <= 0) {
    errors.push({
      field: 'efficiency',
      code: 'EFFICIENCY_TOO_LOW',
      message: '效率必须大于0',
      suggestion: '效率应在(0, 1]范围内',
      severity: 'error',
    });
  }

  if (input.efficiency > 0 && input.efficiency < 0.5) {
    errors.push({
      field: 'efficiency',
      code: 'EFFICIENCY_TOO_LOW',
      message: '效率过低',
      suggestion: '液压系统实际效率通常在0.8以上，您输入的值可能过低',
      severity: 'warning',
    });
  }

  const ratio = input.largePistonArea / input.smallPistonArea;
  if (ratio > 100 && input.smallPistonArea > 0) {
    errors.push({
      field: 'areaRatio',
      code: 'RATIO_TOO_LARGE',
      message: '面积比过大',
      suggestion: `当前面积比为 ${ratio.toFixed(1)}:1，过大的面积比在实际中难以实现，建议控制在 50:1 以内`,
      severity: 'warning',
    });
  }

  if (ratio < 1 && input.largePistonArea > 0 && input.smallPistonArea > 0) {
    errors.push({
      field: 'areaRatio',
      code: 'RATIO_TOO_SMALL',
      message: '面积比小于1',
      suggestion: '大活塞面积应大于小活塞面积才能实现力的放大',
      severity: 'warning',
    });
  }

  return errors;
}

export function hasCriticalErrors(errors: ValidationError[]): boolean {
  return errors.some(e => e.severity === 'error');
}
