import { BatchReport, BatchStatus, RetestSuggestion, ReportStats } from '../types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function computeBlockerReasons(batch: BatchReport): string[] {
  const reasons: string[] = [];
  if (!batch.hasBlankControl) {
    reasons.push('空白对照缺失，无法判断选择性真实性');
  }
  const diff = batch.selectivityThreshold - batch.selectivity;
  if (diff > 5) {
    reasons.push(`选择性 ${batch.selectivity}% 显著低于阈值 ${batch.selectivityThreshold}%，差值达 ${diff.toFixed(1)}%`);
  }
  if (batch.manualNote && /污染|异常|报警|飘/.test(batch.manualNote)) {
    reasons.push('备注中提及疑似样品污染或设备运行异常');
  }
  return reasons;
}

export function computeStatus(batch: BatchReport): BatchStatus {
  if (!batch.hasBlankControl) return 'failed';
  if (batch.selectivity < batch.selectivityThreshold - 5) return 'failed';
  if (batch.selectivity < batch.selectivityThreshold) return 'pending';
  return 'success';
}

const SUPPLEMENT_LABELS: Record<string, string> = {
  temperature: '反应温度',
  pressure: '反应压力',
  catalystType: '催化剂类型',
  catalystLoading: '催化剂装载量',
  solvent: '溶剂',
  reactionTime: '反应时间',
  catalystBatchNo: '催化剂批号',
  repeatExperimentResult: '重复实验结果',
  hasBlankControl: '空白对照数据',
  selectivity: '选择性检测结果',
};

export function getSupplementLabel(key: string): string {
  return SUPPLEMENT_LABELS[key] || key;
}

export function generateRetestSuggestion(batch: BatchReport): RetestSuggestion {
  const now = new Date().toISOString();
  const blockers = computeBlockerReasons(batch);
  const status = computeStatus(batch);
  const supplementRequired: string[] = [];

  if (!batch.hasBlankControl) supplementRequired.push('hasBlankControl', 'selectivity');
  if (!batch.conditions.catalystBatchNo) supplementRequired.push('catalystBatchNo');
  if (status === 'pending' && !batch.conditions.repeatExperimentResult) {
    supplementRequired.push('repeatExperimentResult');
  }

  if (status === 'success') {
    return {
      level: 'release',
      reason: blockers.length > 0
        ? `校验通过，但建议关注：${blockers.join('；')}`
        : `空白对照完整，选择性 ${batch.selectivity}% 高于阈值 ${batch.selectivityThreshold}%，反应条件稳定`,
      supplementRequired: [],
      generatedAt: now,
    };
  }

  if (status === 'pending') {
    const reasonParts = [
      `选择性 ${batch.selectivity}% 略低于阈值 ${batch.selectivityThreshold}%`,
    ];
    if (!batch.conditions.catalystBatchNo) {
      reasonParts.push('催化剂批号未记录，需确认批间差影响');
    }
    return {
      level: 'retest',
      reason: reasonParts.join('，'),
      supplementRequired,
      suggestedConditions: {
        temperature: 60,
        catalystLoading: 1.0,
      },
      generatedAt: now,
    };
  }

  return {
    level: 'discard',
    reason: blockers.length > 0
      ? blockers.join('；') + '，数据可信度不足'
      : `选择性 ${batch.selectivity}% 显著低于阈值 ${batch.selectivityThreshold}%`,
    supplementRequired,
    suggestedConditions: {
      temperature: 60,
      pressure: 1.5,
    },
    generatedAt: now,
  };
}

export function computeStats(batches: BatchReport[]): ReportStats {
  const total = batches.length;
  const successCount = batches.filter(b => b.status === 'success').length;
  const pendingCount = batches.filter(b => b.status === 'pending').length;
  const failedCount = batches.filter(b => b.status === 'failed').length;
  const passRate = total === 0 ? 0 : Math.round((successCount / total) * 1000) / 10;
  const avgSelectivity = total === 0
    ? 0
    : Math.round((batches.reduce((s, b) => s + b.selectivity, 0) / total) * 10) / 10;
  return { total, successCount, pendingCount, failedCount, passRate, avgSelectivity };
}

export function getStatusText(status: BatchStatus): string {
  return { success: '放行', pending: '待确认', failed: '异常' }[status];
}

export function getSuggestionText(level: string): string {
  return { release: '建议放行', retest: '建议复测', discard: '建议废弃' }[level] || level;
}
