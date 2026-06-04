import { ContourData } from '../../types';

const centerLng = 116.397;
const centerLat = 39.908;

function generateContourRing(
  centerLng: number,
  centerLat: number,
  radiusDeg: number,
  elevation: number,
  isMajor: boolean,
  irregularity: number = 0.1,
  segments: number = 48
): ContourData {
  const coordinates: [number, number][] = [];
  const seed = elevation * 123;

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const noise1 = Math.sin(i * 0.8 + seed) * 0.5;
    const noise2 = Math.cos(i * 1.3 + seed * 0.7) * 0.3;
    const noise3 = Math.sin(i * 0.3 + seed * 0.4) * 0.2;
    const combinedNoise = (noise1 + noise2 + noise3) * irregularity;
    const radius = radiusDeg * (1 + combinedNoise);
    const lng = centerLng + Math.cos(angle) * radius;
    const lat = centerLat + Math.sin(angle) * radius * 1.3;
    coordinates.push([lng, lat]);
  }

  return {
    id: `contour-${elevation}-${Math.random().toString(36).substr(2, 6)}`,
    coordinates,
    elevation,
    isMajor
  };
}

function generateMountainContours(
  mountainCenter: { lng: number; lat: number },
  baseElevation: number,
  peakElevation: number,
  interval: number,
  baseRadius: number
): ContourData[] {
  const contours: ContourData[] = [];
  const elevationSteps = Math.ceil((peakElevation - baseElevation) / interval);

  for (let i = 0; i < elevationSteps; i++) {
    const elevation = baseElevation + i * interval;
    const progress = i / elevationSteps;
    const radius = baseRadius * (1 - progress * 0.85);
    const irregularity = 0.08 + progress * 0.15;
    const isMajor = elevation % (interval * 5) === 0;

    contours.push(generateContourRing(
      mountainCenter.lng,
      mountainCenter.lat,
      radius,
      elevation,
      isMajor,
      irregularity
    ));
  }

  return contours;
}

export const contours: ContourData[] = [
  ...generateMountainContours(
    { lng: centerLng - 0.01, lat: centerLat + 0.015 },
    40,
    88,
    4,
    0.025
  ),
  ...generateMountainContours(
    { lng: centerLng + 0.02, lat: centerLat - 0.01 },
    35,
    72,
    4,
    0.018
  ),
  ...generateMountainContours(
    { lng: centerLng - 0.025, lat: centerLat - 0.02 },
    45,
    95,
    4,
    0.03
  ),
  ...generateMountainContours(
    { lng: centerLng + 0.015, lat: centerLat + 0.025 },
    38,
    68,
    4,
    0.02
  ),
];

export const getElevationRange = (): { min: number; max: number } => {
  const elevations = contours.map(c => c.elevation);
  return {
    min: Math.min(...elevations),
    max: Math.max(...elevations)
  };
};

export const getContoursByElevation = (minElevation: number, maxElevation: number): ContourData[] => {
  return contours.filter(c => c.elevation >= minElevation && c.elevation <= maxElevation);
};
