import type { Point, TimelineEvent } from '@/types';

export interface ExportData {
  exportedAt: string;
  point: Point;
  timeline: TimelineEvent[];
}

export function buildExportData(
  point: Point,
  events: TimelineEvent[]
): ExportData {
  return {
    exportedAt: new Date().toISOString(),
    point,
    timeline: events,
  };
}

export function downloadJSON(data: ExportData, filename: string): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportPoint(point: Point, events: TimelineEvent[]): void {
  const data = buildExportData(point, events);
  const filename = `点位异常记录_${point.id}_${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  downloadJSON(data, filename);
}
