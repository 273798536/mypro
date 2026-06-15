import dayjs from 'dayjs';
import type { AuthInfo } from '../types';
import { authStore, festivalStore } from './storage';

export interface AuthCheckResult {
  isExpired: boolean;
  remainingDays: number;
  authorizedUntil: string;
  warningMessage?: string;
  blockedFeatures: string[];
}

export function checkAuthorization(festivalId: string): AuthCheckResult {
  const auth = authStore.get();
  const festival = festivalStore.get();
  const now = dayjs();
  const expiry = dayjs(auth.authorizedUntil);
  const remaining = expiry.diff(now, 'day');

  const isExpired = remaining <= 0;
  const blockedFeatures: string[] = [];

  let warningMessage: string | undefined;
  if (isExpired) {
    warningMessage = `⚠️ 该音乐节的分账对齐授权已于 ${auth.authorizedUntil} 到期。导出、分账重新计算等功能已被临时锁定，请联系管理员续费。`;
    blockedFeatures.push('excel_export', 'rerun_alignment', 'manual_confirm');
  } else if (remaining <= 7) {
    warningMessage = `🔔 温馨提示：授权还有 ${remaining} 天到期（${auth.authorizedUntil}）。请在到期前完成所有分账对齐和导出工作，以免影响与演出/发行同事的交接。`;
  } else if (remaining <= 14) {
    warningMessage = `📅 授权还有 ${remaining} 天到期。建议提前规划好排班同事的自查时间。`;
  }

  const updatedAuth: AuthInfo = {
    ...auth,
    remainingDays: Math.max(0, remaining),
    isExpired,
  };
  authStore.set(updatedAuth);

  return {
    isExpired,
    remainingDays: Math.max(0, remaining),
    authorizedUntil: auth.authorizedUntil,
    warningMessage,
    blockedFeatures,
  };
}

export function isFeatureBlocked(feature: string, blocked: string[]): boolean {
  return blocked.includes(feature);
}

export function forceExpireForDemo(): AuthCheckResult {
  const auth = authStore.get();
  const past = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  authStore.set({ ...auth, authorizedUntil: past, remainingDays: 0, isExpired: true });
  return checkAuthorization(auth.festivalId);
}

export function restoreAuthorizationForDemo(days: number = 14): AuthCheckResult {
  const auth = authStore.get();
  const future = dayjs().add(days, 'day').format('YYYY-MM-DD');
  authStore.set({ ...auth, authorizedUntil: future, remainingDays: days, isExpired: false });
  return checkAuthorization(auth.festivalId);
}
