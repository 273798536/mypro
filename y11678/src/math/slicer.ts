import { QuadricEquation, Bounds, SliceResult, ComputationWarning, ContourLine } from '../types';

const EPSILON = 1e-8;

export function computeSliceIntersection(
  equation: QuadricEquation,
  planeNormal: { x: number; y: number; z: number },
  planeDistance: number,
  bounds: Bounds,
  density: number = 50
): SliceResult {
  const warnings: ComputationWarning[] = [];
  const contourLines: ContourLine[] = [];

  const { normal, distance } = normalizePlane(planeNormal, planeDistance);
  
  const axis = getDominantAxis(normal);
  
  const intersectionCurves: { x: number; y: number; z: number }[][] = [];
  
  if (axis === 'z') {
    const curves = computeIntersectionForZPlane(equation, normal, distance, bounds, density);
    intersectionCurves.push(...curves);
  } else if (axis === 'y') {
    const curves = computeIntersectionForYPlane(equation, normal, distance, bounds, density);
    intersectionCurves.push(...curves);
  } else {
    const curves = computeIntersectionForXPlane(equation, normal, distance, bounds, density);
    intersectionCurves.push(...curves);
  }

  intersectionCurves.forEach((curve, index) => {
    if (curve.length < 2) {
      warnings.push({
        id: `slice-break-${index}`,
        type: 'slice_break',
        severity: 'warning',
        message: `切片曲线 ${index + 1} 不完整或断裂`,
        suggestion: '调整切片平面位置或增加采样密度',
        timestamp: new Date().toISOString(),
      });
    }
    
    contourLines.push({
      points: curve,
      value: distance,
      valid: curve.length >= 2,
    });
  });

  return {
    intersectionPoints: intersectionCurves,
    contours: contourLines,
    warnings,
  };
}

function normalizePlane(
  normal: { x: number; y: number; z: number },
  distance: number
): { normal: { x: number; y: number; z: number }; distance: number } {
  const magnitude = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
  if (magnitude < EPSILON) {
    return { normal: { x: 0, y: 0, z: 1 }, distance: 0 };
  }
  return {
    normal: {
      x: normal.x / magnitude,
      y: normal.y / magnitude,
      z: normal.z / magnitude,
    },
    distance: distance / magnitude,
  };
}

function getDominantAxis(normal: { x: number; y: number; z: number }): 'x' | 'y' | 'z' {
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);
  
  if (absX >= absY && absX >= absZ) return 'x';
  if (absY >= absX && absY >= absZ) return 'y';
  return 'z';
}

function computeIntersectionForZPlane(
  equation: QuadricEquation,
  normal: { x: number; y: number; z: number },
  distance: number,
  bounds: Bounds,
  density: number
): { x: number; y: number; z: number }[][] {
  const curves: { x: number; y: number; z: number }[][] = [];
  const points: { x: number; y: number; z: number }[] = [];
  
  const steps = density;
  const xStep = (bounds.xMax - bounds.xMin) / steps;
  const yStep = (bounds.yMax - bounds.yMin) / steps;

  for (let xi = 0; xi <= steps; xi++) {
    const x = bounds.xMin + xi * xStep;
    for (let yi = 0; yi <= steps; yi++) {
      const y = bounds.yMin + yi * yStep;
      
      const z = solveZOnPlane(equation, normal, distance, x, y);
      if (z !== null && z >= bounds.zMin && z <= bounds.zMax) {
        points.push({ x, y, z });
      }
    }
  }

  if (points.length > 0) {
    curves.push(sortPointsByDistance(points));
  }
  
  return curves;
}

function computeIntersectionForYPlane(
  equation: QuadricEquation,
  normal: { x: number; y: number; z: number },
  distance: number,
  bounds: Bounds,
  density: number
): { x: number; y: number; z: number }[][] {
  const curves: { x: number; y: number; z: number }[][] = [];
  const points: { x: number; y: number; z: number }[] = [];
  
  const steps = density;
  const xStep = (bounds.xMax - bounds.xMin) / steps;
  const zStep = (bounds.zMax - bounds.zMin) / steps;

  for (let xi = 0; xi <= steps; xi++) {
    const x = bounds.xMin + xi * xStep;
    for (let zi = 0; zi <= steps; zi++) {
      const z = bounds.zMin + zi * zStep;
      
      const y = solveYOnPlane(equation, normal, distance, x, z);
      if (y !== null && y >= bounds.yMin && y <= bounds.yMax) {
        points.push({ x, y, z });
      }
    }
  }

  if (points.length > 0) {
    curves.push(sortPointsByDistance(points));
  }
  
  return curves;
}

