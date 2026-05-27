import * as THREE from 'three';
import { BurnDataPoint, Risk } from '../types';

export interface SurfaceData {
  positions: Float32Array;
  colors: Float32Array;
  uvs: Float32Array;
  indices: number[];
}

const COLORS = {
  budget: new THREE.Color('#3B82F6'),
  spent: new THREE.Color('#F59E0B'),
  revenue: new THREE.Color('#10B981'),
  risk: new THREE.Color('#EF4444')
};

export const generateSurfaceGeometry = (
  dataPoints: BurnDataPoint[],
  type: 'budget' | 'spent' | 'revenue',
  maxValue: number
): SurfaceData => {
  const width = 10;
  const depth = 2;
  const segmentsX = dataPoints.length - 1;
  const segmentsZ = 10;

  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const getHeight = (index: number): number => {
    const point = dataPoints[index];
    if (!point) return 0;
    let value = 0;
    switch (type) {
      case 'budget':
        value = point.cumulativeBudget;
        break;
      case 'spent':
        value = point.cumulativeSpent;
        break;
      case 'revenue':
        value = point.cumulativeRevenue;
        break;
    }
    return (value / maxValue) * 8;
  };

  const getColor = (index: number, zRatio: number): THREE.Color => {
    const point = dataPoints[index];
    const baseColor = COLORS[type];
    
    if (point && point.risks.length > 0) {
      const hasHighRisk = point.risks.some(
        (r) => r.severity === 'high' || r.severity === 'critical'
      );
      if (hasHighRisk && zRatio > 0.7) {
        return COLORS.risk.clone().lerp(baseColor, 0.3);
      }
    }
    
    const brightness = 0.8 + zRatio * 0.2;
    return baseColor.clone().multiplyScalar(brightness);
  };

  for (let z = 0; z <= segmentsZ; z++) {
    const zRatio = z / segmentsZ;
    const zPos = -depth / 2 + zRatio * depth;

    for (let x = 0; x <= segmentsX; x++) {
      const xRatio = x / segmentsX;
      const xPos = -width / 2 + xRatio * width;
      
      const height = getHeight(x) * zRatio;
      const yPos = height;

      positions.push(xPos, yPos, zPos);

      const color = getColor(x, zRatio);
      colors.push(color.r, color.g, color.b);

      uvs.push(xRatio, zRatio);
    }
  }

  for (let z = 0; z < segmentsZ; z++) {
    for (let x = 0; x < segmentsX; x++) {
      const a = z * (segmentsX + 1) + x;
      const b = a + 1;
      const c = a + segmentsX + 1;
      const d = c + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    uvs: new Float32Array(uvs),
    indices
  };
};

export const generateLineGeometry = (
  dataPoints: BurnDataPoint[],
  type: 'budget' | 'spent' | 'revenue',
  maxValue: number
): Float32Array => {
  const width = 10;
  const positions: number[] = [];

  dataPoints.forEach((point, index) => {
    const xRatio = index / (dataPoints.length - 1);
    const xPos = -width / 2 + xRatio * width;

    let value = 0;
    switch (type) {
      case 'budget':
        value = point.cumulativeBudget;
        break;
      case 'spent':
        value = point.cumulativeSpent;
        break;
      case 'revenue':
        value = point.cumulativeRevenue;
        break;
    }

    const yPos = (value / maxValue) * 8;
    const zPos = type === 'budget' ? -1 : type === 'spent' ? 0 : 1;

    positions.push(xPos, yPos, zPos);
  });

  return new Float32Array(positions);
};

export const getRiskPositions = (
  risks: Risk[],
  dataPoints: BurnDataPoint[],
  maxValue: number
): { x: number; y: number; z: number; risk: Risk }[] => {
  const width = 10;
  const positions: { x: number; y: number; z: number; risk: Risk }[] = [];

  risks.forEach((risk) => {
    let relatedPoint: BurnDataPoint | undefined;

    if (risk.relatedItemType === 'expense') {
      relatedPoint = dataPoints.find((_, i) => `week-${i}` === risk.relatedItemId);
    } else if (risk.relatedItemType === 'revenue') {
      relatedPoint = dataPoints[Math.floor(dataPoints.length * 0.5)];
    } else if (risk.relatedItemType === 'milestone') {
      const index = Math.floor(Math.random() * dataPoints.length * 0.6) + 5;
      relatedPoint = dataPoints[index];
    }

    if (relatedPoint) {
      const index = dataPoints.indexOf(relatedPoint);
      const xRatio = index / (dataPoints.length - 1);
      const xPos = -width / 2 + xRatio * width;
      const yPos = (relatedPoint.cumulativeSpent / maxValue) * 8 + 0.5;
      const zPos = (Math.random() - 0.5) * 2;

      positions.push({ x: xPos, y: yPos, z: zPos, risk });
    }
  });

  return positions;
};

export const findNearestDataPoint = (
  x: number,
  dataPoints: BurnDataPoint[]
): BurnDataPoint | null => {
  const width = 10;
  const xRatio = (x + width / 2) / width;
  const index = Math.round(xRatio * (dataPoints.length - 1));
  return dataPoints[Math.max(0, Math.min(dataPoints.length - 1, index))] || null;
};

export const getMaxValue = (dataPoints: BurnDataPoint[]): number => {
  let max = 0;
  dataPoints.forEach((point) => {
    max = Math.max(max, point.cumulativeBudget, point.cumulativeSpent, point.cumulativeRevenue);
  });
  return max * 1.1;
};
