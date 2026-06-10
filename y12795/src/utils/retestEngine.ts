import type { ResultGrade } from '@/types';
import type { CheckResult } from './failureReasons';

export interface RetestSuggestion {
  grade: ResultGrade;
  primaryReason: string;
  suggestions: string[];
  actions: Array<{ label: string; priority: 'high' | 'medium' | 'low' }>;
}

export function generateRetestSuggestion(checks: CheckResult[]): RetestSuggestion {
  if (checks.length === 0) {
    return {
      grade: '通过',
      primaryReason: '所有质量检查项均通过',
      suggestions: [
        '燃烧热测定结果在理论值±5%范围内',
        '空白对照完整，温度校正可靠',
        '称量质量、反应时间等原始数据完整',
      ],
      actions: [
        { label: '直接使用计算结果', priority: 'high' },
        { label: '可导出批次报告归档', priority: 'medium' },
      ],
    };
  }

  const mustReview = checks.filter((c) => c.grade === '必须复核');
  const retest = checks.filter((c) => c.grade === '建议复测');

  let grade: ResultGrade = '建议复测';
  let primaryReason = '';
  const suggestions: string[] = [];
  const actions: Array<{ label: string; priority: 'high' | 'medium' | 'low' }> = [];

  if (mustReview.length > 0) {
    grade = '必须复核';
    primaryReason = `存在${mustReview.length}项必须由药化研究员复核的问题`;
    mustReview.forEach((c) => {
      suggestions.push(`【${c.code}】${c.sourceRef}`);
    });
    actions.push(
      { label: '立即联系药化研究员复核', priority: 'high' },
      { label: '准备好原始称量单和实验记录图片', priority: 'high' }
    );
  }

  if (retest.length > 0) {
    if (grade !== '必须复核') {
      primaryReason = `存在${retest.length}项建议复测的问题`;
    }
    retest.forEach((c) => {
      suggestions.push(`【${c.code}】${c.sourceRef}`);
    });
    actions.push(
      { label: '检查原始数据录入准确性', priority: 'medium' },
      { label: '如数据无误，建议安排复测实验', priority: 'medium' }
    );
  }

  if (retest.length === 0 && mustReview.length > 0) {
    suggestions.push('请不要直接使用该批次计算结果，等待复核结论');
  }

  return { grade, primaryReason, suggestions, actions };
}
