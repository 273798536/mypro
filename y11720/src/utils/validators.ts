import type { CalculationParams, ValidationError } from '../types';

export function validateCalculationParams(params: Partial<CalculationParams>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (params.name !== undefined && params.name.trim() === '') {
    errors.push({
      field: 'name',
      message: '方案名称不能为空',
      severity: 'error',
    });
  }

  if (params.diameter !== undefined) {
    if (params.diameter <= 0) {
      errors.push({
        field: 'diameter',
        message: '管径必须大于0',
        severity: 'error',
      });
    } else if (params.diameter > 2000 && params.diameterUnit === 'mm') {
      errors.push({
        field: 'diameter',
        message: '管径超过常规范围（>2000mm），请确认单位是否正确',
        severity: 'warning',
      });
    }
  }

  if (params.flowRate !== undefined) {
    if (params.flowRate < 0) {
      errors.push({
        field: 'flowRate',
        message: '流量不能为负值',
        severity: 'error',
      });
    } else if (params.flowRate === 0) {
      errors.push({
        field: 'flowRate',
        message: '流量为0，压降计算无意义',
        severity: 'warning',
      });
    }
  }

  if (params.pipeLength !== undefined && params.pipeLength <= 0) {
    errors.push({
      field: 'pipeLength',
      message: '管长必须大于0',
      severity: 'error',
    });
  }

  if (params.roughness !== undefined) {
    if (params.roughness < 0) {
      errors.push({
        field: 'roughness',
        message: '粗糙度不能为负值',
        severity: 'error',
      });
    }
  }

  if (params.fluid) {
    if (params.fluid.density <= 0) {
      errors.push({
        field: 'fluid.density',
        message: '流体密度必须大于0',
        severity: 'error',
      });
    }
    if (params.fluid.viscosity <= 0) {
      errors.push({
        field: 'fluid.viscosity',
        message: '流体粘度必须大于0',
        severity: 'error',
      });
    }
  }

  if (params.valves) {
    params.valves.forEach((valve, index) => {
      if (valve.count < 0) {
        errors.push({
          field: `valves[${index}].count`,
          message: `${valve.type}的数量不能为负值`,
          severity: 'error',
        });
      }
      if (valve.kValue < 0) {
        errors.push({
          field: `valves[${index}].kValue`,
          message: `${valve.type}的阻力系数不能为负值`,
          severity: 'error',
        });
      }
    });
  }

  return errors;
}

export function hasErrors(errors: ValidationError[]): boolean {
  return errors.some((e) => e.severity === 'error');
}

export function getFieldErrors(errors: ValidationError[], field: string): ValidationError[] {
  return errors.filter((e) => e.field === field || e.field.startsWith(`${field}.`));
}