function computeIntersectionForXPlane(
  equation: QuadricEquation,
  normal: { x: number; y: number; z: number },
  distance: number,
  bounds: Bounds,
  density: number
): { x: number; y: number; z: number }[][] {
  const curves: { x: number; y: number; z: number }[][] = [];
  const points: { x: number; y: number; z: number }[] = [];
  
  const steps = density;
  const yStep = (bounds.yMax - bounds.yMin) / steps;
  const zStep = (bounds.zMax - bounds.zMin) / steps;

  for (let yi = 0; yi <= steps; yi++) {
    const y = bounds.yMin + yi * yStep;
    for (let zi = 0; zi <= steps; zi++) {
      const z = bounds.zMin + zi * zStep;
      
      const x = solveXOnPlane(equation, normal, distance, y, z);
      if (x !== null && x >= bounds.xMin && x <= bounds.xMax) {
        points.push({ x, y, z });
      }
    }
  }

  if (points.length > 0) {
    curves.push(sortPointsByDistance(points));
  }
  
  return curves;
}

function solveZOnPlane(
  equation: QuadricEquation,
  normal: { x: number; y: number; z: number },
  distance: number,
  x: number,
  y: number
): number | null {
  if (Math.abs(normal.z) < EPSILON) return null;
  
  const zPlane = (distance - normal.x * x - normal.y * y) / normal.z;
  
  const { A, B, C, D, E, F, G, H, I, J } = equation;
  const value = 
    A * x * x +
    B * y * y +
    C * zPlane * zPlane +
    D * x * y +
    E * y * zPlane +
    F * zPlane * x +
    G * x +
    H * y +
    I * zPlane +
    J;
  
  if (Math.abs(value) < 0.05) {
    return zPlane;
  }
  
  return null;
}

function solveYOnPlane(
  equation: QuadricEquation,
  normal: { x: number; y: number; z: number },
  distance: number,
  x: number,
  z: number
): number | null {
  if (Math.abs(normal.y) < EPSILON) return null;
  
  const yPlane = (distance - normal.x * x - normal.z * z) / normal.y;
  
  const { A, B, C, D, E, F, G, H, I, J } = equation;
  const value = 
    A * x * x +
    B * yPlane * yPlane +
    C * z * z +
    D * x * yPlane +
    E * yPlane * z +
    F * z * x +
    G * x +
    H * yPlane +
    I * z +
    J;
  
  if (Math.abs(value) < 0.05) {
    return yPlane;
  }
  
  return null;
}

function solveXOnPlane(
  equation: QuadricEquation,
  normal: { x: number; y: number; z: number },
  distance: number,
  y: number,
  z: number
): number | null {
  if (Math.abs(normal.x) < EPSILON) return null;
  
  const xPlane = (distance - normal.y * y - normal.z * z) / normal.x;
  
  const { A, B, C, D, E, F, G, H, I, J } = equation;
  const value = 
    A * xPlane * xPlane +
    B * y * y +
    C * z * z +
    D * xPlane * y +
    E * y * z +
    F * z * xPlane +
    G * xPlane +
    H * y +
    I * z +
    J;
  
  if (Math.abs(value) < 0.05) {
    return xPlane;
  }
  
  return null;
}

function sortPointsByDistance(points: { x: number; y: number; z: number }[]): { x: number; y: number; z: number }[] {
  if (points.length === 0) return [];
  
  const sorted: { x: number; y: number; z: number }[] = [points[0]];
  const remaining = [...points.slice(1)];
  
  while (remaining.length > 0) {
    const last = sorted[sorted.length - 1];
    let nearestIndex = 0;
    let nearestDist = Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const dx = remaining[i].x - last.x;
      const dy = remaining[i].y - last.y;
      const dz = remaining[i].z - last.z;
      const dist = dx * dx + dy * dy + dz * dz;
      
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = i;
      }
    }
    
    if (nearestDist > 1) break;
    
    sorted.push(remaining[nearestIndex]);
    remaining.splice(nearestIndex, 1);
  }
  
  return sorted;
}

export function generateContours(
  equation: QuadricEquation,
  bounds: Bounds,
  planeNormal: { x: number; y: number; z: number },
  baseDistance: number,
  contourCount: number
): ContourLine[] {
  const contours: ContourLine[] = [];
  const range = 4;
  const step = range / (contourCount - 1);
  
  for (let i = 0; i < contourCount; i++) {
    const distance = baseDistance - range / 2 + i * step;
    const sliceResult = computeSliceIntersection(
      equation,
      planeNormal,
      distance,
      bounds,
      40
    );
    
    sliceResult.intersectionPoints.forEach((points, idx) => {
      if (points.length > 5) {
        contours.push({
          points,
          value: distance,
          valid: true,
        });
      }
    });
  }
  
  return contours;
}
