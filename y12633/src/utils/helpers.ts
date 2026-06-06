import type { PointStatus, DrainPoint, ExportReport, Inspection } from '../types';

export const statusLabel: Record<PointStatus, string> = {
  pending: '待巡检',
  inspected: '已通过',
  failed: '需整改',
};

export const statusChipClass: Record<PointStatus, string> = {
  pending: 'chip-pending',
  inspected: 'chip-inspected',
  failed: 'chip-failed',
};

export const hitDetectionLabel: Record<string, string> = {
  hit: '命中',
  miss: '未命中',
  pending: '待检测',
};

export const hitDetectionChipClass: Record<string, string> = {
  hit: 'bg-green-100 text-green-700',
  miss: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-600',
};

export const generateId = (): string => {
  return `dp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const buildExportReport = (inspection: Inspection): ExportReport => {
  const totalPoints = inspection.drainPoints.length;
  const inspectedCount = inspection.drainPoints.filter((p) => p.status === 'inspected').length;
  const pendingCount = inspection.drainPoints.filter((p) => p.status === 'pending').length;
  const failedCount = inspection.drainPoints.filter((p) => p.status === 'failed').length;
  const hitCount = inspection.drainPoints.filter((p) => p.hitDetection === 'hit').length;
  const missCount = inspection.drainPoints.filter((p) => p.hitDetection === 'miss').length;

  const statusText = inspection.status === 'completed' ? '已完成' : '进行中';

  return {
    title: inspection.title,
    exportedAt: new Date().toLocaleString('zh-CN'),
    inspectionStatus: statusText,
    totalPoints,
    inspectedCount,
    pendingCount,
    failedCount,
    hitCount,
    missCount,
    boundaryFailTriggered: inspection.boundaryFailTriggered,
    undoPerformed: inspection.undoPerformed,
    points: inspection.drainPoints.map((p) => ({
      id: p.id,
      address: p.address || `坐标(${p.x}, ${p.y})`,
      status: statusLabel[p.status],
      hitDetection: hitDetectionLabel[p.hitDetection || 'pending'],
      notes: p.notes || '—',
    })),
  };
};

export const calculateInspectionProgress = (points: DrainPoint[]): number => {
  if (points.length === 0) return 0;
  const done = points.filter((p) => p.status !== 'pending').length;
  return Math.round((done / points.length) * 100);
};

export const deduplicateById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const POINT_MERGE_DISTANCE = 2;

const isSamePoint = (a: DrainPoint, b: DrainPoint): boolean => {
  if (a.id === b.id) return true;
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx < POINT_MERGE_DISTANCE && dy < POINT_MERGE_DISTANCE;
};

const pickLatestPoint = (a: DrainPoint, b: DrainPoint): DrainPoint => {
  const aHasContent = a.status !== 'pending' || (a.notes && a.notes.length > 0);
  const bHasContent = b.status !== 'pending' || (b.notes && b.notes.length > 0);
  if (aHasContent && !bHasContent) return a;
  if (bHasContent && !aHasContent) return b;
  return a.createdAt >= b.createdAt ? a : b;
};

export const mergeInspectionData = (
  existing: DrainPoint[],
  incoming: DrainPoint[],
): DrainPoint[] => {
  const result: DrainPoint[] = existing.map((p) => ({ ...p }));
  const seen = new Set<string>(existing.map((p) => p.id));

  for (const point of incoming) {
    const duplicateIndex = result.findIndex((p) => isSamePoint(p, point));
    if (duplicateIndex >= 0) {
      const existingPoint = result[duplicateIndex];
      const latest = pickLatestPoint(existingPoint, point);
      result[duplicateIndex] = {
        ...latest,
        id: existingPoint.id,
        createdAt: existingPoint.createdAt,
      };
      seen.add(existingPoint.id);
    } else if (!seen.has(point.id)) {
      result.push({ ...point });
      seen.add(point.id);
    }
  }
  return deduplicateById(result);
};
