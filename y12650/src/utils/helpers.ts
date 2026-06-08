import type { CoordinateSystem, Vector3, PipelineRecord, PipelineSegment, SourceRef } from '../types';

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function convertToWorld(v: Vector3, system: CoordinateSystem): Vector3 {
  switch (system) {
    case 'world':
      return { ...v };
    case 'local':
      return { x: v.x + 0, y: v.y + 0, z: v.z + 0 };
    case 'geographic':
      return { x: v.x * 1000, y: v.y, z: v.z * 1000 };
    default:
      return { ...v };
  }
}

export function formatCoordinateSystem(sys: CoordinateSystem): string {
  switch (sys) {
    case 'world': return '世界坐标系';
    case 'local': return '局部坐标系';
    case 'geographic': return '地理坐标系';
  }
}

export function pipeApproximatelyEqual(a: PipelineSegment, b: PipelineSegment, eps = 0.5): boolean {
  function posClose(p1: Vector3, p2: Vector3) {
    return (
      Math.abs(p1.x - p2.x) < eps &&
      Math.abs(p1.y - p2.y) < eps &&
      Math.abs(p1.z - p2.z) < eps
    );
  }
  const aStart = convertToWorld(a.start.position, a.start.coordinateSystem);
  const aEnd = convertToWorld(a.end.position, a.end.coordinateSystem);
  const bStart = convertToWorld(b.start.position, b.start.coordinateSystem);
  const bEnd = convertToWorld(b.end.position, b.end.coordinateSystem);

  const forward = posClose(aStart, bStart) && posClose(aEnd, bEnd);
  const reverse = posClose(aStart, bEnd) && posClose(aEnd, bStart);
  return (forward || reverse) && Math.abs(a.diameter - b.diameter) < 0.05;
}

export function isDuplicateRecord(
  candidate: PipelineRecord,
  existing: PipelineRecord[],
): PipelineRecord | null {
  for (const rec of existing) {
    if (rec.id === candidate.id) continue;
    if (pipeApproximatelyEqual(candidate.pipeline, rec.pipeline)) {
      return rec;
    }
    if (
      candidate.source.fileName === rec.source.fileName &&
      candidate.source.rowNumber === rec.source.rowNumber
    ) {
      return rec;
    }
  }
  return null;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function sourceLabel(source: SourceRef): string {
  let s = `${source.fileName} · 行 ${source.rowNumber}`;
  if (source.remark) s += ` | ${source.remark}`;
  return s;
}

export function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  });
}

export function downloadDataURL(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
