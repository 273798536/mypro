import type { TerrainGrid, VillagePoint, SpillwayPoint, CapacityCurvePoint } from '@/types';

function generateTerrainElevations(width: number, height: number): number[][] {
  const elevations: number[][] = [];
  const cx = width / 2;
  const cy = height / 2;
  for (let i = 0; i < height; i++) {
    const row: number[] = [];
    for (let j = 0; j < width; j++) {
      const dx = (j - cx) / cx;
      const dy = (i - cy) / cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const base = 280 - 200 * Math.exp(-dist * 1.8);
      const ridge = 40 * Math.sin(j * 0.3) * Math.cos(i * 0.25);
      const noise = (Math.random() - 0.5) * 8;
      row.push(Math.round((base + ridge + noise) * 10) / 10);
    }
    elevations.push(row);
  }
  return elevations;
}

export const sampleTerrain: TerrainGrid = (() => {
  const width = 40;
  const height = 40;
  const elevations = generateTerrainElevations(width, height);
  let min = Infinity;
  let max = -Infinity;
  for (const row of elevations) {
    for (const v of row) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return {
    id: 'terrain-sample-001',
    name: '青山水库库区地形',
    gridSize: { width, height },
    cellSize: 50,
    elevations,
    minElevation: Math.round(min * 10) / 10,
    maxElevation: Math.round(max * 10) / 10,
    unit: 'meter',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z',
  };
})();

export const sampleVillages: VillagePoint[] = [
  { id: 'v001', name: '青山村', x: 10, y: 10, elevation: 195, population: 320, riskLevel: 'low', createdAt: '2026-05-20T08:00:00Z' },
  { id: 'v002', name: '河源镇', x: 20, y: 15, elevation: 165, population: 1200, riskLevel: 'medium', createdAt: '2026-05-20T08:00:00Z' },
  { id: 'v003', name: '龙门村', x: 30, y: 25, elevation: 210, population: 580, riskLevel: 'low', createdAt: '2026-05-20T08:00:00Z' },
  { id: 'v004', name: '下坝村', x: 15, y: 30, elevation: 140, population: 850, riskLevel: 'high', createdAt: '2026-05-20T08:00:00Z' },
  { id: 'v005', name: '桥头村', x: 25, y: 8, elevation: 220, population: 210, riskLevel: 'low', createdAt: '2026-05-20T08:00:00Z' },
];

export const sampleSpillways: SpillwayPoint[] = [
  { id: 's001', name: '主溢洪道', x: 35, y: 20, elevation: 175, designFlow: 800 },
  { id: 's002', name: '副溢洪道', x: 5, y: 25, elevation: 185, designFlow: 300 },
];

export const sampleCapacityCurve: CapacityCurvePoint[] = [
  { level: 100, capacity: 0 },
  { level: 120, capacity: 50 },
  { level: 140, capacity: 180 },
  { level: 160, capacity: 420 },
  { level: 175, capacity: 680 },
  { level: 185, capacity: 920 },
  { level: 200, capacity: 1250 },
  { level: 220, capacity: 1680 },
  { level: 240, capacity: 2200 },
  { level: 260, capacity: 2850 },
  { level: 280, capacity: 3600 },
];
