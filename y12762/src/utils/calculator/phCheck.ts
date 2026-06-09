import type { Anomaly, AnomalySeverity } from '../../types';

const PH_THEORETICAL_MIN = 0;
const PH_THEORETICAL_MAX = 14;
const PH_COMMON_MIN = 2;
const PH_COMMON_MAX = 12;

export interface PhCheckResult {
  isNormal: boolean;
  isInCommonRange: boolean;
  severity?: AnomalySeverity;
  actualValue: number;
  expectedMin: number;
  expectedMax: number;
  deviation?: number;
  possibleCauses: string[];
  suggestions: string[];
  userFriendlyMessage: string;
}

export function checkPhValue(phValue: number): PhCheckResult {
  const result: PhCheckResult = {
    isNormal: true,
    isInCommonRange: true,
    actualValue: phValue,
    expectedMin: PH_COMMON_MIN,
    expectedMax: PH_COMMON_MAX,
    possibleCauses: [],
    suggestions: [],
    userFriendlyMessage: '',
  };

  if (phValue < PH_THEORETICAL_MIN || phValue > PH_THEORETICAL_MAX) {
    result.isNormal = false;
    result.isInCommonRange = false;
    result.severity = 'critical';
    result.expectedMin = PH_THEORETICAL_MIN;
    result.expectedMax = PH_THEORETICAL_MAX;
    result.deviation = phValue < PH_THEORETICAL_MIN
      ? PH_THEORETICAL_MIN - phValue
      : phValue - PH_THEORETICAL_MAX;
    result.possibleCauses = [
      'pH电极未校准或校准失效',
      '数据录入时存在笔误',
      '测量仪器故障',
      '样品受到严重污染',
    ];
    result.suggestions = [
      '立即检查pH电极并重新校准',
      '核对原始称量单和实验记录',
      '更换测量仪器重新检测',
      '检查样品是否受到污染',
    ];
    result.userFriendlyMessage = phValue > PH_THEORETICAL_MAX
      ? `pH值为${phValue.toFixed(2)}，已超出水溶液理论最大值${PH_THEORETICAL_MAX}。可能原因：电极校准偏差或录入笔误，请立即检查测量设备和原始记录。`
      : `pH值为${phValue.toFixed(2)}，已低于水溶液理论最小值${PH_THEORETICAL_MIN}。可能原因：电极校准偏差或录入笔误，请立即检查测量设备和原始记录。`;
  } else if (phValue < PH_COMMON_MIN || phValue > PH_COMMON_MAX) {
    result.isNormal = true;
    result.isInCommonRange = false;
    result.severity = 'warning';
    result.deviation = phValue < PH_COMMON_MIN
      ? PH_COMMON_MIN - phValue
      : phValue - PH_COMMON_MAX;
    result.possibleCauses = [
      '试剂浓度配制不准确',
      '温度影响pH值测量',
      '溶液未充分混匀',
    ];
    result.suggestions = [
      '确认试剂配制浓度是否正确',
      '检查测量时的温度是否在标准范围',
      '充分搅拌溶液后重新测量',
    ];
    result.userFriendlyMessage = phValue > PH_COMMON_MAX
      ? `pH值为${phValue.toFixed(2)}，偏高，超出常用范围${PH_COMMON_MIN}-${PH_COMMON_MAX}。虽然仍在理论范围内，但建议检查试剂浓度是否配制准确。`
      : `pH值为${phValue.toFixed(2)}，偏低，低于常用范围${PH_COMMON_MIN}-${PH_COMMON_MAX}。虽然仍在理论范围内，但建议检查试剂浓度是否配制准确。`;
  } else {
    result.userFriendlyMessage = `pH值为${phValue.toFixed(2)}，处于正常范围${PH_COMMON_MIN}-${PH_COMMON_MAX}内，无需特殊处理。`;
  }

  return result;
}

export function createPhAnomaly(
  reagentId: string,
  phValue: number,
  checkResult: PhCheckResult
): Anomaly {
  return {
    id: `anomaly-ph-${reagentId}-${Date.now()}`,
    reagentId,
    type: 'ph_out_of_range',
    severity: checkResult.severity || 'warning',
    description: `pH值${phValue.toFixed(2)}超出范围[${checkResult.expectedMin}, ${checkResult.expectedMax}]`,
    userFriendlyMessage: checkResult.userFriendlyMessage,
    actualValue: phValue,
    expectedMin: checkResult.expectedMin,
    expectedMax: checkResult.expectedMax,
  };
}
