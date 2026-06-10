import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function generateId(prefix: string, withDate: boolean = false): string {
  if (withDate) {
    const now = new Date();
    const ymd =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 900 + 100);
    return `${prefix}-${ymd}-${rand}`;
  }
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `${prefix}-${rand}`;
}

export async function computeMD5(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export function computeSimpleMD5(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const base = Math.abs(hash).toString(16);
  return (base + input.length.toString(16) + '0000abcdef1234567890').slice(0, 32);
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  return dateStr.replace('T', ' ').slice(0, 19);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return dateStr.slice(0, 10);
}

export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    normal: 'bg-tundra-green/15 text-tundra-green-dark border border-tundra-green/30',
    warning: 'bg-amber-warning/15 text-amber-warning border border-amber-warning/30',
    alert: 'bg-red-500/15 text-red-600 border border-red-500/30',
    unknown: 'bg-slate-400/15 text-slate-600 border border-slate-400/30',
    sampled: 'bg-slate-100 text-slate-600 border border-slate-300',
    in_transit: 'bg-blue-500/15 text-blue-600 border border-blue-500/30',
    sequencing: 'bg-purple-500/15 text-purple-600 border border-purple-500/30',
    analyzing: 'bg-deep-ocean/15 text-deep-ocean border border-deep-ocean/30',
    completed: 'bg-tundra-green/15 text-tundra-green-dark border border-tundra-green/30',
    archived: 'bg-slate-400/15 text-slate-500 border border-slate-400/30',
  };
  return map[status] || map.unknown;
}

export function getStatusText(status: string): string {
  const map: Record<string, string> = {
    normal: '冷链正常',
    warning: '温控波动',
    alert: '冷链中断',
    unknown: '未知',
    sampled: '已采样',
    in_transit: '冷链转运中',
    sequencing: '测序中',
    analyzing: '分析中',
    completed: '已完成',
    archived: '已归档',
  };
  return map[status] || status;
}

export function getReviewStatusClass(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600 border border-slate-300',
    approved: 'bg-tundra-green/15 text-tundra-green-dark border border-tundra-green/30',
    rejected: 'bg-red-500/15 text-red-600 border border-red-500/30',
    needs_revision: 'bg-amber-warning/15 text-amber-warning border border-amber-warning/30',
  };
  return map[status] || map.pending;
}

export function getReviewStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待审核',
    approved: '通过',
    rejected: '驳回',
    needs_revision: '需修改',
  };
  return map[status] || status;
}

export function getStrategyText(s: string): string {
  return (
    {
      skip: '跳过：保留原数据',
      overwrite: '覆盖：新数据替换原数据',
      merge: '合并：差异字段追加备注',
      manual: '人工对比处理',
    } as Record<string, string>
  )[s] || s;
}

export function getMatchTypeText(t: string): string {
  return (
    {
      exact_md5: '完全相同(文件MD5一致)',
      same_sample_batch: '同一样本+同一测序批次',
      none: '无重复',
    } as Record<string, string>
  )[t] || t;
}

export function getSampleLabelColor(species: string): string {
  const map: Record<string, string> = {
    水稻: 'from-green-400 to-emerald-600',
    小麦: 'from-amber-400 to-orange-600',
    猪: 'from-pink-400 to-rose-600',
    鸡: 'from-yellow-400 to-amber-600',
  };
  return map[species] || 'from-slate-400 to-slate-600';
}

export function getSpeciesEmoji(species: string): string {
  return (
    {
      水稻: '🌾',
      小麦: '🌾',
      猪: '🐷',
      鸡: '🐔',
    } as Record<string, string>
  )[species] || '🧬';
}

export function scrollToElement(id: string): void {
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

export function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    geneLocus: '基因位点',
    sequencingDepth: '测序深度',
    qualityScore: '质量值(Q)',
    gcContent: 'GC含量(%)',
    matchedSpecies: '匹配物种',
    description: '分析说明',
    dataMd5: '数据MD5',
    content: '备注内容',
    judgment: '最终判定',
  };
  return map[field] || field;
}
