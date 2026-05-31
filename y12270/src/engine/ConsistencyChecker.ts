import type { AnalysisResult, ExportRecord, TerminalLogEntry, BondHolding, AnalysisParams, ExportCorrespondence } from '../types';

export interface ConsistencyCheckResult {
  passed: boolean;
  pageMatches: boolean;
  terminalMatches: boolean;
  fileMatches: boolean;
  discrepancies: string[];
  pageValue: string;
  terminalValue: string;
  fileValue: string;
}

export function checkConsistency(
  pageConclusion: string,
  terminalLog: TerminalLogEntry[],
  fileContent: string,
  analysisResult: AnalysisResult
): ConsistencyCheckResult {
  const terminalConclusion = extractConclusionFromLog(terminalLog);
  const fileConclusion = extractConclusionFromFile(fileContent);

  const pageMatches = normalizeConclusion(pageConclusion) === normalizeConclusion(analysisResult.durationConclusion);
  const terminalMatches = terminalConclusion !== null && 
    normalizeConclusion(terminalConclusion) === normalizeConclusion(analysisResult.durationConclusion);
  const fileMatches = fileConclusion !== null && 
    normalizeConclusion(fileConclusion) === normalizeConclusion(analysisResult.durationConclusion);

  const discrepancies: string[] = [];

  if (!pageMatches) {
    discrepancies.push('页面显示的久期结论与分析结果不一致');
  }
  if (!terminalMatches) {
    discrepancies.push('终端日志中的久期结论与分析结果不一致');
  }
  if (!fileMatches) {
    discrepancies.push('导出文件中的久期结论与分析结果不一致');
  }

  return {
    passed: pageMatches && terminalMatches && fileMatches,
    pageMatches,
    terminalMatches,
    fileMatches,
    discrepancies,
    pageValue: pageConclusion,
    terminalValue: terminalConclusion || '未找到',
    fileValue: fileConclusion || '未找到'
  };
}

function extractConclusionFromLog(log: TerminalLogEntry[]): string | null {
  const conclusionEntry = log.find(entry => 
    entry.level === 'success' && 
    entry.message.includes('久期结论')
  );
  
  if (conclusionEntry?.data && typeof conclusionEntry.data === 'object') {
    const data = conclusionEntry.data as { conclusion?: string };
    return data.conclusion || null;
  }
  
  const conclusionLines = log
    .filter(e => e.message.includes('久期结论') || e.message.includes('加权久期'))
    .map(e => e.message);
  
  if (conclusionLines.length > 0) {
    return conclusionLines[conclusionLines.length - 1];
  }
  
  return null;
}

function extractConclusionFromFile(content: string): string | null {
  const patterns = [
    /久期结论[：:]\s*(.+?)(?:\n|$)/i,
    /加权久期[：:]\s*([\d.]+)\s*年/i,
    /组合久期[：:]\s*(.+?)(?:\n|$)/i
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function normalizeConclusion(conclusion: string): string {
  return conclusion
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。；,.;]/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '');
}

export function generateTerminalLog(
  holdings: BondHolding[],
  params: AnalysisParams,
  analysisResult: AnalysisResult,
  qualityIssues: { total: number; bySeverity: Record<string, number> }
): TerminalLogEntry[] {
  const log: TerminalLogEntry[] = [];
  const now = new Date();

  log.push({
    timestamp: now,
    level: 'info',
    message: '=== 债券组合风险曲面分析开始 ==='
  });

  log.push({
    timestamp: now,
    level: 'info',
    message: `输入债券数量: ${holdings.length}只`,
    data: { count: holdings.length }
  });

  log.push({
    timestamp: now,
    level: 'info',
    message: '分析参数快照',
    data: params
  });

  const filteredCount = holdings.filter(h => {
    if (h.duration < params.durationRange[0] || h.duration > params.durationRange[1]) return false;
    if (h.yield < params.yieldRange[0] || h.yield > params.yieldRange[1]) return false;
    if (params.industries.length > 0 && !params.industries.includes(h.industry)) return false;
    if (h.weight !== null && h.weight < params.weightThreshold) return false;
    return true;
  }).length;

  log.push({
    timestamp: now,
    level: 'info',
    message: `筛选后有效债券数量: ${filteredCount}只`
  });

  log.push({
    timestamp: now,
    level: 'info',
    message: `数据质量检查: 共${qualityIssues.total}个问题 (高:${qualityIssues.bySeverity.high}, 中:${qualityIssues.bySeverity.medium}, 低:${qualityIssues.bySeverity.low})`
  });

  log.push({
    timestamp: now,
    level: 'info',
    message: `计算中间结果 - 平均久期: ${analysisResult.avgDuration.toFixed(2)}年`
  });

  log.push({
    timestamp: now,
    level: 'info',
    message: `计算中间结果 - 平均收益率: ${analysisResult.avgYield.toFixed(2)}%`
  });

  log.push({
    timestamp: now,
    level: 'success',
    message: `久期结论: ${analysisResult.durationConclusion}`,
    data: { 
      conclusion: analysisResult.durationConclusion,
      weightedDuration: analysisResult.weightedDuration,
      avgDuration: analysisResult.avgDuration
    }
  });

  log.push({
    timestamp: now,
    level: 'info',
    message: '=== 分析完成 ==='
  });

  return log;
}

export function createExportCorrespondence(
  exportId: string,
  holdings: BondHolding[],
  analysisResult: AnalysisResult,
  params: AnalysisParams,
  terminalLog: TerminalLogEntry[]
): ExportCorrespondence {
  return {
    exportId,
    holdingSnapshot: JSON.parse(JSON.stringify(holdings)),
    analysisSnapshot: JSON.parse(JSON.stringify(analysisResult)),
    parametersSnapshot: JSON.parse(JSON.stringify(params)),
    terminalLog: JSON.stringify(terminalLog, null, 2)
  };
}

export function calculateFileHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function verifyExportCorrespondence(
  correspondence: ExportCorrespondence,
  currentAnalysis: AnalysisResult
): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (correspondence.analysisSnapshot.analysisId !== currentAnalysis.analysisId) {
    issues.push('分析ID不匹配');
  }

  if (correspondence.analysisSnapshot.durationConclusion !== currentAnalysis.durationConclusion) {
    issues.push('久期结论不匹配');
  }

  const paramsMatch = JSON.stringify(correspondence.parametersSnapshot) === JSON.stringify(currentAnalysis.parameters);
  if (!paramsMatch) {
    issues.push('分析参数不匹配');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
