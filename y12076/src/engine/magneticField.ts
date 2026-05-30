import * as THREE from 'three';
import { MagnetConfig, FieldLineParams } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const getDipoleMoment = (magnet: MagnetConfig): THREE.Vector3 => {
  const baseMoment = new THREE.Vector3(0, 1, 0);
  const direction = magnet.poleDirection === 'N' ? 1 : -1;
  
  baseMoment.applyEuler(new THREE.Euler(
    magnet.rotation.x,
    magnet.rotation.y,
    magnet.rotation.z
  ));
  
  return baseMoment.multiplyScalar(magnet.strength * direction);
};

export const calculateMagneticField = (
  point: THREE.Vector3,
  magnets: MagnetConfig[]
): { field: THREE.Vector3; strength: number } => {
  const totalField = new THREE.Vector3(0, 0, 0);
  
  for (const magnet of magnets) {
    const dipoleMoment = getDipoleMoment(magnet);
    const magnetPos = new THREE.Vector3(
      magnet.position.x,
      magnet.position.y,
      magnet.position.z
    );
    
    const r = point.clone().sub(magnetPos);
    const rMag = r.length();
    
    if (rMag < 0.05) {
      continue;
    }
    
    const rNorm = r.clone().normalize();
    const mDotR = dipoleMoment.dot(rNorm);
    const term1 = rNorm.clone().multiplyScalar(3 * mDotR);
    const term2 = dipoleMoment.clone();
    
    const field = term1.sub(term2).divideScalar(Math.pow(rMag, 3));
    totalField.add(field);
  }
  
  return {
    field: totalField,
    strength: totalField.length(),
  };
};

interface FieldExplosionRecord {
  id: string;
  point: THREE.Vector3;
  fieldStrength: number;
  step: number;
  timestamp: number;
}

export const fieldExplosionRecords: FieldExplosionRecord[] = [];

export const traceFieldLine = (
  startPoint: THREE.Vector3,
  magnets: MagnetConfig[],
  params: FieldLineParams,
  direction: 1 | -1 = 1
): { points: THREE.Vector3[]; maxStrength: number } => {
  const points: THREE.Vector3[] = [startPoint.clone()];
  let current = startPoint.clone();
  let maxStrength = 0;
  const stepSize = 0.03 * (10 / params.sampleDensity);
  
  for (let i = 0; i < params.maxLength; i++) {
    const { field, strength } = calculateMagneticField(current, magnets);
    
    maxStrength = Math.max(maxStrength, strength);
    
    if (strength > params.maxFieldStrength * 5) {
      fieldExplosionRecords.push({
        id: generateId(),
        point: current.clone(),
        fieldStrength: strength,
        step: i,
        timestamp: Date.now(),
      });
      break;
    }
    
    if (strength < 0.001 || strength === 0) break;
    
    const step = field.normalize().multiplyScalar(stepSize * direction);
    current = current.clone().add(step);
    
    const distFromOrigin = current.length();
    if (distFromOrigin > 10) break;
    
    points.push(current.clone());
  }
  
  return { points, maxStrength };
};

export const generateFieldLineStartPoints = (
  magnet: MagnetConfig,
  count: number
): THREE.Vector3[] => {
  const startPoints: THREE.Vector3[] = [];
  const magnetPos = new THREE.Vector3(
    magnet.position.x,
    magnet.position.y,
    magnet.position.z
  );
  
  const poleOffset = magnet.poleDirection === 'N' ? 0.1 : -0.1;
  const polePos = magnetPos.clone().add(new THREE.Vector3(0, poleOffset, 0));
  
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    
    const radius = 0.12;
    const offset = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi) + (magnet.poleDirection === 'N' ? 0.15 : -0.15),
      radius * Math.sin(phi) * Math.sin(theta)
    );
    
    startPoints.push(magnetPos.clone().add(offset));
  }
  
  return startPoints;
};

export const generateAllFieldLines = (
  magnets: MagnetConfig[],
  params: FieldLineParams
): { lines: THREE.Vector3[][]; explosionCount: number; records: FieldExplosionRecord[] } => {
  const lines: THREE.Vector3[][] = [];
  const beforeExplosionCount = fieldExplosionRecords.length;
  
  for (const magnet of magnets) {
    const startPoints = generateFieldLineStartPoints(magnet, params.lineCount);
    
    for (const startPoint of startPoints) {
      const { points } = traceFieldLine(startPoint, magnets, params, 1);
      if (points.length > 5) {
        lines.push(points);
      }
    }
  }
  
  const explosionCount = fieldExplosionRecords.length - beforeExplosionCount;
  const recentRecords = fieldExplosionRecords.slice(beforeExplosionCount);
  
  return { lines, explosionCount, records: recentRecords };
};
