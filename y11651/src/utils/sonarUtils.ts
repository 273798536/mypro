import type { Point, NoiseSource, ScanRecord, Cell } from '../types/game';
import { manhattanDistance } from './gridUtils';

export function calculateEchoStrength(
  scanPos: Point,
  targetPos: Point,
  noiseSources: NoiseSource[]
): { strength: number; hasNoise: boolean; noiseLevel: number } {
  const distance = manhattanDistance(scanPos, targetPos);
  const maxRange = 5;
  
  let strength = Math.max(0, 100 - distance * 20);
  
  let hasNoise = false;
  let noiseLevel = 0;
  
  for (const noise of noiseSources) {
    if (!noise.active) continue;
    const noiseDist = manhattanDistance(scanPos, noise.position);
    if (noiseDist <= noise.radius) {
      hasNoise = true;
      const noiseEffect = noise.intensity * (1 - noiseDist / noise.radius);
      noiseLevel = Math.max(noiseLevel, noiseEffect);
      strength *= (1 - noiseEffect / 200);
    }
  }
  
  return { 
    strength: Math.round(strength), 
    hasNoise, 
    noiseLevel: Math.round(noiseLevel) 
  };
}

export function isTargetDetected(echoStrength: number, noiseLevel: number): boolean {
  const effectiveStrength = echoStrength * (1 - noiseLevel / 200);
  return effectiveStrength > 20;
}

export function getEchoColor(strength: number, hasNoise: boolean): string {
  if (hasNoise && strength < 30) {
    return 'rgba(239, 68, 68, 0.3)';
  }
  if (strength >= 80) return 'rgba(34, 197, 94, 0.8)';
  if (strength >= 60) return 'rgba(34, 197, 94, 0.6)';
  if (strength >= 40) return 'rgba(234, 179, 8, 0.5)';
  if (strength >= 20) return 'rgba(234, 179, 8, 0.3)';
  return 'rgba(100, 116, 139, 0.2)';
}

export function getEchoIntensity(strength: number): number {
  return Math.min(1, strength / 100);
}

export function createScanRecord(
  turn: number,
  position: Point,
  echoStrength: number,
  hasNoise: boolean,
  noiseLevel: number,
  detectedTarget: boolean
): ScanRecord {
  return {
    turn,
    position: { ...position },
    echoStrength,
    hasNoise,
    noiseLevel,
    detectedTarget,
    timestamp: Date.now()
  };
}

export function updateGridWithScanResult(
  grid: Cell[][],
  position: Point,
  echoStrength: number,
  hasNoise: boolean,
  noiseLevel: number
): Cell[][] {
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  const cell = newGrid[position.y]?.[position.x];
  
  if (cell) {
    cell.scanned = true;
    cell.echoStrength = echoStrength;
    cell.hasNoise = hasNoise;
    cell.noiseLevel = noiseLevel;
  }
  
  return newGrid;
}

export function estimateTargetPosition(
  scanHistory: ScanRecord[],
  gridSize: number
): Point | null {
  const strongScans = scanHistory.filter(s => s.echoStrength >= 50 && !s.hasNoise);
  
  if (strongScans.length === 0) return null;
  
  let sumX = 0;
  let sumY = 0;
  let totalWeight = 0;
  
  for (const scan of strongScans) {
    const weight = scan.echoStrength / 100;
    sumX += scan.position.x * weight;
    sumY += scan.position.y * weight;
    totalWeight += weight;
  }
  
  if (totalWeight === 0) return null;
  
  return {
    x: Math.round(sumX / totalWeight),
    y: Math.round(sumY / totalWeight)
  };
}

export function generateNoiseSources(
  count: number,
  gridSize: number,
  intensityRange: [number, number],
  excludePositions: Point[] = []
): NoiseSource[] {
  const sources: NoiseSource[] = [];
  const usedPositions = [...excludePositions];
  
  for (let i = 0; i < count; i++) {
    let position: Point;
    let attempts = 0;
    
    do {
      position = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize)
      };
      attempts++;
    } while (
      usedPositions.some(p => manhattanDistance(p, position) < 3) &&
      attempts < 50
    );
    
    usedPositions.push(position);
    
    sources.push({
      id: `noise-${i}-${Date.now()}`,
      position,
      radius: Math.floor(Math.random() * 2) + 2,
      intensity: Math.floor(Math.random() * (intensityRange[1] - intensityRange[0])) + intensityRange[0],
      active: true
    });
  }
  
  return sources;
}
