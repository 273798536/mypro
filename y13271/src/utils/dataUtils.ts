import type { BusBay, FilterCriteria, BayStatus, StatusBadgeConfig } from '@/types';

/**
 * 计算简单字符串哈希值（DJB2算法）
 * @param str 输入字符串
 * @returns 哈希值字符串
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * 计算数据快照哈希值，用于同源校验
 * @param bays 公交港湾站点列表
 * @param filters 筛选条件
 * @returns 快照哈希字符串
 */
export function calculateSnapshotHash(bays: BusBay[], filters: FilterCriteria): string {
  const bayIds = bays.map(b => b.id).sort();
  const payload = JSON.stringify({ filters, bayIds });
  return simpleHash(payload);
}

/**
 * 状态标签映射
 */
export const STATUS_LABELS: Record<BayStatus, string> = {
  normal: '正常',
  abnormal: '异常',
  pending: '待复核'
};

/**
 * 状态颜色映射（Tailwind CSS 文本色）
 */
export const STATUS_COLORS: Record<BayStatus, string> = {
  normal: 'text-green-600',
  abnormal: 'text-red-600',
  pending: 'text-amber-600'
};

/**
 * 状态背景色映射（Tailwind CSS 背景色）
 */
export const STATUS_BG_COLORS: Record<BayStatus, string> = {
  normal: 'bg-green-100',
  abnormal: 'bg-red-100',
  pending: 'bg-amber-100'
};

/**
 * 字段标签映射（用于变更摘要）
 */
export const FIELD_LABELS: Record<string, string> = {
  currentCapacity: '当前容量',
  designCapacity: '设计容量',
  status: '站点状态',
  lngLat: '坐标位置',
  name: '站点名称',
  road: '所属道路',
  district: '所属行政区'
};

/**
 * 获取状态标签文本
 * @param status 站点状态
 * @returns 中文标签
 */
export function statusLabel(status: BayStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * 获取状态文本颜色类名
 * @param status 站点状态
 * @returns Tailwind CSS 颜色类名
 */
export function statusColor(status: BayStatus): string {
  return STATUS_COLORS[status] ?? 'text-gray-600';
}

/**
 * 获取站点状态徽章完整配置
 * @param status 站点状态
 * @returns 徽章配置对象（标签、文字色、背景色）
 */
export function bayStatusBadge(status: BayStatus): StatusBadgeConfig {
  return {
    label: statusLabel(status),
    color: statusColor(status),
    bgColor: STATUS_BG_COLORS[status] ?? 'bg-gray-100'
  };
}

/**
 * 计算 Levenshtein 编辑距离相似度
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 相似度值（0-1，1为完全相同）
 */
export function levenshtein(str1: string, str2: string): number {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;

  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1;
  return 1 - matrix[len1][len2] / maxLen;
}

/**
 * 变更值类型
 */
type ChangeValue = string | number | boolean | null | undefined | [number, number];

/**
 * 生成变更摘要文本
 * @param fieldName 变更字段名
 * @param oldValue 旧值
 * @param newValue 新值
 * @returns 中文变更摘要描述
 */
export function generateChangeSummary(
  fieldName: string,
  oldValue: ChangeValue,
  newValue: ChangeValue
): string {
  const fieldLabel = FIELD_LABELS[fieldName] ?? fieldName;

  const templates: Record<string, (o: ChangeValue, n: ChangeValue) => string> = {
    currentCapacity: (o, n) => {
      const oNum = Number(o) || 0;
      const nNum = Number(n) || 0;
      const diff = nNum - oNum;
      const direction = diff > 0 ? '增加' : '减少';
      return `容量从 ${o} 辆调整为 ${n} 辆（${direction} ${Math.abs(diff)} 辆）`;
    },
    designCapacity: (o, n) => `设计容量从 ${o} 辆调整为 ${n} 辆`,
    status: (o, n) => {
      const oStatus = o as import('@/types').BayStatus;
      const nStatus = n as import('@/types').BayStatus;
      return `状态从「${statusLabel(oStatus)}」变更为「${statusLabel(nStatus)}」`;
    },
    lngLat: (o, n) => {
      const oArr = o as [number, number] | { lng: number; lat: number } | null | undefined;
      const nArr = n as [number, number] | { lng: number; lat: number } | null | undefined;
      const getLng = (v: typeof oArr): number | string => {
        if (Array.isArray(v)) return v[0]?.toFixed?.(5) ?? String(v[0]);
        if (v && typeof v === 'object' && 'lng' in v) return (v as { lng: number }).lng?.toFixed?.(5) ?? String((v as { lng: number }).lng);
        return String(v ?? '');
      };
      const getLat = (v: typeof oArr): number | string => {
        if (Array.isArray(v)) return v[1]?.toFixed?.(5) ?? String(v[1]);
        if (v && typeof v === 'object' && 'lat' in v) return (v as { lat: number }).lat?.toFixed?.(5) ?? String((v as { lat: number }).lat);
        return String(v ?? '');
      };
      const oldLng = getLng(oArr);
      const oldLat = getLat(oArr);
      const newLng = getLng(nArr);
      const newLat = getLat(nArr);
      return `地图点位微调（经度 ${oldLng}→${newLng}，纬度 ${oldLat}→${newLat}）`;
    },
    name: (o, n) => `站点名称从「${o}」变更为「${n}」`,
    road: (o, n) => `所属道路从「${o}」变更为「${n}」`,
    district: (o, n) => `所属行政区从「${o}」变更为「${n}」`
  };

  if (templates[fieldName]) {
    return templates[fieldName](oldValue, newValue);
  }

  return `字段「${fieldLabel}」变更：${oldValue ?? '空'} → ${newValue ?? '空'}`;
}
