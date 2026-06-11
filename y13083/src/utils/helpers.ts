import type { HazardObject } from '@/types';

export const sourceLabels: Record<string, string> = {
  cad_old: 'CAD旧版',
  normal: '正常记录',
  verbal: '口头备注',
};

export const sourceColors: Record<string, string> = {
  cad_old: '#94a3b8',
  normal: '#10b981',
  verbal: '#fbbf24',
};

export const typeLabels: Record<string, string> = {
  tank: '储罐',
  pipe: '管线',
  valve: '阀门',
  storage: '仓储区',
};

export function checkOverlap(
  a: HazardObject,
  b: HazardObject,
  threshold = 0.5,
): boolean {
  if (a.id === b.id) return false;
  for (let i = 0; i < 3; i++) {
    const dist = Math.abs(a.position[i] - b.position[i]);
    const sumHalf = (a.size[i] + b.size[i]) / 2;
    if (dist > sumHalf + threshold) return false;
  }
  return true;
}

export function formatNow(): string {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}
