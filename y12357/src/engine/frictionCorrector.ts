import type { Flywheel, InertiaResult } from '../types';
import { materialFrictionStandards } from '../data/mockFlywheels';

export const calculateFrictionCorrection = (
  theoreticalInertia: number,
  frictionCoeff: number | null
): number => {
  if (frictionCoeff === null || frictionCoeff === 0) {
    return 0;
  }
  return theoreticalInertia * frictionCoeff;
};

export const estimateFrictionDeviation = (
  flywheel: Flywheel,
  theoreticalInertia: number
): number => {
  if (flywheel.frictionCoeff !== null && flywheel.frictionCoeff !== 0) {
    return 0;
  }
  
  const standardCoeff = materialFrictionStandards[flywheel.material] || 0.025;
  const estimatedCorrection = theoreticalInertia * standardCoeff;
  
  if (theoreticalInertia > 0) {
    return (estimatedCorrection / theoreticalInertia) * 100;
  }
  
  return standardCoeff * 100;
};

export const suggestFrictionCoefficient = (material: string): number => {
  return materialFrictionStandards[material] || 0.025;
};

export const applyFrictionCorrection = (
  result: InertiaResult,
  frictionCoeff: number | null
): InertiaResult => {
  const frictionCorrection = calculateFrictionCorrection(
    result.theoreticalInertia,
    frictionCoeff
  );
  
  const finalInertia = result.measuredInertia + frictionCorrection;
  const deviation = result.theoreticalInertia > 0
    ? ((finalInertia - result.theoreticalInertia) / result.theoreticalInertia) * 100
    : 0;
  
  return {
    ...result,
    frictionCorrection,
    finalInertia,
    deviation,
    calculationTrace: {
      ...result.calculationTrace,
      steps: result.calculationTrace.steps.map(step => {
        if (step.param.includes('摩擦系数')) {
          return { ...step, value: frictionCoeff || 0, source: frictionCoeff ? '参数配置' : '未配置' };
        }
        if (step.param.includes('摩擦修正')) {
          return { ...step, value: frictionCorrection };
        }
        if (step.param.includes('最终惯量')) {
          return { ...step, value: finalInertia };
        }
        return step;
      }),
    },
  };
};
