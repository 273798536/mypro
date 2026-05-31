import type { Nozzle, ValidationResult } from '../types';

export function validatePressure(
  pressure: number,
  nozzle: Nozzle
): { isValid: boolean; warning: string | null } {
  if (pressure < nozzle.minPressure) {
    return {
      isValid: false,
      warning: `压力 ${pressure} bar 低于喷嘴最小工作压力 ${nozzle.minPressure} bar，可能导致雾滴过大影响施药效果`
    };
  }
  if (pressure > nozzle.maxPressure) {
    return {
      isValid: false,
      warning: `压力 ${pressure} bar 超过喷嘴最大工作压力 ${nozzle.maxPressure} bar，存在设备损坏风险`
    };
  }
  return { isValid: true, warning: null };
}

export function detectNozzleBlockage(
  actualFlowRate: number,
  nominalFlowRate: number
): boolean {
  return actualFlowRate < nominalFlowRate * 0.7;
}

export function performValidation(
  pressure: number,
  flowRate: number,
  viscosity: number | null | undefined,
  nozzle: Nozzle
): ValidationResult {
  const pressureCheck = validatePressure(pressure, nozzle);
  const viscosityMissing = !viscosity;
  const nozzleBlocked = detectNozzleBlockage(flowRate, nozzle.nominalFlowRate);
  
  let nextStepContact: string | null = null;
  let requiresConfirmation = false;
  
  if (!pressureCheck.isValid) {
    requiresConfirmation = true;
    nextStepContact = '请联系技术主管核审压力越界情况，确认是否可继续作业';
  } else if (nozzleBlocked) {
    nextStepContact = '请联系设备维护人员检查喷嘴是否堵塞';
  } else if (viscosityMissing) {
    nextStepContact = '请补录药液黏度数据以获得更精确的计算结果';
  }
  
  return {
    pressureOutOfRange: !pressureCheck.isValid,
    pressureWarning: pressureCheck.warning,
    viscosityMissing,
    nozzleBlocked,
    nextStepContact,
    requiresConfirmation
  };
}

export function getValidationStatusColor(result: ValidationResult): string {
  if (result.nozzleBlocked) return '#F53F3F';
  if (result.pressureOutOfRange) return '#FF7D00';
  if (result.viscosityMissing) return '#FF7D00';
  return '#00B42A';
}

export function getValidationStatusText(result: ValidationResult): string {
  if (result.nozzleBlocked) return '堵塞预警';
  if (result.requiresConfirmation) return '待确认';
  if (result.viscosityMissing) return '黏度待补';
  return '正常';
}
