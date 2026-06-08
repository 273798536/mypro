import type { Point3D, SectionParams, SectionResult } from '@/types';

export function normalize(v: { x: number; y: number; z: number }) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function pointToPlaneDistance(
  p: Point3D,
  params: SectionParams
): number {
  const n = normalize({ x: params.normalX, y: params.normalY, z: params.normalZ });
  return (
    n.x * (p.x - params.positionX) +
    n.y * (p.y - params.positionY) +
    n.z * (p.z - params.positionZ)
  );
}

export function getPointsInSection(
  points: Point3D[],
  params: SectionParams
): Point3D[] {
  const halfThick = params.thickness / 2;
  return points.filter((p) => {
    const d = pointToPlaneDistance(p, params);
    return Math.abs(d) <= halfThick;
  });
}

export function computeSectionResult(
  points: Point3D[],
  params: SectionParams
): SectionResult {
  const inSection = getPointsInSection(points, params);
  const outliers = inSection.filter((p) => p.isOutlier);

  if (inSection.length === 0) {
    return {
      pointCount: 0,
      outlierCount: 0,
      crossSectionArea: 0,
      centroid: { x: 0, y: 0, z: 0 },
      boundingBox: {
        minX: 0, maxX: 0,
        minY: 0, maxY: 0,
        minZ: 0, maxZ: 0,
      },
    };
  }

  const xs = inSection.map((p) => p.x);
  const ys = inSection.map((p) => p.y);
  const zs = inSection.map((p) => p.z);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  const n = normalize({ x: params.normalX, y: params.normalY, z: params.normalZ });
  const up = { x: 0, y: 1, z: 0 };
  const tangent1 = normalize({
    x: n.y * up.z - n.z * up.y,
    y: n.z * up.x - n.x * up.z,
    z: n.x * up.y - n.y * up.x,
  });
  const tangent2 = normalize({
    x: n.y * tangent1.z - n.z * tangent1.y,
    y: n.z * tangent1.x - n.x * tangent1.z,
    z: n.x * tangent1.y - n.y * tangent1.x,
  });

  const projected = inSection.map((p) => ({
    u: (p.x - params.positionX) * tangent1.x + (p.y - params.positionY) * tangent1.y + (p.z - params.positionZ) * tangent1.z,
    v: (p.x - params.positionX) * tangent2.x + (p.y - params.positionY) * tangent2.y + (p.z - params.positionZ) * tangent2.z,
  }));

  const us = projected.map((p) => p.u);
  const vs = projected.map((p) => p.v);
  const uRange = Math.max(...us) - Math.min(...us);
  const vRange = Math.max(...vs) - Math.min(...vs);
  const area = uRange * vRange;

  return {
    pointCount: inSection.length,
    outlierCount: outliers.length,
    crossSectionArea: area,
    centroid: {
      x: xs.reduce((a, b) => a + b, 0) / xs.length,
      y: ys.reduce((a, b) => a + b, 0) / ys.length,
      z: zs.reduce((a, b) => a + b, 0) / zs.length,
    },
    boundingBox: { minX, maxX, minY, maxY, minZ, maxZ },
  };
}

export function paramsEqual(a: SectionParams, b: SectionParams, eps = 1e-4): boolean {
  return (
    Math.abs(a.positionX - b.positionX) < eps &&
    Math.abs(a.positionY - b.positionY) < eps &&
    Math.abs(a.positionZ - b.positionZ) < eps &&
    Math.abs(a.normalX - b.normalX) < eps &&
    Math.abs(a.normalY - b.normalY) < eps &&
    Math.abs(a.normalZ - b.normalZ) < eps &&
    Math.abs(a.thickness - b.thickness) < eps &&
    Math.abs(a.timeOffset - b.timeOffset) < eps
  );
}

export function paramDiff(
  a: SectionParams,
  b: SectionParams
): Partial<Record<keyof SectionParams, { before: number; after: number }>> {
  const result: Partial<Record<keyof SectionParams, { before: number; after: number }>> = {};
  (Object.keys(a) as (keyof SectionParams)[]).forEach((k) => {
    if (Math.abs(a[k] - b[k]) > 1e-6) {
      result[k] = { before: a[k], after: b[k] };
    }
  });
  return result;
}
