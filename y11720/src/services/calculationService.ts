import { calculatePressureDrop } from '../utils/formulas';
import { validateCalculationParams, hasErrors } from '../utils/validators';
import type { CalculationParams, CalculationResult, ValidationError } from '../types';

export class CalculationService {
  static validate(params: Partial<CalculationParams>): ValidationError[] {
    return validateCalculationParams(params);
  }

  static canCalculate(params: Partial<CalculationParams>): boolean {
    const errors = this.validate(params);
    return !hasErrors(errors) && 
           params.diameter !== undefined && 
           params.flowRate !== undefined && 
           params.pipeLength !== undefined &&
           params.roughness !== undefined &&
           params.fluid !== undefined;
  }

  static calculate(params: CalculationParams): CalculationResult {
    const errors = this.validate(params);
    if (hasErrors(errors)) {
      throw new Error('参数校验失败，请检查输入');
    }
    return calculatePressureDrop(params);
  }

  static createDefaultParams(): CalculationParams {
    return {
      id: crypto.randomUUID(),
      name: '新计算方案',
      diameter: 100,
      diameterUnit: 'mm',
      flowRate: 50,
      flowRateUnit: 'm3_h',
      pipeLength: 100,
      pipeLengthUnit: 'm',
      roughness: 0.15,
      roughnessUnit: 'mm',
      fluid: {
        id: 'water-20',
        name: '水 (20°C)',
        density: 998.2,
        viscosity: 1.004e-6,
        temperature: 20,
      },
      valves: [],
      source: '手动创建',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      editHistory: [],
    };
  }

  static cloneParams(params: CalculationParams, newName?: string): CalculationParams {
    return {
      ...params,
      id: crypto.randomUUID(),
      name: newName || `${params.name} (副本)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      editHistory: [],
    };
  }

  static updateParams(
    params: CalculationParams,
    updates: Partial<CalculationParams>,
    reason?: string
  ): CalculationParams {
    const now = Date.now();
    const editHistory = [...params.editHistory];

    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = (params as any)[field];
      if (oldValue !== newValue) {
        editHistory.push({
          timestamp: now,
          field,
          oldValue,
          newValue,
          reason,
        });
      }
    }

    return {
      ...params,
      ...updates,
      updatedAt: now,
      version: params.version + 1,
      editHistory,
    };
  }
}
