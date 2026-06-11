import type { LightObject, PendingConfirm } from "../data/types";

const COLOR_TEMP_THRESHOLD = 500;
const INTENSITY_DIFF_RATIO = 0.3;

function distance3D(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  );
}

export function checkAdjacencyConflicts(
  lights: LightObject[],
  showcaseId?: string
): PendingConfirm[] {
  const filtered = showcaseId
    ? lights.filter((l) => l.showcaseId === showcaseId)
    : lights;

  const conflicts: PendingConfirm[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < filtered.length; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      const a = filtered[i];
      const b = filtered[j];
      if (a.showcaseId !== b.showcaseId) continue;

      const dist = distance3D(a.position, b.position);
      if (dist > 5) continue;

      const tempDiff = Math.abs(a.colorTemp - b.colorTemp);
      const intensityRatio = Math.abs(a.intensity - b.intensity) / Math.max(a.intensity, b.intensity);

      if (tempDiff > COLOR_TEMP_THRESHOLD || intensityRatio > INTENSITY_DIFF_RATIO) {
        const key = [a.id, b.id].sort().join("-");
        if (seen.has(key)) continue;
        seen.add(key);

        const reasons: string[] = [];
        if (tempDiff > COLOR_TEMP_THRESHOLD) {
          reasons.push(`色温差${tempDiff}K超出阈值${COLOR_TEMP_THRESHOLD}K`);
        }
        if (intensityRatio > INTENSITY_DIFF_RATIO) {
          reasons.push(`亮度差异${(intensityRatio * 100).toFixed(0)}%超出阈值${(INTENSITY_DIFF_RATIO * 100).toFixed(0)}%`);
        }

        conflicts.push({
          id: `pc-auto-${a.id}-${b.id}`,
          reason: `相邻点位异常：${a.name}与${b.name}——${reasons.join("，")}`,
          impactScope: [a.name, b.name],
          relatedObjectIds: [a.id, b.id],
          createdAt: new Date().toISOString(),
          resolved: false,
        });
      }
    }
  }

  return conflicts;
}
