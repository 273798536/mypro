import type { PointCloudSlice, DuplicateCheckResult } from '@/types';

export function generateFingerprint(
  tankId: string,
  timestamp: string,
  pointCount: number,
  crossSectionChecksum?: string
): string {
  const data = `${tankId}_${timestamp}_${pointCount}_${crossSectionChecksum || 'default'}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `fp_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

export function checkDuplicate(
  newSlice: PointCloudSlice,
  existingSlices: PointCloudSlice[]
): DuplicateCheckResult {
  const duplicate = existingSlices.find(
    (d) => d.fingerprint === newSlice.fingerprint && d.importStatus !== 'merged'
  );

  if (duplicate) {
    return {
      isDuplicate: true,
      existingId: duplicate.id,
      existingSlice: duplicate,
      options: ['merge', 'replace', 'cancel'],
    };
  }

  return { isDuplicate: false, options: [] };
}

export function mergeSlices(
  existingSlice: PointCloudSlice,
  newSlice: PointCloudSlice
): PointCloudSlice {
  const existingPoints = existingSlice.crossSection.points;
  const newPoints = newSlice.crossSection.points;

  const pointMap = new Map<string, typeof existingPoints[0]>();
  existingPoints.forEach((p) => {
    const key = `${p.x.toFixed(4)}_${p.y.toFixed(4)}_${p.z.toFixed(4)}`;
    pointMap.set(key, p);
  });

  newPoints.forEach((p) => {
    const key = `${p.x.toFixed(4)}_${p.y.toFixed(4)}_${p.z.toFixed(4)}`;
    if (!pointMap.has(key)) {
      pointMap.set(key, p);
    }
  });

  const mergedPoints = Array.from(pointMap.values());
  const boundaries = calculateBoundaries(mergedPoints);

  return {
    ...existingSlice,
    pointCount: mergedPoints.length,
    timestamp: newSlice.timestamp,
    importStatus: 'merged',
    crossSection: {
      ...existingSlice.crossSection,
      points: mergedPoints,
      boundaries,
    },
    updatedAt: new Date().toISOString(),
  } as PointCloudSlice;
}

export function replaceSlice(
  existingSlice: PointCloudSlice,
  newSlice: PointCloudSlice
): PointCloudSlice {
  return {
    ...newSlice,
    id: existingSlice.id,
    importStatus: 'new',
  };
}

function calculateBoundaries(points: { x: number; y: number; z: number }[]) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  points.forEach((p) => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  });

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

export function generateSliceId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SLICE-${year}-${random}`;
}

export function generateMeasurementId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MR-${year}-${random}`;
}

export function generateConclusionId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CL-${year}-${random}`;
}

export function generateImportId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `IMP-${year}-${random}`;
}
