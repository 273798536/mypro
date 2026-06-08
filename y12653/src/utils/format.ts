import type { RiskLevel, PartStatus } from '../types';

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtRisk(level: RiskLevel): { label: string; cls: string } {
  switch (level) {
    case 'low':
      return { label: '低风险', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'medium':
      return { label: '中风险', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'high':
      return { label: '高风险', cls: 'bg-orange-100 text-orange-700 border-orange-200' };
    case 'critical':
      return { label: '危急', cls: 'bg-rose-100 text-rose-700 border-rose-200' };
  }
}

export function fmtStatus(s: PartStatus): { label: string; cls: string } {
  switch (s) {
    case 'normal':
      return { label: '正常', cls: 'bg-emerald-500 text-white' };
    case 'warning':
      return { label: '预警', cls: 'bg-amber-500 text-white' };
    case 'danger':
      return { label: '故障', cls: 'bg-rose-500 text-white' };
  }
}
