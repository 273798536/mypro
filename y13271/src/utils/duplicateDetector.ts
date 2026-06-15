import type { ResidentFeedback } from '@/types';
import { levenshtein } from './dataUtils';

/** 重复投诉检测配置 */
interface DuplicateConfig {
  prefixLength: number;
  similarityThreshold: number;
  timeWindowDays: number;
}

/** 重复检测结果 */
interface DuplicateResult {
  isDuplicate: boolean;
  duplicateOfId?: string;
  duplicateOrder?: number;
}

/** 默认检测配置 */
const DEFAULT_CONFIG: DuplicateConfig = {
  prefixLength: 10,
  similarityThreshold: 0.85,
  timeWindowDays: 7
};

/** 生成重复投诉分组键：bayId + 反馈内容前N字 + 手机号 */
function generateGroupKey(fb: ResidentFeedback, cfg: DuplicateConfig): string {
  return `${fb.bayId ?? 'unknown_bay'}|${(fb.content ?? '').slice(0, cfg.prefixLength)}|${fb.phone ?? 'unknown_phone'}`;
}

/** 计算两个日期之间的天数差 */
function daysBetween(d1: string, d2: string): number {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  if (isNaN(t1) || isNaN(t2)) return Infinity;
  return Math.abs((t2 - t1) / 86400000);
}

/** 判断两条反馈是否匹配（同站点+手机号+时间窗口+内容相似度） */
function isDuplicatePair(
  earlier: ResidentFeedback,
  later: ResidentFeedback,
  cfg: DuplicateConfig
): boolean {
  if (earlier.bayId && later.bayId && earlier.bayId !== later.bayId) return false;
  if (!earlier.bayId !== !later.bayId) return false;
  const p1 = (earlier.phone ?? '').trim().replace(/[\s-]/g, '');
  const p2 = (later.phone ?? '').trim().replace(/[\s-]/g, '');
  if (p1 && p2 && p1 !== p2) return false;
  if (daysBetween(earlier.reportedAt, later.reportedAt) > cfg.timeWindowDays) return false;
  const c1 = earlier.content ?? '';
  const c2 = later.content ?? '';
  if (!c1 || !c2) return false;
  return levenshtein(c1, c2) >= cfg.similarityThreshold;
}

/** 单一分组内标记重复 */
function markGroupDuplicates(
  group: ResidentFeedback[],
  cfg: DuplicateConfig
): Map<string, DuplicateResult> {
  const resultMap = new Map<string, DuplicateResult>();
  if (group.length <= 1) {
    group.forEach(f => resultMap.set(f.id, { isDuplicate: false }));
    return resultMap;
  }
  const firstId = group[0].id;
  resultMap.set(firstId, { isDuplicate: false });
  for (let i = 1; i < group.length; i++) {
    const current = group[i];
    if (isDuplicatePair(group[0], current, cfg)) {
      resultMap.set(current.id, {
        isDuplicate: true,
        duplicateOfId: firstId,
        duplicateOrder: i + 1
      });
    } else {
      resultMap.set(current.id, { isDuplicate: false });
    }
  }
  return resultMap;
}

/** 跨分组相似度补充检测 */
function crossGroupSupplementCheck(
  sorted: ResidentFeedback[],
  resultMap: Map<string, DuplicateResult>,
  cfg: DuplicateConfig
): void {
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (resultMap.get(current.id)?.isDuplicate) continue;
    for (let j = i - 1; j >= 0; j--) {
      const earlier = sorted[j];
      if (daysBetween(earlier.reportedAt, current.reportedAt) > cfg.timeWindowDays) break;
      if (isDuplicatePair(earlier, current, cfg)) {
        const earlierRes = resultMap.get(earlier.id);
        const firstFb = earlierRes?.duplicateOfId
          ? sorted.find(f => f.id === earlierRes.duplicateOfId) ?? earlier
          : earlier;
        const order = sorted.filter(
          f => f.id === firstFb.id || resultMap.get(f.id)?.duplicateOfId === firstFb.id
        ).length + 1;
        resultMap.set(current.id, {
          isDuplicate: true,
          duplicateOfId: firstFb.id,
          duplicateOrder: order
        });
        break;
      }
    }
  }
}

/**
 * 重复投诉识别算法
 * 1. 按 bayId + 内容前N字 + 手机号 分组
 * 2. 同组内按时间升序，首条标记为源，后续检查是否重复
 * 3. 跨分组相似度补充检测
 * @param feedbacks 反馈记录数组
 * @param customConfig 自定义检测配置
 * @returns 带重复标记的反馈数组
 */
export function detectDuplicates(
  feedbacks: ResidentFeedback[],
  customConfig?: Partial<DuplicateConfig>
): ResidentFeedback[] {
  const cfg: DuplicateConfig = { ...DEFAULT_CONFIG, ...customConfig };
  if (feedbacks.length <= 1) {
    return feedbacks.map(f => ({
      ...f,
      isDuplicate: f.isDuplicate ?? false,
      duplicateOfId: f.duplicateOfId,
      duplicateOrder: f.duplicateOrder
    }));
  }
  const sorted = [...feedbacks].sort(
    (a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime()
  );
  const groups = new Map<string, ResidentFeedback[]>();
  for (const fb of sorted) {
    const key = generateGroupKey(fb, cfg);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(fb);
  }
  const resultMap = new Map<string, DuplicateResult>();
  for (const group of groups.values()) {
    const groupResults = markGroupDuplicates(group, cfg);
    for (const [id, res] of groupResults) resultMap.set(id, res);
  }
  crossGroupSupplementCheck(sorted, resultMap, cfg);
  return sorted.map(fb => {
    const res = resultMap.get(fb.id);
    return {
      ...fb,
      isDuplicate: res?.isDuplicate ?? false,
      duplicateOfId: res?.duplicateOfId,
      duplicateOrder: res?.duplicateOrder
    };
  });
}

/** 按 bayId 分组后批量检测重复投诉 */
export function detectDuplicatesByBay(
  feedbacks: ResidentFeedback[],
  customConfig?: Partial<DuplicateConfig>
): ResidentFeedback[] {
  const bayGroups = new Map<string, ResidentFeedback[]>();
  for (const fb of feedbacks) {
    const key = fb.bayId ?? '__no_bay__';
    if (!bayGroups.has(key)) bayGroups.set(key, []);
    bayGroups.get(key)!.push(fb);
  }
  const results: ResidentFeedback[] = [];
  for (const bayFbs of bayGroups.values()) {
    results.push(...detectDuplicates(bayFbs, customConfig));
  }
  return results;
}

/** 获取重复投诉的描述文本 */
export function getDuplicateOrderLabel(order?: number): string {
  if (!order || order <= 1) return '首条投诉';
  const suffixMap: Record<number, string> = { 2: '二', 3: '三', 4: '四', 5: '五' };
  const suffix = suffixMap[order] ?? order.toString();
  return `第${suffix}次重复`;
}
