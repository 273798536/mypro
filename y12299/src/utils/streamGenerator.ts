import { StreamLine, WindParams, StreamPoint } from '../types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function vec3Normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function getCarBounds() {
  return {
    minX: -2, maxX: 2,
    minY: 0, maxY: 0.8,
    minZ: -4, maxZ: 1,
  };
}

function isInsideCar(x: number, y: number, z: number): boolean {
  const bounds = getCarBounds();
  const carLength = bounds.maxZ - bounds.minZ;
  const carWidth = bounds.maxX - bounds.minX;
  const carHeight = bounds.maxY - bounds.minY;
  
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  
  const nx = Math.abs(x - centerX) / (carWidth / 2);
  const ny = Math.abs(y - centerY) / (carHeight / 2);
  const nz = Math.abs(z - centerZ) / (carLength / 2);
  
  const noseTaper = Math.max(0, 1 - (z - bounds.minZ) / 1.5);
  const rearTaper = Math.max(0, 1 - (bounds.maxZ - z) / 1);
  const widthFactor = 1 - 0.3 * Math.max(noseTaper, rearTaper);
  const heightFactor = 1 - 0.4 * noseTaper - 0.2 * rearTaper;
  
  return nx < widthFactor && ny < heightFactor && nz < 1;
}

function getVelocityAtPoint(
  x: number,
  y: number,
  z: number,
  windParams: WindParams
): [number, number, number] {
  const { speed, yawAngle, pitchAngle } = windParams;
  
  const yawRad = (yawAngle * Math.PI) / 180;
  const pitchRad = (pitchAngle * Math.PI) / 180;
  
  let baseVx = -speed * Math.sin(yawRad);
  let baseVy = speed * Math.sin(pitchRad);
  let baseVz = -speed * Math.cos(yawRad) * Math.cos(pitchRad);
  
  if (isInsideCar(x, y, z)) {
    return [0, 0, 0];
  }
  
  const bounds = getCarBounds();
  const influenceRadius = 3;
  
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  
  const distToCenter = Math.sqrt(
    Math.pow(x - centerX, 2) +
    Math.pow(y - centerY, 2) +
    Math.pow(z - centerZ, 2)
  );
  
  if (distToCenter < influenceRadius) {
    const influence = 1 - distToCenter / influenceRadius;
    
    const radialX = x - centerX;
    const radialZ = z - centerZ;
    const radialDist = Math.sqrt(radialX * radialX + radialZ * radialZ);
    
    if (radialDist > 0.1) {
      const tangentialX = -radialZ / radialDist;
      const tangentialZ = radialX / radialDist;
      
      const vortexStrength = speed * 0.5 * influence;
      baseVx += tangentialX * vortexStrength;
      baseVz += tangentialZ * vortexStrength;
    }
    
    if (z > bounds.maxZ && distToCenter < 2) {
      const wakeFactor = (z - bounds.maxZ) / 2;
      baseVy -= speed * 0.3 * influence * (1 - wakeFactor);
      baseVz *= 0.6 + 0.4 * wakeFactor;
      
      if (Math.random() < 0.3 * influence) {
        baseVx += (Math.random() - 0.5) * speed * 0.2;
        baseVy += (Math.random() - 0.5) * speed * 0.1;
      }
    }
    
    if (y > bounds.maxY && y < bounds.maxY + 0.5) {
      baseVy += speed * 0.2 * influence;
    }
  }
  
  const noise = (Math.random() - 0.5) * speed * 0.05;
  baseVx += noise;
  baseVy += noise * 0.5;
  baseVz += noise * 0.5;
  
  return [baseVx, baseVy, baseVz];
}

function velocityToColor(vx: number, vy: number, vz: number, speed: number): string {
  const magnitude = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const normalizedSpeed = Math.min(magnitude / (speed * 1.5), 1);
  
  const r = Math.round(lerp(0, 255, normalizedSpeed * 0.8));
  const g = Math.round(lerp(210, 160, normalizedSpeed));
  const b = Math.round(lerp(255, 200, normalizedSpeed * 0.5));
  
  return `rgb(${r}, ${g}, ${b})`;
}

export function generateStreamLines(windParams: WindParams): StreamLine[] {
  const streamLines: StreamLine[] = [];
  const numLines = 40;
  const numSteps = 80;
  const stepSize = 0.15;
  
  const startXs = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
  const startYs = [0.2, 0.5, 0.8, 1.1];
  const startZ = 4;
  
  let lineIndex = 0;
  
  for (const startX of startXs) {
    for (const startY of startYs) {
      const points: StreamPoint[] = [];
      
      let x = startX + (Math.random() - 0.5) * 0.3;
      let y = startY + (Math.random() - 0.5) * 0.2;
      let z = startZ;
      
      for (let step = 0; step < numSteps; step++) {
        const [vx, vy, vz] = getVelocityAtPoint(x, y, z, windParams);
        
        const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
        const direction = vec3Normalize([vx, vy, vz]);
        
        points.push({
          x,
          y,
          z,
          velocity: speed,
          direction,
        });
        
        if (speed < 0.01) break;
        
        x += vx * stepSize / Math.max(speed, 0.5);
        y += vy * stepSize / Math.max(speed, 0.5);
        z += vz * stepSize / Math.max(speed, 0.5);
        
        if (z < -6 || z > 6 || Math.abs(x) > 5 || y < -0.5 || y > 4) break;
        if (isInsideCar(x, y, z)) break;
      }
      
      if (points.length >= 5) {
        const avgVx = points.reduce((sum, p) => sum + p.direction[0] * p.velocity, 0) / points.length;
        const avgVy = points.reduce((sum, p) => sum + p.direction[1] * p.velocity, 0) / points.length;
        const avgVz = points.reduce((sum, p) => sum + p.direction[2] * p.velocity, 0) / points.length;
        
        streamLines.push({
          id: `line-${lineIndex}`,
          points,
          color: velocityToColor(avgVx, avgVy, avgVz, windParams.speed),
          startPosition: [startX, startY, startZ],
        });
        lineIndex++;
      }
      
      if (lineIndex >= numLines) break;
    }
    if (lineIndex >= numLines) break;
  }
  
  return streamLines;
}
