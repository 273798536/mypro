import type { TerrainGrid, CapacityCurvePoint } from '@/types';

export function calculateSubmergedArea(terrain: TerrainGrid, waterLevel: number): number {
  let count = 0;
  for (const row of terrain.elevations) {
    for (const elev of row) {
      if (elev < waterLevel) count++;
    }
  }
  return count * terrain.cellSize * terrain.cellSize;
}

export function calculateCapacity(terrain: TerrainGrid, waterLevel: number): number {
  let volume = 0;
  const cellArea = terrain.cellSize * terrain.cellSize;
  for (const row of terrain.elevations) {
    for (const elev of row) {
      if (elev < waterLevel) {
        volume += (waterLevel - elev) * cellArea;
      }
    }
  }
  return volume / 10000;
}

export function interpolateCapacity(
  curve: CapacityCurvePoint[],
  level: number
): { value: number; method: string; confidence: 'high' | 'medium' | 'low' } {
  if (curve.length === 0) {
    return { value: 0, method: '无数据', confidence: 'low' };
  }
  if (curve.length === 1) {
    return { value: curve[0].capacity, method: '单点引用', confidence: 'low' };
  }
  if (level <= curve[0].level) {
    return {
      value: curve[0].capacity,
      method: '低于最低测量点，取边界值',
      confidence: 'low',
    };
  }
  if (level >= curve[curve.length - 1].level) {
    const last = curve[curve.length - 1];
    const prev = curve[curve.length - 2];
    const extrapSlope = (last.capacity - prev.capacity) / (last.level - prev.level);
    const extrapVal = last.capacity + extrapSlope * (level - last.level);
    return {
      value: Math.max(0, extrapVal),
      method: '超出最高测量点，线性外推（可靠性低）',
      confidence: 'low',
    };
  }
  for (let i = 0; i < curve.length - 1; i++) {
    if (level >= curve[i].level && level <= curve[i + 1].level) {
      const t = (level - curve[i].level) / (curve[i + 1].level - curve[i].level);
      const value = curve[i].capacity + t * (curve[i + 1].capacity - curve[i].capacity);
      const gap = curve[i + 1].level - curve[i].level;
      const confidence = gap <= 10 ? 'high' : gap <= 30 ? 'medium' : 'low';
      return {
        value,
        method: `线性插值（${curve[i].level}m~${curve[i + 1].level}m区间，间距${gap}m）`,
        confidence,
      };
    }
  }
  return { value: 0, method: '插值失败', confidence: 'low' };
}

export function getSubmergedVillages(
  terrain: TerrainGrid,
  villageElevations: { name: string; elevation: number }[],
  waterLevel: number
): string[] {
  return villageElevations
    .filter((v) => v.elevation < waterLevel)
    .map((v) => v.name);
}

export function getContourLines(
  terrain: TerrainGrid,
  interval: number
): { level: number; points: [number, number][] }[] {
  const minLevel = Math.ceil(terrain.minElevation / interval) * interval;
  const maxLevel = Math.floor(terrain.maxElevation / interval) * interval;
  const contours: { level: number; points: [number, number][] }[] = [];
  for (let level = minLevel; level <= maxLevel; level += interval) {
    const points: [number, number][] = [];
    for (let i = 0; i < terrain.gridSize.height - 1; i++) {
      for (let j = 0; j < terrain.gridSize.width - 1; j++) {
        const v00 = terrain.elevations[i][j];
        const v10 = terrain.elevations[i][j + 1];
        const v01 = terrain.elevations[i + 1][j];
        const v11 = terrain.elevations[i + 1][j + 1];
        const edges: [number, number][] = [];
        if ((v00 - level) * (v10 - level) < 0) {
          const t = (level - v00) / (v10 - v00);
          edges.push([j + t, i]);
        }
        if ((v10 - level) * (v11 - level) < 0) {
          const t = (level - v10) / (v11 - v10);
          edges.push([j + 1, i + t]);
        }
        if ((v01 - level) * (v11 - level) < 0) {
          const t = (level - v01) / (v11 - v01);
          edges.push([j + t, i + 1]);
        }
        if ((v00 - level) * (v01 - level) < 0) {
          const t = (level - v00) / (v01 - v00);
          edges.push([j, i + t]);
        }
        for (const p of edges) {
          points.push(p);
        }
      }
    }
    if (points.length > 0) {
      contours.push({ level, points });
    }
  }
  return contours;
}
