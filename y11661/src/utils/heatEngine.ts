import type { HeatColorStop, Position3D } from '../types';

export const DEFAULT_COLOR_STOPS: HeatColorStop[] = [
  { value: 0, color: '#1E40AF' },
  { value: 0.25, color: '#0EA5E9' },
  { value: 0.5, color: '#10B981' },
  { value: 0.75, color: '#F59E0B' },
  { value: 1, color: '#EF4444' },
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function interpolateColor(
  colorStops: HeatColorStop[],
  value: number
): string {
  if (value <= colorStops[0].value) {
    return colorStops[0].color;
  }
  if (value >= colorStops[colorStops.length - 1].value) {
    return colorStops[colorStops.length - 1].color;
  }

  let lowerIndex = 0;
  let upperIndex = colorStops.length - 1;

  for (let i = 0; i < colorStops.length - 1; i++) {
    if (value >= colorStops[i].value && value <= colorStops[i + 1].value) {
      lowerIndex = i;
      upperIndex = i + 1;
      break;
    }
  }

  const lower = colorStops[lowerIndex];
  const upper = colorStops[upperIndex];
  const range = upper.value - lower.value;
  const t = range === 0 ? 0 : (value - lower.value) / range;

  const lowerRgb = hexToRgb(lower.color);
  const upperRgb = hexToRgb(upper.color);

  return rgbToHex(
    lowerRgb.r + (upperRgb.r - lowerRgb.r) * t,
    lowerRgb.g + (upperRgb.g - lowerRgb.g) * t,
    lowerRgb.b + (upperRgb.b - lowerRgb.b) * t
  );
}

export function normalizeValue(
  value: number,
  min: number,
  max: number
): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export interface HeatDataPoint {
  position: Position3D;
  value: number;
}

export function calculateHeatMapData(
  dataPoints: HeatDataPoint[],
  gridSize: number = 50,
  radius: number = 5
): number[][] {
  const heatMap: number[][] = [];

  for (let i = 0; i < gridSize; i++) {
    heatMap[i] = [];
    for (let j = 0; j < gridSize; j++) {
      heatMap[i][j] = 0;
    }
  }

  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const point of dataPoints) {
    minX = Math.min(minX, point.position.x);
    maxX = Math.max(maxX, point.position.x);
    minZ = Math.min(minZ, point.position.z);
    maxZ = Math.max(maxZ, point.position.z);
  }

  const rangeX = maxX - minX || 1;
  const rangeZ = maxZ - minZ || 1;

  for (const point of dataPoints) {
    const gridX = Math.floor(
      ((point.position.x - minX) / rangeX) * (gridSize - 1)
    );
    const gridZ = Math.floor(
      ((point.position.z - minZ) / rangeZ) * (gridSize - 1)
    );

    const radiusGrid = Math.ceil((radius / Math.max(rangeX, rangeZ)) * gridSize);

    for (let dx = -radiusGrid; dx <= radiusGrid; dx++) {
      for (let dz = -radiusGrid; dz <= radiusGrid; dz++) {
        const x = gridX + dx;
        const z = gridZ + dz;
        if (x >= 0 && x < gridSize && z >= 0 && z < gridSize) {
          const distance = Math.sqrt(dx * dx + dz * dz);
          if (distance <= radiusGrid) {
            const weight = 1 - distance / radiusGrid;
            heatMap[z][x] += point.value * weight;
          }
        }
      }
    }
  }

  return heatMap;
}

export function getHeatColor(
  value: number,
  minValue: number,
  maxValue: number,
  colorStops: HeatColorStop[] = DEFAULT_COLOR_STOPS
): string {
  const normalized = normalizeValue(value, minValue, maxValue);
  return interpolateColor(colorStops, normalized);
}

export interface HeatStatistics {
  min: number;
  max: number;
  average: number;
  median: number;
  hotspots: { position: Position3D; value: number }[];
}

export function calculateHeatStatistics(
  dataPoints: HeatDataPoint[],
  hotspotThreshold: number = 0.8
): HeatStatistics {
  const values = dataPoints.map((p) => p.value).sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);

  const min = values[0] || 0;
  const max = values[values.length - 1] || 0;
  const average = values.length > 0 ? sum / values.length : 0;
  const median =
    values.length > 0
      ? values.length % 2 === 0
        ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
        : values[Math.floor(values.length / 2)]
      : 0;

  const thresholdValue = min + (max - min) * hotspotThreshold;
  const hotspots = dataPoints
    .filter((p) => p.value >= thresholdValue)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((p) => ({ position: p.position, value: p.value }));

  return { min, max, average, median, hotspots };
}

export function applyTimeDecay(
  heatValue: number,
  timestamp: number,
  currentTime: number,
  halfLifeDays: number = 7
): number {
  const ageDays = (currentTime - timestamp) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.pow(0.5, ageDays / halfLifeDays);
  return heatValue * decayFactor;
}
