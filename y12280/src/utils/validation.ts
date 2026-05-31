import { Magnet, FieldLine, ValidationWarning, Vector3 } from '@/types';

function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function angleBetween(a: Vector3, b: Vector3): number {
  const aNorm = normalize(a);
  const bNorm = normalize(b);
  const d = Math.max(-1, Math.min(1, dot(aNorm, bNorm)));
  return Math.acos(d) * (180 / Math.PI);
}

function distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function validatePoleReverse(
  magnets: Magnet[],
  fieldLines: FieldLine[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  for (let i = 0; i < magnets.length; i++) {
    for (let j = i + 1; j < magnets.length; j++) {
      const m1 = magnets[i];
      const m2 = magnets[j];
      
      const dist = distance(m1.position, m2.position);
      const angle = angleBetween(m1.poleDirection, m2.poleDirection);
      
      if (angle > 170 && dist < 3) {
        const affectedLines = fieldLines
          .filter(line => line.startMagnetId === m1.id || line.startMagnetId === m2.id)
          .map(line => line.id);
        
        warnings.push({
          id: `pole-reverse-${m1.id}-${m2.id}`,
          type: 'pole_reverse',
          message: `磁体 "${m1.name}" 和 "${m2.name}" 磁极接近反向（夹角 ${angle.toFixed(1)}°），可能导致场线异常扭曲`,
          affectedLines,
          affectedMagnets: [m1.id, m2.id]
        });
      }
    }
  }
  
  return warnings;
}

export function validateSampleDensity(
  density: number,
  bounds: { min: Vector3; max: Vector3 }
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const volume = 
    (bounds.max.x - bounds.min.x) * 
    (bounds.max.y - bounds.min.y) * 
    (bounds.max.z - bounds.min.z);
  
  const pointsPerUnitVolume = density / volume;
  
  if (pointsPerUnitVolume > 50) {
    warnings.push({
      id: 'sample-dense',
      type: 'sample_dense',
      message: `采样密度过高（${pointsPerUnitVolume.toFixed(1)} 点/单位体积），可能导致性能下降`,
      affectedLines: [],
      affectedMagnets: []
    });
  }
  
  return warnings;
}

export function validateFieldExplosion(
  fieldLines: FieldLine[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  if (fieldLines.length === 0) return warnings;
  
  let totalStrength = 0;
  let maxStrength = 0;
  let pointCount = 0;
  
  for (const line of fieldLines) {
    for (const point of line.points) {
      totalStrength += point.fieldStrength;
      maxStrength = Math.max(maxStrength, point.fieldStrength);
      pointCount++;
    }
  }
  
  const avgStrength = pointCount > 0 ? totalStrength / pointCount : 0;
  
  if (avgStrength > 0 && maxStrength > avgStrength * 100) {
    const affectedLines = fieldLines
      .filter(line => line.points.some(p => p.fieldStrength > avgStrength * 50))
      .map(line => line.id);
    
    warnings.push({
      id: 'field-explosion',
      type: 'field_explosion',
      message: `场强分布不均：最大值 ${maxStrength.toExponential(2)} 是平均值 ${avgStrength.toExponential(2)} 的 ${(maxStrength/avgStrength).toFixed(0)} 倍`,
      affectedLines,
      affectedMagnets: []
    });
  }
  
  return warnings;
}

export function validateAll(
  magnets: Magnet[],
  fieldLines: FieldLine[],
  sampleDensity: number,
  bounds: { min: Vector3; max: Vector3 }
): ValidationWarning[] {
  return [
    ...validatePoleReverse(magnets, fieldLines),
    ...validateSampleDensity(sampleDensity, bounds),
    ...validateFieldExplosion(fieldLines)
  ];
}
