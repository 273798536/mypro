import { SensorLog, ThresholdResult, OverrideAnalysis } from '../types';
import { generateId } from '../data/sampleLogs';

const parseManualJudgement = (remark: string | null): 'normal' | 'warning' | null => {
  if (!remark) return null;
  const lower = remark.toLowerCase();
  if (lower.includes('正常') || lower.includes('通过') || lower.includes('pass') || lower.includes('no warning') || lower.includes('排除') || lower.includes('误报')) {
    return 'normal';
  }
  if (lower.includes('异常') || lower.includes('预警') || lower.includes('警告') || lower.includes('确认为') || lower.includes('warning') || lower.includes('alert') || lower.includes('漏检') || lower.includes('需关注')) {
    return 'warning';
  }
  return null;
};

const getImpactDescription = (
  autoJudgement: 'normal' | 'warning',
  manualJudgement: 'normal' | 'warning' | null,
  remark: string | null
): string => {
  if (manualJudgement === null) {
    return remark ? `人工备注: "${remark}"，但未明确判定结果` : '无人工改判';
  }

  if (autoJudgement === manualJudgement) {
    return `人工判定与自动判定一致（${autoJudgement === 'warning' ? '预警' : '正常'}）`;
  }

  if (autoJudgement === 'warning' && manualJudgement === 'normal') {
    return `自动判定预警 → 人工改判为正常${remark ? `，备注: "${remark}"` : ''}。可能影响：减少误报，但存在漏检风险。`;
  }

  if (autoJudgement === 'normal' && manualJudgement === 'warning') {
    return `自动判定正常 → 人工改判为预警${remark ? `，备注: "${remark}"` : ''}。可能影响：发现漏检，但增加了人工干预成本。`;
  }

  return '未明确的改判操作';
};

const calculateImpactScore = (
  autoJudgement: 'normal' | 'warning',
  manualJudgement: 'normal' | 'warning' | null
): number => {
  if (manualJudgement === null) return 0;
  if (autoJudgement === manualJudgement) return 0;
  if (autoJudgement === 'warning' && manualJudgement === 'normal') return 1;
  if (autoJudgement === 'normal' && manualJudgement === 'warning') return 1;
  return 0.5;
};

export const analyzeOverrides = (
  logs: SensorLog[],
  thresholdResults: ThresholdResult[]
): OverrideAnalysis[] => {
  const resultMap = new Map(thresholdResults.map((r) => [r.logId, r]));

  return logs.map((log) => {
    const result = resultMap.get(log.id);
    const autoJudgement = result?.isWarning ? 'warning' : 'normal';
    const manualJudgement = parseManualJudgement(log.manualRemark);
    const isConsistent = manualJudgement === null || autoJudgement === manualJudgement;
    const impactScore = calculateImpactScore(autoJudgement, manualJudgement);
    const impactDescription = getImpactDescription(autoJudgement, manualJudgement, log.manualRemark);

    return {
      logId: log.id,
      rawLineNumber: log.rawLineNumber,
      deviceId: log.deviceId,
      autoJudgement,
      manualJudgement,
      manualRemark: log.manualRemark,
      operator: log.manualOperator,
      impactDescription,
      impactScore,
      isConsistent,
    };
  });
};

export const getOverrideStatistics = (analysis: OverrideAnalysis[]) => {
  const total = analysis.length;
  const consistent = analysis.filter((a) => a.isConsistent).length;
  const inconsistent = analysis.filter((a) => !a.isConsistent && a.manualJudgement !== null).length;
  const noOverride = analysis.filter((a) => a.manualJudgement === null).length;
  const warningToNormal = analysis.filter(
    (a) => a.autoJudgement === 'warning' && a.manualJudgement === 'normal'
  ).length;
  const normalToWarning = analysis.filter(
    (a) => a.autoJudgement === 'normal' && a.manualJudgement === 'warning'
  ).length;
  const totalImpactScore = analysis.reduce((sum, a) => sum + a.impactScore, 0);
  const overrideRate = total > 0 ? (inconsistent / total) * 100 : 0;

  return {
    total,
    consistent,
    inconsistent,
    noOverride,
    warningToNormal,
    normalToWarning,
    totalImpactScore,
    overrideRate: overrideRate.toFixed(2),
  };
};

export const getInconsistentRecords = (analysis: OverrideAnalysis[]): OverrideAnalysis[] => {
  return analysis.filter((a) => !a.isConsistent && a.manualJudgement !== null);
};
