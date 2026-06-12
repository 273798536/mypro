import type { AquacultureLog, ErosionCalculationResult } from '../types';

export const EXPECTED_SUBMIT_HOUR = 18;
export const DELAY_WARNING_HOURS = 2;
export const DELAY_CRITICAL_HOURS = 12;

export function calculateDelay(log: AquacultureLog): {
  isDelayed: boolean;
  delayHours: number;
  severity: 'normal' | 'warning' | 'critical';
} {
  const submitTime = new Date(log.submitTime);
  const expectedTime = new Date(log.expectedSubmitTime);
  
  const delayMs = submitTime.getTime() - expectedTime.getTime();
  const delayHours = delayMs / (1000 * 60 * 60);
  
  const isDelayed = delayHours > 0;
  
  let severity: 'normal' | 'warning' | 'critical' = 'normal';
  if (delayHours > DELAY_CRITICAL_HOURS) {
    severity = 'critical';
  } else if (delayHours > DELAY_WARNING_HOURS) {
    severity = 'warning';
  }
  
  return { isDelayed, delayHours, severity };
}

export function getDelaySeverityInfo(severity: 'normal' | 'warning' | 'critical') {
  switch (severity) {
    case 'normal':
      return { label: '按时', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' };
    case 'warning':
      return { label: '延迟', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' };
    case 'critical':
      return { label: '严重延迟', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' };
  }
}

export function findAffectedResults(
  delayedLog: AquacultureLog,
  erosionResults: ErosionCalculationResult[]
): ErosionCalculationResult[] {
  return erosionResults.filter(result => 
    result.dataSources.some(source => 
      source.includes(delayedLog.farmName) ||
      delayedLog.farmName === source || 
      source.includes(delayedLog.farmId)
    )
  );
}

export function analyzeDelayedLogImpact(
  logs: AquacultureLog[],
  results: ErosionCalculationResult[]
): {
  totalDelayed: number;
  affectedResultCount: number;
  affectedResultIds: string[];
  conclusions: string[];
  details: Array<{
    log: AquacultureLog;
    affectedResults: ErosionCalculationResult[];
    impactDescription: string;
  }>;
} {
  const delayedLogs = logs.filter(l => l.isDelayed);
  const allAffectedResults = new Set<string>();
  const details: Array<{
    log: AquacultureLog;
    affectedResults: ErosionCalculationResult[];
    impactDescription: string;
  }> = [];

  delayedLogs.forEach(log => {
    const affected = findAffectedResults(log, results);
    affected.forEach(r => allAffectedResults.add(r.profileId));
    
    let impactDescription = '';
    if (affected.length > 0) {
      const sections = affected.map(a => a.sectionName).join('、');
      impactDescription = `该日志延迟影响了${sections}等${affected.length}个断面的沉积物来源分析`;
    } else {
      impactDescription = '该日志延迟对当前计算结果无直接影响';
    }
    
    details.push({ log, affectedResults: affected, impactDescription });
  });

  const conclusions: string[] = [];
  if (delayedLogs.length > 0) {
    conclusions.push(`共${delayedLogs.length}份养殖日志延迟上报`);
    conclusions.push(`影响${allAffectedResults.size}个断面的侵蚀计算结果可信度`);
    conclusions.push('沉积物输送速率计算值可能存在偏差，建议日志补录后重新计算');
  }

  return {
    totalDelayed: delayedLogs.length,
    affectedResultCount: allAffectedResults.size,
    affectedResultIds: Array.from(allAffectedResults),
    conclusions,
    details,
  };
}

export function mergeWithPreservingOld(
  oldResults: ErosionCalculationResult[],
  newResults: ErosionCalculationResult[],
  delayedLogs: AquacultureLog[]
): {
  merged: ErosionCalculationResult[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const merged: ErosionCalculationResult[] = [];

  newResults.forEach(newResult => {
    const oldResult = oldResults.find(o => o.sectionName === newResult.sectionName);
    
    const isAffectedByDelay = delayedLogs.some(log =>
      newResult.dataSources.some(source =>
        source.includes(log.farmName)
      )
    );

    if (isAffectedByDelay && oldResult) {
      warnings.push(
        `${newResult.sectionName}：因养殖日志延迟，保留旧计算结果，新结果标记为待复核`
      );
      
      merged.push({
        ...oldResult,
        warnings: [
          ...oldResult.warnings,
          `存在延迟日志数据，当前显示为旧计算结果`,
        ],
        affectedByDelayedLogs: true,
        delayedLogCount: delayedLogs.length,
        delayedLogIds: delayedLogs.map(l => l.id),
      });
    } else {
      merged.push(newResult);
    }
  });

  return { merged, warnings };
}

export function generateDelayedLogNotification(log: AquacultureLog): {
  title: string;
  description: string;
  severity: 'warning' | 'error';
  suggestions: string[];
} {
  const delay = calculateDelay(log);
  const suggestions: string[] = [];

  if (delay.severity === 'critical') {
    suggestions.push('立即联系养殖场核实情况');
    suggestions.push('标记相关计算结果为待确认');
    suggestions.push('评估是否需要补充现场监测');
  } else {
    suggestions.push('关注补录进度');
    suggestions.push('收到补录后更新复核备注');
  }

  suggestions.push('补录完成后重新计算相关断面');

  return {
    title: `${log.farmName} 养殖日志延迟`,
    description: `应于${log.expectedSubmitTime}上报，实际${log.submitTime}上报，延迟${delay.delayHours.toFixed(1)}小时`,
    severity: delay.severity === 'critical' ? 'error' : 'warning',
    suggestions,
  };
}
