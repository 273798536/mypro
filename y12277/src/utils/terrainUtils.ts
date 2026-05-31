import * as THREE from 'three';
import { RiskLevel, RISK_COLORS } from '../types';

export function noise2D(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

export function smoothNoise(x: number, y: number): number {
  const corners = (noise2D(x - 1, y - 1) + noise2D(x + 1, y - 1) + 
                   noise2D(x - 1, y + 1) + noise2D(x + 1, y + 1)) / 16;
  const sides = (noise2D(x - 1, y) + noise2D(x + 1, y) + 
                 noise2D(x, y - 1) + noise2D(x, y + 1)) / 8;
  const center = noise2D(x, y) / 4;
  return corners + sides + center;
}

export function interpolatedNoise(x: number, y: number): number {
  const intX = Math.floor(x);
  const fracX = x - intX;
  const intY = Math.floor(y);
  const fracY = y - intY;

  const v1 = smoothNoise(intX, intY);
  const v2 = smoothNoise(intX + 1, intY);
  const v3 = smoothNoise(intX, intY + 1);
  const v4 = smoothNoise(intX + 1, intY + 1);

  const i1 = v1 * (1 - fracX) + v2 * fracX;
  const i2 = v3 * (1 - fracX) + v4 * fracX;

  return i1 * (1 - fracY) + i2 * fracY;
}

export function perlinNoise(x: number, y: number, octaves: number = 4): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += interpolatedNoise(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return total / maxValue;
}

export function getRiskColor(score: number): THREE.Color {
  let level: RiskLevel;
  if (score < 40) level = 'low';
  else if (score < 70) level = 'medium';
  else level = 'high';
  
  return new THREE.Color(RISK_COLORS[level]);
}

export function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, t);
}

export function generateTerrainGeometry(
  width: number,
  height: number,
  widthSegments: number,
  heightSegments: number,
  institutionPositions: { x: number; z: number; score: number }[],
  scale: number = 0.15
): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    
    let baseHeight = perlinNoise(x * scale, z * scale, 4) * 2;
    
    for (const inst of institutionPositions) {
      const dx = x - inst.x;
      const dz = z - inst.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const influence = Math.max(0, 1 - dist / 4);
      const peakHeight = (inst.score / 100) * 12 * influence * influence;
      baseHeight += peakHeight;
    }

    positions.setY(i, baseHeight);

    const avgScore = calculateAverageScore(x, z, institutionPositions);
    const color = getRiskColor(avgScore);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return geometry;
}

function calculateAverageScore(
  x: number,
  z: number,
  institutions: { x: number; z: number; score: number }[]
): number {
  let totalWeight = 0;
  let weightedScore = 0;

  for (const inst of institutions) {
    const dx = x - inst.x;
    const dz = z - inst.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const weight = Math.max(0, 1 - dist / 6);
    totalWeight += weight;
    weightedScore += inst.score * weight;
  }

  return totalWeight > 0 ? weightedScore / totalWeight : 30;
}

export function getAnomalyPulseColor(baseColor: string, time: number): string {
  const pulse = 0.5 + 0.5 * Math.sin(time * 3);
  const color = new THREE.Color(baseColor);
  return `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, ${0.3 + pulse * 0.7})`;
}
