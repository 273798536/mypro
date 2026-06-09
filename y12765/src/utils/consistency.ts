import type { AdditiveItem, VerificationStatus, VerificationRecord } from '@/types';

export interface ConsistencyResult {
  ok: boolean;
  mismatches: string[];
}

export function deriveStatusFromItems(items: AdditiveItem[]): VerificationStatus {
  if (items.length === 0) return 'pending';
  const anyFail = items.some((i) => !i.isPass);
  if (anyFail) return 'fail';
  const anyNear = items.some((i) => i.limitValue > 0 && i.convertedMgPerKg / i.limitValue >= 0.8);
  if (anyNear) return 'review';
  return 'pass';
}

export function computeSummary(items: AdditiveItem[]) {
  const passCount = items.filter((i) => i.isPass && i.limitValue > 0 && i.convertedMgPerKg / i.limitValue < 0.8).length;
  const failCount = items.filter((i) => !i.isPass).length;
  const reviewCount = items.length - passCount - failCount;
  return {
    total: items.length,
    passCount,
    reviewCount,
    failCount,
  };
}

export function validateExportConsistency(
  record: VerificationRecord | null,
  items: AdditiveItem[],
): ConsistencyResult {
  const mismatches: string[] = [];
  if (!record) {
    return { ok: false, mismatches: ['当前没有核验记录，无法导出'] };
  }

  const derivedStatus = deriveStatusFromItems(items);
  if (derivedStatus !== record.status) {
    mismatches.push(
      `界面摘要判定为【${statusLabel(record.status)}】，但按当前数据重算应为【${statusLabel(derivedStatus)}】`,
    );
  }

  const summary = computeSummary(items);
  if (summary.total !== record.summary.total) {
    mismatches.push(`添加剂条目数不一致：摘要 ${record.summary.total}，实际 ${summary.total}`);
  }
  if (summary.passCount !== record.summary.passCount) {
    mismatches.push(`通过条目数不一致：摘要 ${record.summary.passCount}，实际 ${summary.passCount}`);
  }
  if (summary.reviewCount !== record.summary.reviewCount) {
    mismatches.push(`待复核条目数不一致：摘要 ${record.summary.reviewCount}，实际 ${summary.reviewCount}`);
  }
  if (summary.failCount !== record.summary.failCount) {
    mismatches.push(`不合格条目数不一致：摘要 ${record.summary.failCount}，实际 ${summary.failCount}`);
  }

  items.forEach((it) => {
    if (!it.sourceRowNumber && it.sourceRowNumber !== 0) {
      mismatches.push(`「${it.name}」未关联原始行号，溯源链不完整`);
    }
  });

  return { ok: mismatches.length === 0, mismatches };
}

export function statusLabel(status: VerificationStatus): string {
  switch (status) {
    case 'pass': return '通过';
    case 'review': return '待工程师复核';
    case 'fail': return '不合格';
    default: return '待核验';
  }
}
