import type { CreateGapData, GapReport } from '@/types';

export const generateFingerprint = (data: CreateGapData): string => {
  const key = `${data.gapType}:${data.tableName}:${data.businessLine}:${data.dataGapStart || ''}:${data.dataGapEnd || ''}`;
  return simpleHash(key);
};

const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

export const calculateSimilarity = (gap1: GapReport, gap2: GapReport): number => {
  let score = 0;
  let total = 0;

  total += 2;
  if (gap1.gapType === gap2.gapType) score += 2;

  total += 3;
  if (gap1.tableName === gap2.tableName) score += 3;

  total += 2;
  if (gap1.businessLine === gap2.businessLine) score += 2;

  total += 2;
  if (gap1.dataGapStart && gap2.dataGapStart && gap1.dataGapStart === gap2.dataGapStart) score += 2;

  total += 2;
  if (gap1.dataGapEnd && gap2.dataGapEnd && gap1.dataGapEnd === gap2.dataGapEnd) score += 2;

  total += 1;
  if (gap1.affectedRows && gap2.affectedRows &&
      Math.abs(gap1.affectedRows - gap2.affectedRows) / Math.max(gap1.affectedRows, gap2.affectedRows) < 0.1) {
    score += 1;
  }

  total += 3;
  const titleSim = stringSimilarity(gap1.title, gap2.title);
  score += titleSim * 3;

  return total > 0 ? score / total : 0;
};

const stringSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }

  return (longer.length - costs[longer.length]) / longer.length;
};

export const findDuplicateReason = (gap1: GapReport, gap2: GapReport): string => {
  const reasons: string[] = [];

  if (gap1.tableName === gap2.tableName) {
    reasons.push(`相同表名: ${gap1.tableName}`);
  }
  if (gap1.gapType === gap2.gapType) {
    reasons.push(`相同缺口类型: ${gapTypeLabel(gap1.gapType)}`);
  }
  if (gap1.businessLine === gap2.businessLine) {
    reasons.push(`相同业务线: ${gap1.businessLine}`);
  }
  if (gap1.dataGapStart && gap2.dataGapStart && gap1.dataGapStart === gap2.dataGapStart) {
    reasons.push('相同缺口起始时间');
  }

  return reasons.join('、') || '内容高度相似';
};

const gapTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    sampling: '采样缺口',
    migration: '迁移问题',
    other: '其他',
  };
  return map[type] || type;
};
