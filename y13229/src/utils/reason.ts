import { formatDate } from './storage';
import { SplitStatus, TrackVersion } from '@/types';

export interface HumanReasonContext {
  authExpiryDate?: string;
  isLatestVersion?: boolean;
  latestVersionTag?: string;
  currentVersionTag?: string;
  hasVerbalNotes?: boolean;
  missingConfirm?: boolean;
}

export function buildHumanReason(
  status: SplitStatus,
  ctx: HumanReasonContext
): string {
  switch (status) {
    case 'suspended':
      return `本曲目授权已于 ${formatDate(ctx.authExpiryDate)} 到期，已挂起待接手同事确认是否续约，暂不出具结论。`;
    case 'conflicted':
      return `当前引用的 ${ctx.currentVersionTag ?? '旧版'} 曲目表已非最新版，最新为 ${ctx.latestVersionTag ?? '未知'}，请核对版本差异并补录备注后再确认。`;
    case 'missing_note':
      return ctx.hasVerbalNotes
        ? '存在一条口头备注尚未转录成文字，请补录为「口头备注转录」后再进行交接。'
        : '当前记录缺少人工确认备注，补录后可提交对齐。';
    case 'pending':
      return '尚未完成人工确认，请核对分账比例与授权状态后提交。';
    case 'aligned':
      return '分账比例、曲目版本、授权状态均已核对，可直接交付演出与发行同事。';
    default:
      return '';
  }
}

export function humanReadableException(
  code: string,
  extra?: Record<string, unknown>
): string {
  const map: Record<string, string> = {
    auth_expired: `本曲目授权已于 ${formatDate(
      extra?.date as string
    )} 到期，已挂起待接手同事确认是否续约`,
    version_conflict: `当前引用的 ${extra?.current ?? '旧版'} 曲目表已非最新版，最新为 ${extra?.latest ?? '未知'}，请核对后补备注`,
    missing_verbal: '存在一条口头备注尚未转录成文字，请补录后再交接',
    ratio_mismatch: `分账比例合计为 ${extra?.total ?? 0}%，应为 100%，请确认是否有遗漏`,
    no_ratio: '艺人/剧场/发行三项比例均为空，请先填写分账比例',
  };
  return map[code] ?? code;
}

export function getLatestVersion(
  versions: TrackVersion[],
  trackName: string
): TrackVersion | undefined {
  return versions
    .filter((v) => v.trackName === trackName)
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))[0];
}
