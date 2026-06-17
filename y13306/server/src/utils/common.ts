import { EvaluationStatus } from '@prisma/client';
import { STATUS_TEXT_MAP } from '../types';

export function getStatusText(status: EvaluationStatus): string {
  return STATUS_TEXT_MAP[status] || status;
}

export function generateBatchId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BATCH-${dateStr}-${random}`;
}

export function formatDate(date: Date | null | undefined): string | undefined {
  if (!date) return undefined;
  return date.toISOString();
}

export function generateDuplicateKey(medicalRecordId: string, questionId: string): string {
  return `${medicalRecordId}:${questionId}`;
}

export function generateRevisionExplanation(
  oldIsCorrect: boolean | undefined,
  newIsCorrect: boolean,
  oldReason: string | undefined,
  newReason: string | undefined
): string {
  const changedFrom = oldIsCorrect === undefined ? '未判定' : oldIsCorrect ? '正确' : '错误';
  const changedTo = newIsCorrect ? '正确' : '错误';

  const parts: string[] = [];
  parts.push(`判定结果从【${changedFrom}】改为【${changedTo}】`);

  if (oldReason && newReason && oldReason !== newReason) {
    parts.push(`判定理由从「${oldReason}」更新为「${newReason}」`);
  } else if (newReason && !oldReason) {
    parts.push(`新增判定理由：${newReason}`);
  }

  if (changedFrom === '错误' && changedTo === '正确') {
    parts.push('本次改判原因：新模型优化了病历理解能力，正确识别了关键医疗信息');
  } else if (changedFrom === '正确' && changedTo === '错误') {
    parts.push('本次改判原因：经人工复核，原模型输出存在医学事实偏差');
  }

  return parts.join('；');
}
