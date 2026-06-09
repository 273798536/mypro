import type { Pore, Outlier, CutAxis, CollisionResult, Scene } from "@/types";

export function checkCutPlaneCollision(
  scene: Scene,
  axis: CutAxis,
  value: number,
  threshold = 0.15,
): CollisionResult {
  const { boundary, pores, outliers } = scene;
  const axisKey = axis as keyof typeof boundary;

  let min: number, max: number;
  if (axis === "x") {
    min = boundary.minX;
    max = boundary.maxX;
  } else if (axis === "y") {
    min = boundary.minY;
    max = boundary.maxY;
  } else {
    min = boundary.minZ;
    max = boundary.maxZ;
  }

  const distToMin = value - min;
  const distToMax = max - value;
  const nearestBoundary = Math.min(distToMin, distToMax);
  const isCrossed = value < min - threshold || value > max + threshold;

  const crossDistance = Math.max(
    0,
    Math.max(min - threshold - value, value - (max + threshold)),
  );

  const crossedPores: string[] = [];
  pores.forEach((p) => {
    const pv = p[axis];
    if (Math.abs(pv - value) <= p.radius + threshold) {
      crossedPores.push(p.id);
    }
  });

  const crossedOutliers: string[] = [];
  outliers.forEach((o) => {
    const ov = o[axis];
    if (Math.abs(ov - value) <= 0.5 + threshold) {
      crossedOutliers.push(o.id);
    }
  });

  void axisKey;
  return {
    isCrossed,
    crossedPores,
    crossedOutliers,
    distance: crossDistance,
    nearestBoundary,
  };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function dedupeMeasurements<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const baseId = item.id.replace(/-dup$/, "");
    if (!seen.has(baseId)) {
      seen.add(baseId);
      result.push(item);
    }
  }
  return result;
}

export function getDuplicateIds<T extends { id: string }>(items: T[]): string[] {
  return items.filter((i) => i.id.endsWith("-dup")).map((i) => i.id);
}
