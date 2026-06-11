import type { MonitoringPoint, Note, FlagType } from '@/types';
import { FLAG_LABELS } from '@/types';

const BOM = '\uFEFF';

export function pointsToCsv(points: MonitoringPoint[], notes: Note[]): string {
  const headers = [
    '点位编号',
    'X坐标(m)',
    '深度(m)',
    '水位(m)',
    '坐标版本',
    '异常标记',
    '备注摘要',
  ];
  const rows = points.map((p) => {
    const flagStr =
      p.flags.length === 0 ? '正常' : p.flags.map((f: FlagType) => FLAG_LABELS[f].label).join('|');
    const pointNotes = notes.filter((n) => n.pointId === p.id);
    const noteStr = pointNotes.map((n) => `[${n.type}]${n.content}`).join('；');
    return [
      p.code,
      p.x.toFixed(2),
      p.depth.toFixed(2),
      p.waterLevel.toFixed(2),
      p.coordVersion === 'v1' ? 'v1旧版' : 'v2新版',
      flagStr,
      `"${noteStr.replace(/"/g, '""')}"`,
    ].join(',');
  });
  return BOM + [headers.join(','), ...rows].join('\n');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function encodeHash(obj: unknown): string {
  try {
    const str = JSON.stringify(obj);
    return btoa(encodeURIComponent(str));
  } catch {
    return '';
  }
}

export function decodeHash<T>(hash: string): T | null {
  try {
    const trimmed = hash.replace(/^#/, '');
    if (!trimmed) return null;
    const str = decodeURIComponent(atob(trimmed));
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}
