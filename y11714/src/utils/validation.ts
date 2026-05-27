import { GROUND_MATERIALS } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExperimentParamsValidation {
  ballMass: ValidationResult;
  dropHeight: ValidationResult;
  groundMaterial: ValidationResult;
  restitution: ValidationResult;
}

export const MASS_MIN = 0.001;
export const MASS_MAX = 10;
export const HEIGHT_MIN = 0.01;
export const HEIGHT_MAX = 10;
export const RESTITUTION_MIN = 0;
export const RESTITUTION_MAX = 1;

export function validateBallMass(mass: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (isNaN(mass)) {
    errors.push('质量必须是数字');
  } else if (mass <= 0) {
    errors.push('质量必须大于0');
  } else if (mass < MASS_MIN) {
    errors.push(`质量必须大于等于 ${MASS_MIN}kg`);
  } else if (mass > MASS_MAX) {
    errors.push(`质量必须小于等于 ${MASS_MAX}kg`);
  }

  if (mass > 5) {
    warnings.push('质量较大，下落时冲击力会更强');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateDropHeight(height: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (isNaN(height)) {
    errors.push('高度必须是数字');
  } else if (height <= 0) {
    errors.push('高度必须大于0');
  } else if (height < HEIGHT_MIN) {
    errors.push(`高度必须大于等于 ${HEIGHT_MIN}m`);
  } else if (height > HEIGHT_MAX) {
    errors.push(`高度必须小于等于 ${HEIGHT_MAX}m`);
  }

  if (height > 5) {
    warnings.push('高度较高，请确保实验空间足够');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateGroundMaterial(materialId: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const validIds = GROUND_MATERIALS.map((m) => m.id);
  if (!validIds.includes(materialId)) {
    errors.push(`请选择有效的地面材质。可选值: ${validIds.join(', ')}`);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateRestitution(restitution: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (isNaN(restitution)) {
    errors.push('恢复系数必须是数字');
  } else if (restitution < RESTITUTION_MIN) {
    errors.push(`恢复系数必须大于等于 ${RESTITUTION_MIN}`);
  } else if (restitution > RESTITUTION_MAX) {
    errors.push(`恢复系数必须小于等于 ${RESTITUTION_MAX}`);
  }

  if (restitution > 0.9) {
    warnings.push('恢复系数接近1，反弹高度会非常高');
  } else if (restitution < 0.1) {
    warnings.push('恢复系数接近0，反弹会非常不明显');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateAllParams(params: {
  ballMass: number;
  dropHeight: number;
  groundMaterial: string;
  restitution: number;
}): ExperimentParamsValidation {
  return {
    ballMass: validateBallMass(params.ballMass),
    dropHeight: validateDropHeight(params.dropHeight),
    groundMaterial: validateGroundMaterial(params.groundMaterial),
    restitution: validateRestitution(params.restitution),
  };
}

export function isAllValid(validation: ExperimentParamsValidation): boolean {
  return (
    validation.ballMass.isValid &&
    validation.dropHeight.isValid &&
    validation.groundMaterial.isValid &&
    validation.restitution.isValid
  );
}

export function getAllErrors(validation: ExperimentParamsValidation): string[] {
  return [
    ...validation.ballMass.errors,
    ...validation.dropHeight.errors,
    ...validation.groundMaterial.errors,
    ...validation.restitution.errors,
  ];
}

export function getAllWarnings(validation: ExperimentParamsValidation): string[] {
  return [
    ...validation.ballMass.warnings,
    ...validation.dropHeight.warnings,
    ...validation.groundMaterial.warnings,
    ...validation.restitution.warnings,
  ];
}
