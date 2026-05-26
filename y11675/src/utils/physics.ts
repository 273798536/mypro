import { Charge, Vec3, FieldValue, Warning } from '@/types';

export const K = 1.0;
export const MIN_DISTANCE = 0.05;
export const OVERLAP_THRESHOLD = 0.3;
export const DIVERGENCE_THRESHOLD = 1000;

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scaleVec3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function magnitude(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalize(v: Vec3): Vec3 {
  const m = magnitude(v);
  if (m < 1e-10) return { x: 0, y: 0, z: 0 };
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}

export function distance(a: Vec3, b: Vec3): number {
  return magnitude(subVec3(a, b));
}

export function calculateFieldAtPoint(
  charges: Charge[],
  point: Vec3
): FieldValue {
  let fieldX = 0;
  let fieldY = 0;
  let fieldZ = 0;
  let potential = 0;

  for (const charge of charges) {
    const r = subVec3(point, charge.position);
    const dist = Math.max(magnitude(r), MIN_DISTANCE);
    const distSq = dist * dist;

    const fieldMag = (K * charge.charge) / distSq;
    const unitR = normalize(r);

    fieldX += fieldMag * unitR.x;
    fieldY += fieldMag * unitR.y;
    fieldZ += fieldMag * unitR.z;

    potential += (K * charge.charge) / dist;
  }

  const fieldVec = { x: fieldX, y: fieldY, z: fieldZ };
  return {
    position: point,
    electricField: fieldVec,
    potential,
    fieldMagnitude: magnitude(fieldVec)
  };
}

export function generateFieldLine(
  charges: Charge[],
  startPoint: Vec3,
  direction: 1 | -1,
  maxSteps: number = 500,
  stepSize: number = 0.05
): Vec3[] {
  const points: Vec3[] = [];
  let current = { ...startPoint };

  for (let i = 0; i < maxSteps; i++) {
    points.push({ ...current });

    const field = calculateFieldAtPoint(charges, current);
    const fieldDir = normalize(field.electricField);

    if (field.fieldMagnitude < 1e-6) break;

    const step = scaleVec3(fieldDir, stepSize * direction);
    current = addVec3(current, step);

    if (Math.abs(current.x) > 10 || Math.abs(current.y) > 10 || Math.abs(current.z) > 10) {
      break;
    }

    let reachedCharge = false;
    for (const charge of charges) {
      if (distance(current, charge.position) < 0.1) {
        reachedCharge = true;
        break;
      }
    }
    if (reachedCharge) break;
  }

  return points;
}

export function generateSeedPoints(charge: Charge, count: number = 16): Vec3[] {
  const points: Vec3[] = [];
  const radius = 0.15;

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    const x = radius * Math.sin(phi) * Math.cos(theta) + charge.position.x;
    const y = radius * Math.sin(phi) * Math.sin(theta) + charge.position.y;
    const z = radius * Math.cos(phi) + charge.position.z;

    points.push({ x, y, z });
  }

  return points;
}

export interface FieldLineData {
  points: Vec3[];
  chargeId: string;
  isPositive: boolean;
}

export function generateAllFieldLines(
  charges: Charge[],
  linesPerCharge: number = 12
): FieldLineData[] {
  const result: FieldLineData[] = [];

  for (const charge of charges) {
    const seeds = generateSeedPoints(charge, linesPerCharge);
    const direction: 1 | -1 = charge.charge > 0 ? 1 : -1;

    for (const seed of seeds) {
      const points = generateFieldLine(charges, seed, direction);
      if (points.length > 2) {
        result.push({
          points,
          chargeId: charge.id,
          isPositive: charge.charge > 0
        });
      }
    }
  }

  return result;
}

export function generateEquipotentialData(
  charges: Charge[],
  gridSize: number = 20,
  bounds: number = 5
): { positions: Vec3[]; potentials: number[] } {
  const positions: Vec3[] = [];
  const potentials: number[] = [];
  const step = (2 * bounds) / (gridSize - 1);

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      for (let k = 0; k < gridSize; k++) {
        const x = -bounds + i * step;
        const y = -bounds + j * step;
        const z = -bounds + k * step;
        const point = { x, y, z };

        const field = calculateFieldAtPoint(charges, point);
        if (Math.abs(field.potential) < 100 && Math.abs(field.potential) > 0.01) {
          positions.push(point);
          potentials.push(field.potential);
        }
      }
    }
  }

  return { positions, potentials };
}

export function checkOverlap(charges: Charge[]): Warning[] {
  const warnings: Warning[] = [];

  for (let i = 0; i < charges.length; i++) {
    for (let j = i + 1; j < charges.length; j++) {
      const dist = distance(charges[i].position, charges[j].position);
      if (dist < OVERLAP_THRESHOLD) {
        const sameSign = charges[i].charge * charges[j].charge > 0;
        warnings.push({
          id: `overlap-${charges[i].id}-${charges[j].id}`,
          type: 'overlap',
          message: sameSign
            ? `警告：电荷 ${charges[i].id} 和 ${charges[j].id} 距离过近（${dist.toFixed(3)}），同号电荷排斥力过大`
            : `提示：电荷 ${charges[i].id} 和 ${charges[j].id} 距离过近（${dist.toFixed(3)}），场线计算可能失真`,
          timestamp: Date.now(),
          dismissed: false
        });
      }
    }
  }

  return warnings;
}

export function checkDivergence(charges: Charge[], samplePoints: Vec3[]): Warning[] {
  const warnings: Warning[] = [];

  for (const point of samplePoints) {
    const field = calculateFieldAtPoint(charges, point);
    if (field.fieldMagnitude > DIVERGENCE_THRESHOLD) {
      warnings.push({
        id: `div-${point.x}-${point.y}-${point.z}`,
        type: 'divergence',
        message: `警告：在 (${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}) 处电场强度过大 (${field.fieldMagnitude.toFixed(1)})，可能导致渲染异常`,
        timestamp: Date.now(),
        dismissed: false
      });
    }
  }

  return warnings;
}

export function getChargeColor(charge: number): string {
  if (charge > 0) return '#ff6b6b';
  if (charge < 0) return '#4ecdc4';
  return '#95a5a6';
}

export function getPotentialColor(potential: number): string {
  const maxVal = 10;
  const normalized = Math.max(-1, Math.min(1, potential / maxVal));
  
  if (normalized > 0) {
    const r = Math.floor(255 * normalized);
    const g = Math.floor(107 * normalized + 150 * (1 - normalized));
    const b = Math.floor(107 * normalized + 150 * (1 - normalized));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const r = Math.floor(78 * Math.abs(normalized) + 150 * (1 - Math.abs(normalized)));
    const g = Math.floor(205 * Math.abs(normalized) + 150 * (1 - Math.abs(normalized)));
    const b = Math.floor(196 * Math.abs(normalized) + 150 * (1 - Math.abs(normalized)));
    return `rgb(${r}, ${g}, ${b})`;
  }
}
