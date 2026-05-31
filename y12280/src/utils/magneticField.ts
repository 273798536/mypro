import { Vector3, Magnet, FieldLine, FieldLinePoint, SamplePoint } from '@/types';

const MU0 = 4 * Math.PI * 1e-7;

function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function scale(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function add(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function length(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function distance(a: Vector3, b: Vector3): number {
  return length(sub(a, b));
}

export function calculateDipoleField(
  point: Vector3,
  magnet: Magnet
): Vector3 {
  const r = sub(point, magnet.position);
  const rMag = length(r);
  
  if (rMag < 0.1) {
    return { x: 0, y: 0, z: 0 };
  }
  
  const m = scale(normalize(magnet.poleDirection), magnet.strength);
  const rNorm = scale(r, 1 / rMag);
  
  const term1 = scale(rNorm, 3 * dot(m, rNorm));
  const term2 = sub(term1, m);
  const factor = MU0 / (4 * Math.PI * Math.pow(rMag, 3));
  
  return scale(term2, factor);
}

export function calculateTotalField(
  point: Vector3,
  magnets: Magnet[]
): { field: Vector3; strength: number; affectedBy: string[] } {
  let totalField: Vector3 = { x: 0, y: 0, z: 0 };
  const affectedBy: string[] = [];
  
  for (const magnet of magnets) {
    const field = calculateDipoleField(point, magnet);
    const fieldStrength = length(field);
    
    if (fieldStrength > 1e-10) {
      totalField = add(totalField, field);
      affectedBy.push(magnet.id);
    }
  }
  
  const totalStrength = length(totalField);
  
  return {
    field: totalField,
    strength: totalStrength,
    affectedBy
  };
}

export function traceFieldLine(
  startPoint: Vector3,
  magnets: Magnet[],
  direction: 1 | -1 = 1,
  maxSteps: number = 200,
  stepSize: number = 0.05
): FieldLinePoint[] {
  const points: FieldLinePoint[] = [];
  let currentPoint = { ...startPoint };
  
  for (let i = 0; i < maxSteps; i++) {
    const { field, strength, affectedBy } = calculateTotalField(currentPoint, magnets);
    
    if (strength < 1e-12 || strength > 1e10) {
      break;
    }
    
    points.push({
      position: { ...currentPoint },
      fieldStrength: strength
    });
    
    const dir = scale(normalize(field), direction * stepSize);
    currentPoint = add(currentPoint, dir);
    
    let nearMagnet = false;
    for (const magnet of magnets) {
      if (distance(currentPoint, magnet.position) < 0.15) {
        nearMagnet = true;
        break;
      }
    }
    
    if (nearMagnet) {
      points.push({
        position: { ...currentPoint },
        fieldStrength: strength
      });
      break;
    }
    
    if (Math.abs(currentPoint.x) > 10 || 
        Math.abs(currentPoint.y) > 10 || 
        Math.abs(currentPoint.z) > 10) {
      break;
    }
  }
  
  return points;
}

export function generateFieldLines(
  magnets: Magnet[],
  linesPerMagnet: number = 8
): FieldLine[] {
  const fieldLines: FieldLine[] = [];
  let lineId = 0;
  
  for (const magnet of magnets) {
    const poleDir = normalize(magnet.poleDirection);
    const perp1 = normalize({
      x: poleDir.y,
      y: -poleDir.x,
      z: 0
    });
    const perp2 = {
      x: poleDir.y * perp1.z - poleDir.z * perp1.y,
      y: poleDir.z * perp1.x - poleDir.x * perp1.z,
      z: poleDir.x * perp1.y - poleDir.y * perp1.x
    };
    
    for (let i = 0; i < linesPerMagnet; i++) {
      const angle = (i / linesPerMagnet) * 2 * Math.PI;
      const offset = add(
        scale(perp1, 0.15 * Math.cos(angle)),
        scale(perp2, 0.15 * Math.sin(angle))
      );
      
      const nStart = add(
        add(magnet.position, scale(poleDir, 0.25)),
        offset
      );
      const sStart = add(
        add(magnet.position, scale(poleDir, -0.25)),
        offset
      );
      
      const nPoints = traceFieldLine(nStart, magnets, 1);
      const sPoints = traceFieldLine(sStart, magnets, -1);
      
      if (nPoints.length > 5) {
        fieldLines.push({
          id: `line-${lineId++}`,
          points: nPoints,
          startMagnetId: magnet.id
        });
      }
      
      if (sPoints.length > 5) {
        fieldLines.push({
          id: `line-${lineId++}`,
          points: sPoints,
          startMagnetId: magnet.id
        });
      }
    }
  }
  
  return fieldLines;
}

export function generateSamplePoints(
  bounds: { min: Vector3; max: Vector3 },
  density: number
): SamplePoint[] {
  const points: SamplePoint[] = [];
  const step = 1 / Math.sqrt(density);
  let id = 0;
  
  for (let x = bounds.min.x; x <= bounds.max.x; x += step) {
    for (let y = bounds.min.y; y <= bounds.max.y; y += step) {
      for (let z = bounds.min.z; z <= bounds.max.z; z += step) {
        points.push({
          id: `sample-${id++}`,
          position: { x, y, z },
          fieldStrength: 0,
          fieldDirection: { x: 0, y: 0, z: 0 },
          affectedBy: []
        });
      }
    }
  }
  
  return points;
}

export function updateSamplePoints(
  points: SamplePoint[],
  magnets: Magnet[]
): SamplePoint[] {
  return points.map(point => {
    const { field, strength, affectedBy } = calculateTotalField(point.position, magnets);
    return {
      ...point,
      fieldStrength: strength,
      fieldDirection: field,
      affectedBy
    };
  });
}
