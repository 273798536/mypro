import type { DataPoint, OverlapRegion, Embedding3D } from '../types';

export interface OverlapResult {
  regions: OverlapRegion[];
  overlapScore: number;
  overlappingPointIds: Set<string>;
}

export function detectOverlaps(points: DataPoint[]): OverlapResult {
  if (points.length < 2) {
    return { regions: [], overlapScore: 0, overlappingPointIds: new Set() };
  }

  const labels = [...new Set(points.map(p => p.trueLabel))];
  const regions: OverlapRegion[] = [];
  const overlappingPointIds = new Set<string>();
  let totalOverlapPairs = 0;
  const maxPossiblePairs = (labels.length * (labels.length - 1)) / 2;

  const labelGroups: Record<string, DataPoint[]> = {};
  for (const label of labels) {
    labelGroups[label] = points.filter(p => p.trueLabel === label);
  }

  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const label1 = labels[i];
      const label2 = labels[j];
      const group1 = labelGroups[label1];
      const group2 = labelGroups[label2];

      const region = findOverlapRegion(group1, group2, label1, label2);
      if (region) {
        regions.push(region);
        
        const pointsInRegion = points.filter(p => {
          const dist = Math.sqrt(
            Math.pow(p.embedding[0] - region.center[0], 2) +
            Math.pow(p.embedding[1] - region.center[1], 2) +
            Math.pow(p.embedding[2] - region.center[2], 2)
          );
          return dist < region.size;
        });
        
        for (const p of pointsInRegion) {
          overlappingPointIds.add(p.id);
        }
        
        totalOverlapPairs++;
      }
    }
  }

  const overlapScore = maxPossiblePairs > 0 ? totalOverlapPairs / maxPossiblePairs : 0;

  return { regions, overlapScore, overlappingPointIds };
}

function findOverlapRegion(
  group1: DataPoint[],
  group2: DataPoint[],
  label1: string,
  label2: string
): OverlapRegion | null {
  if (group1.length === 0 || group2.length === 0) return null;

  const threshold = 1.5;
  const minOverlapPoints = 3;
  
  const overlapCandidates: { point: DataPoint; otherGroup: DataPoint; dist: number }[] = [];

  for (const p1 of group1) {
    for (const p2 of group2) {
      const dist = euclideanDistance(p1.embedding, p2.embedding);
      if (dist < threshold) {
        overlapCandidates.push({ point: p1, otherGroup: p2, dist });
      }
    }
  }

  if (overlapCandidates.length < minOverlapPoints) return null;

  overlapCandidates.sort((a, b) => a.dist - b.dist);
  
  const centerPoints = overlapCandidates.slice(0, Math.min(10, overlapCandidates.length));
  const center: Embedding3D = [0, 0, 0];
  for (const cp of centerPoints) {
    center[0] += (cp.point.embedding[0] + cp.otherGroup.embedding[0]) / 2;
    center[1] += (cp.point.embedding[1] + cp.otherGroup.embedding[1]) / 2;
    center[2] += (cp.point.embedding[2] + cp.otherGroup.embedding[2]) / 2;
  }
  center[0] /= centerPoints.length;
  center[1] /= centerPoints.length;
  center[2] /= centerPoints.length;

  let maxDist = 0;
  for (const cp of overlapCandidates) {
    const d1 = euclideanDistance(cp.point.embedding, center);
    const d2 = euclideanDistance(cp.otherGroup.embedding, center);
    maxDist = Math.max(maxDist, d1, d2);
  }

  return {
    id: `overlap-${label1}-${label2}`,
    labels: [label1, label2],
    center,
    size: maxDist + 0.5,
    pointCount: overlapCandidates.length * 2,
  };
}

function euclideanDistance(a: Embedding3D, b: Embedding3D): number {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) +
    Math.pow(a[1] - b[1], 2) +
    Math.pow(a[2] - b[2], 2)
  );
}

export function generateConvexHull(region: OverlapRegion): Embedding3D[] {
  const { center, size } = region;
  const segments = 16;
  const rings = 8;
  const vertices: Embedding3D[] = [];

  for (let ring = 0; ring <= rings; ring++) {
    const phi = (ring / rings) * Math.PI;
    for (let seg = 0; seg < segments; seg++) {
      const theta = (seg / segments) * 2 * Math.PI;
      vertices.push([
        center[0] + size * Math.sin(phi) * Math.cos(theta),
        center[1] + size * Math.sin(phi) * Math.sin(theta),
        center[2] + size * Math.cos(phi),
      ]);
    }
  }

  return vertices;
}
