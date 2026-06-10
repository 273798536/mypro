import type { BatchStatus, ResultGrade, ReviewItemStatus } from '@/types';

export interface SummaryData {
  batchStatus: BatchStatus;
  overallGrade: ResultGrade | '未计算';
  passCount: number;
  retestCount: number;
  reviewCount: number;
  pendingReviewCount: number;
  finalConclusion: string;
}

export interface ConsistencyIssue {
  field: string;
  uiValue: string;
  exportValue: string;
  severity: 'warning' | 'error';
  description: string;
}

export function buildSummary(
  reviewItems: Array<{ status: ReviewItemStatus }>,
  calcResults: Array<{ grade: ResultGrade }>
): SummaryData {
  const passCount = reviewItems.filter((r) => r.status === '已通过').length +
    calcResults.filter((r) => r.grade === '通过').length;
  const retestCount = reviewItems.filter((r) => r.status === '需复测').length +
    calcResults.filter((r) => r.grade === '建议复测').length;
  const reviewCount = calcResults.filter((r) => r.grade === '必须复核').length;
  const pendingReviewCount = reviewItems.filter((r) => r.status === '待复核').length;

  let overallGrade: SummaryData['overallGrade'] = '未计算';
  let batchStatus: BatchStatus = '录入中';
  let finalConclusion = '数据录入中';

  if (calcResults.length > 0) {
    if (calcResults.some((r) => r.grade === '必须复核')) {
      overallGrade = '必须复核';
      batchStatus = '待复核';
      finalConclusion = '存在必须由药化研究员复核的问题，请不要直接使用结果';
    } else if (calcResults.some((r) => r.grade === '建议复测')) {
      overallGrade = '建议复测';
      batchStatus = '待复核';
      finalConclusion = '存在建议复测的项目，请检查原始数据或安排重新实验';
    } else {
      overallGrade = '通过';
      finalConclusion = '所有检查项通过，计算结果可直接使用';
    }

    if (pendingReviewCount > 0) {
      batchStatus = '待复核';
      finalConclusion += `（还有${pendingReviewCount}项待复核）`;
    } else if (overallGrade === '通过') {
      batchStatus = '已完成';
    }
  }

  return {
    batchStatus,
    overallGrade,
    passCount,
    retestCount,
    reviewCount,
    pendingReviewCount,
    finalConclusion,
  };
}

export function checkConsistency(
  uiSummary: SummaryData,
  exportSummary: SummaryData
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  if (uiSummary.finalConclusion !== exportSummary.finalConclusion) {
    issues.push({
      field: '最终结论',
      uiValue: uiSummary.finalConclusion,
      exportValue: exportSummary.finalConclusion,
      severity: 'error',
      description: '界面显示结论与待导出结论不一致，请确认最新状态后再导出',
    });
  }

  if (uiSummary.overallGrade !== exportSummary.overallGrade) {
    issues.push({
      field: '结果分级',
      uiValue: uiSummary.overallGrade,
      exportValue: exportSummary.overallGrade,
      severity: 'error',
      description: '分级状态存在差异，请重新计算以保持一致',
    });
  }

  if (uiSummary.pendingReviewCount !== exportSummary.pendingReviewCount) {
    issues.push({
      field: '待复核数量',
      uiValue: String(uiSummary.pendingReviewCount),
      exportValue: String(exportSummary.pendingReviewCount),
      severity: 'warning',
      description: '复核进度有更新，建议刷新导出内容',
    });
  }

  return issues;
}
