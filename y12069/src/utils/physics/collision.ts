import { Particle, OreBlock } from '@/utils/types';
import { PHYSICS_CONSTANTS } from '@/utils/constants';

export interface CollisionPoint {
  x: number;
  y: number;
  normalX: number;
  normalY: number;
}

export function checkParticleOreCollision(
  particle: Particle,
  ore: OreBlock
): { collided: boolean; point: CollisionPoint | null } {
  if (ore.collected) {
    return { collided: false, point: null };
  }
  
  const radius = PHYSICS_CONSTANTS.PARTICLE_RADIUS;
  const closestX = Math.max(ore.x, Math.min(particle.x, ore.x + ore.width));
  const closestY = Math.max(ore.y, Math.min(particle.y, ore.y + ore.height));
  
  const distanceX = particle.x - closestX;
  const distanceY = particle.y - closestY;
  const distanceSquared = distanceX * distanceX + distanceY * distanceY;
  
  if (distanceSquared < radius * radius) {
    const distance = Math.sqrt(distanceSquared) || 1;
    return {
      collided: true,
      point: {
        x: closestX,
        y: closestY,
        normalX: distanceX / distance,
        normalY: distanceY / distance,
      },
    };
  }
  
  return { collided: false, point: null };
}

export function checkParticleBoundaryCollision(
  particle: Particle,
  canvasWidth: number,
  canvasHeight: number
): { collided: boolean; side: 'left' | 'right' | 'top' | 'bottom' | null } {
  const radius = PHYSICS_CONSTANTS.PARTICLE_RADIUS;
  
  if (particle.x - radius <= 0) return { collided: true, side: 'left' };
  if (particle.x + radius >= canvasWidth) return { collided: true, side: 'right' };
  if (particle.y - radius <= 0) return { collided: true, side: 'top' };
  if (particle.y + radius >= canvasHeight) return { collided: true, side: 'bottom' };
  
  return { collided: false, side: null };
}

export function checkAllCollisions(
  particles: Particle[],
  oreBlocks: OreBlock[],
  canvasWidth: number,
  canvasHeight: number
): {
  particleOreCollisions: { particle: Particle; ore: OreBlock; point: CollisionPoint }[];
  boundaryCollisions: { particle: Particle; side: 'left' | 'right' | 'top' | 'bottom' }[];
} {
  const particleOreCollisions: { particle: Particle; ore: OreBlock; point: CollisionPoint }[] = [];
  const boundaryCollisions: { particle: Particle; side: 'left' | 'right' | 'top' | 'bottom' }[] = [];
  
  for (const particle of particles) {
    if (!particle.active) continue;
    
    const boundaryCheck = checkParticleBoundaryCollision(particle, canvasWidth, canvasHeight);
    if (boundaryCheck.collided && boundaryCheck.side) {
      boundaryCollisions.push({ particle, side: boundaryCheck.side });
      particle.active = false;
    }
    
    for (const ore of oreBlocks) {
      const collision = checkParticleOreCollision(particle, ore);
      if (collision.collided && collision.point) {
        particleOreCollisions.push({ particle, ore, point: collision.point });
        break;
      }
    }
  }
  
  return { particleOreCollisions, boundaryCollisions };
}

export function resolveBoundaryCollision(
  particle: Particle,
  side: 'left' | 'right' | 'top' | 'bottom',
  elasticCoefficient: number
): Particle {
  const newParticle = { ...particle };
  
  switch (side) {
    case 'left':
    case 'right':
      newParticle.vx = -particle.vx * elasticCoefficient;
      break;
    case 'top':
    case 'bottom':
      newParticle.vy = -particle.vy * elasticCoefficient;
      break;
  }
  
  return newParticle;
}
