import { Particle, OreBlock } from '@/utils/types';

export interface Vector2D {
  x: number;
  y: number;
}

export function calculateMomentum(mass: number, velocity: Vector2D): Vector2D {
  return {
    x: mass * velocity.x,
    y: mass * velocity.y,
  };
}

export function calculateTotalMomentum(
  particleMomentum: Vector2D,
  oreMomentum: Vector2D
): Vector2D {
  return {
    x: particleMomentum.x + oreMomentum.x,
    y: particleMomentum.y + oreMomentum.y,
  };
}

export function calculateMomentumMagnitude(momentum: Vector2D): number {
  return Math.sqrt(momentum.x ** 2 + momentum.y ** 2);
}

export function calculateMomentumDirection(momentum: Vector2D): number {
  return Math.atan2(momentum.y, momentum.x);
}

export function calculateMomentumError(
  before: Vector2D,
  after: Vector2D
): Vector2D {
  const beforeMag = calculateMomentumMagnitude(before);
  if (beforeMag === 0) return { x: 0, y: 0 };
  
  return {
    x: Math.abs(after.x - before.x) / beforeMag,
    y: Math.abs(after.y - before.y) / beforeMag,
  };
}

export function checkMomentumDirection(
  beforeMomentum: Vector2D,
  afterMomentum: Vector2D,
  particle: Particle,
  ore: OreBlock
): { isWrong: boolean; wrongMaterial?: string } {
  const beforeDir = calculateMomentumDirection(beforeMomentum);
  const afterDir = calculateMomentumDirection(afterMomentum);
  
  let angleDiff = Math.abs(afterDir - beforeDir);
  if (angleDiff > Math.PI) {
    angleDiff = 2 * Math.PI - angleDiff;
  }
  
  if (angleDiff > Math.PI / 3) {
    const particleMomentumAfter = calculateMomentum(particle.type.mass, { x: particle.vx, y: particle.vy });
    const oreMomentumAfter = calculateMomentum(ore.type.mass, { x: ore.vx, y: ore.vy });
    
    const particleDirAfter = calculateMomentumDirection(particleMomentumAfter);
    const particleAngleDiff = Math.abs(particleDirAfter - beforeDir);
    
    if (particleAngleDiff > Math.PI / 2) {
      return { isWrong: true, wrongMaterial: particle.type.name };
    }
    
    const oreDirAfter = calculateMomentumDirection(oreMomentumAfter);
    const oreAngleDiff = Math.abs(oreDirAfter - beforeDir);
    
    if (oreAngleDiff > Math.PI / 2) {
      return { isWrong: true, wrongMaterial: ore.type.name };
    }
    
    return { isWrong: true, wrongMaterial: '碰撞系统' };
  }
  
  return { isWrong: false };
}

export function isMomentumConserved(
  error: Vector2D,
  tolerance: number
): boolean {
  return error.x <= tolerance && error.y <= tolerance;
}

export function calculateElasticCollision2D(
  particle: { x: number; y: number; vx: number; vy: number; mass: number },
  ore: { x: number; y: number; vx: number; vy: number; mass: number },
  elasticCoefficient: number
): {
  particleVx: number;
  particleVy: number;
  oreVx: number;
  oreVy: number;
} {
  const dx = ore.x - particle.x;
  const dy = ore.y - particle.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) {
    return {
      particleVx: -particle.vx,
      particleVy: -particle.vy,
      oreVx: ore.vx,
      oreVy: ore.vy,
    };
  }
  
  const nx = dx / distance;
  const ny = dy / distance;
  
  const tx = -ny;
  const ty = nx;
  
  const particleNormalV = particle.vx * nx + particle.vy * ny;
  const particleTangentV = particle.vx * tx + particle.vy * ty;
  
  const oreNormalV = ore.vx * nx + ore.vy * ny;
  const oreTangentV = ore.vx * tx + ore.vy * ty;
  
  const m1 = particle.mass;
  const m2 = ore.mass;
  
  const particleNormalVAfter = 
    (elasticCoefficient * m2 * (oreNormalV - particleNormalV) + m1 * particleNormalV + m2 * oreNormalV) / (m1 + m2);
  
  const oreNormalVAfter = 
    (elasticCoefficient * m1 * (particleNormalV - oreNormalV) + m1 * particleNormalV + m2 * oreNormalV) / (m1 + m2);
  
  return {
    particleVx: particleNormalVAfter * nx + particleTangentV * tx,
    particleVy: particleNormalVAfter * ny + particleTangentV * ty,
    oreVx: oreNormalVAfter * nx + oreTangentV * tx,
    oreVy: oreNormalVAfter * ny + oreTangentV * ty,
  };
}
