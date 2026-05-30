import type { ParamState, ValidationResult, ValidationIssue } from '../../types/params';
import { REVIEWERS } from '../../types/params';

export function validateParameters(params: ParamState): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (params.intervalA > params.intervalB) {
    const reviewer = REVIEWERS.find(r => r.specialty === '区间反向核对');
    issues.push({
      type: 'interval_reversed',
      severity: 'warning',
      message: `区间端点顺序反向：a=${params.intervalA} > b=${params.intervalB}，需要审核确认`,
      nextAction: `请提交给${reviewer?.name || '教研组长'}核对区间定义`,
      autoReview: true,
      reviewer: reviewer?.id,
    });
  }

  const hasX = params.functionExpr.toLowerCase().includes('x');
  const hasY = params.functionExpr.toLowerCase().includes('y');
  if (hasX && hasY && params.rotationAxis === 'custom') {
    const reviewer = REVIEWERS.find(r => r.specialty === '轴线混淆确认');
    issues.push({
      type: 'axis_ambiguous',
      severity: 'error',
      message: '函数同时包含x和y变量，自定义旋转轴可能造成轴线混淆',
      nextAction: `请咨询${reviewer?.name || '数学系教授'}确认旋转轴定义`,
      autoReview: false,
      reviewer: reviewer?.id,
    });
  }

  if (params.sliceCount < 10) {
    const reviewer = REVIEWERS.find(r => r.specialty === '切片数量建议');
    issues.push({
      type: 'slice_insufficient',
      severity: 'warning',
      message: `切片数量过少（${params.sliceCount}片），计算精度和可视化效果可能不足`,
      nextAction: `建议增加到20片以上，或联系${reviewer?.name || '实验员'}确认`,
      autoReview: true,
      reviewer: reviewer?.id,
    });
  }

  return { issues, requiresReview: issues.length > 0 };
}

export function getReviewStatus(issues: ValidationIssue[]): 'pending' | 'approved' | 'needs_review' {
  if (issues.length === 0) return 'approved';

  const hasBlockingIssue = issues.some(i => i.severity === 'error' || !i.autoReview);
  if (hasBlockingIssue) return 'needs_review';

  return 'pending';
}

export function getFieldDisplayName(field: string): string {
  const displayNames: Record<string, string> = {
    functionExpr: '函数曲线',
    rotationAxis: '旋转轴',
    axisOffset: '轴偏移量',
    intervalA: '区间端点a',
    intervalB: '区间端点b',
    sliceCount: '切片数量',
    showSlices: '显示切片',
    method: '计算方法',
  };
  return displayNames[field] || field;
}

export function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '未设置';
  if (field === 'rotationAxis') {
    const labels: Record<string, string> = { x: 'X轴', y: 'Y轴', custom: '自定义轴' };
    return labels[String(value)] || String(value);
  }
  if (field === 'method') {
    return value === 'disk' ? '圆盘法' : '壳层法';
  }
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
}
