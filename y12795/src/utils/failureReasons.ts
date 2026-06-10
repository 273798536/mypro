import type { FailureReason, BlankControlStatus, WeighingRow, ExperimentRecord, ReactionTime, ResultGrade } from '@/types';

export const FAILURE_REASONS: FailureReason[] = [
  {
    code: 'E001',
    title: '空白对照缺失',
    trigger: 'blankControl === "缺失"',
    explanation: '空白对照实验用于消除量热计本身的热损耗、搅拌摩擦热等系统误差。缺失空白对照会导致温度校正值无法准确计算，最终燃烧热结果可能偏差3%~8%。这是药化实验中最常见的系统误差来源之一，必须由研究员确认是否可通过历史空白数据补偿，或安排补充实验。',
    suggestion: '必须复核，建议补充空白实验或由研究员确认是否可用历史空白数据',
  },
  {
    code: 'E002',
    title: '温度偏差超限',
    trigger: '|实测温度变化 - 预期温度变化| > 0.5℃',
    explanation: '同批次样品平行测定的温度变化值RSD（相对标准偏差）应小于2%。单组数据偏差超过0.5℃通常意味着：温度计未校准、搅拌速率不稳定、样品压片不致密导致飞溅、或点火时机过早/过晚。',
    suggestion: '建议复测，检查温度计校准、搅拌均匀性和样品压片质量',
  },
  {
    code: 'E003',
    title: '反应时间漏记',
    trigger: 'reactionTime.isMissing === true',
    explanation: '点火时间和总燃烧时长是判断燃烧是否完全的关键指标。苯甲酸标准样品的典型燃烧时间为15~30秒，若燃烧时间过短(<10s)通常意味着点火失败，过长(>60s)可能表示样品不纯或氧弹漏气。漏记这些数据将无法追溯实验过程异常。',
    suggestion: '进入联合复核，核实实验原始记录，必要时重新测定',
  },
  {
    code: 'E004',
    title: '称量质量异常',
    trigger: 'sampleMass < 0.5g 或 sampleMass > 1.5g',
    explanation: '燃烧热测定要求样品质量控制在0.5~1.5g范围内。质量过小(<0.5g)会导致温度变化值过小，相对误差增大；质量过大(>1.5g)可能导致燃烧不完全或氧弹压力超限。',
    suggestion: '检查称量单原始记录，确认是否为特殊样品，否则建议重新称量测定',
  },
  {
    code: 'E005',
    title: '燃烧热结果偏离',
    trigger: '|计算值 - 理论值| / 理论值 > 5%',
    explanation: '纯净化合物的燃烧热是物理常数，偏差超过5%通常表明：样品纯度不足、燃烧过程中有炭黑生成(不完全燃烧)、或量热计水当量未校准。此情况必须由研究员判断是否涉及样品合成质量问题。',
    suggestion: '必须研究员复核，检查样品纯度和燃烧完全性',
  },
  {
    code: 'E006',
    title: '苯甲酸质量异常',
    trigger: 'benzoicAcidMass < 0.4g 或 benzoicAcidMass > 0.6g',
    explanation: '苯甲酸作为标准量热物质，推荐用量为0.5000±0.0500g。偏离此范围可能导致温度校正曲线非线性，影响水当量校准的准确性。',
    suggestion: '建议确认苯甲酸称量准确性，必要时重新校准量热计',
  },
];

export function getFailureReason(code: string): FailureReason | undefined {
  return FAILURE_REASONS.find((r) => r.code === code);
}

export interface CheckResult {
  code: string;
  triggered: boolean;
  grade: ResultGrade;
  sourceRef: string;
}

export function runQualityChecks(
  weighingRows: WeighingRow[],
  experimentRecords: ExperimentRecord[],
  reactionTimes: ReactionTime[],
  combustionValue?: number
): CheckResult[] {
  const results: CheckResult[] = [];

  experimentRecords.forEach((rec) => {
    if (rec.blankControl === '缺失') {
      results.push({
        code: 'E001',
        triggered: true,
        grade: '必须复核',
        sourceRef: `实验记录第${rec.originalRowNumber}行${rec.imageName ? ` / 图片:${rec.imageName}` : ''}`,
      });
    }

    if (rec.tempChange !== null && Math.abs(rec.tempChange - 2.5) > 0.5) {
      results.push({
        code: 'E002',
        triggered: true,
        grade: '建议复测',
        sourceRef: `实验记录第${rec.originalRowNumber}行`,
      });
    }
  });

  reactionTimes.forEach((rt) => {
    if (rt.isMissing) {
      results.push({
        code: 'E003',
        triggered: true,
        grade: '必须复核',
        sourceRef: `反应时间第${rt.originalRowNumber}行`,
      });
    }
  });

  weighingRows.forEach((row) => {
    if (row.sampleMass !== null && (row.sampleMass < 0.5 || row.sampleMass > 1.5)) {
      results.push({
        code: 'E004',
        triggered: true,
        grade: '建议复测',
        sourceRef: `称量单第${row.originalRowNumber}行${row.imageName ? ` / 图片:${row.imageName}` : ''}`,
      });
    }
    if (row.benzoicAcidMass !== null && (row.benzoicAcidMass < 0.4 || row.benzoicAcidMass > 0.6)) {
      results.push({
        code: 'E006',
        triggered: true,
        grade: '建议复测',
        sourceRef: `称量单第${row.originalRowNumber}行`,
      });
    }
  });

  if (combustionValue !== undefined) {
    const theoreticalValue = 26460;
    const deviation = Math.abs(combustionValue - theoreticalValue) / theoreticalValue;
    if (deviation > 0.05) {
      results.push({
        code: 'E005',
        triggered: true,
        grade: '必须复核',
        sourceRef: '燃烧热计算结果',
      });
    }
  }

  return results;
}
