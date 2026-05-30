import type { Vector2D, MagneticDirection, CurrentDirection } from '@/types';

export const MAX_ENERGY_THRESHOLD = 5000;

export function calculateLorentzForce(
  velocity: Vector2D,
  charge: number,
  magneticField: { direction: MagneticDirection; strength: number }
): Vector2D {
  const { direction, strength } = magneticField;
  
  let bVector: Vector2D;
  switch (direction) {
    case 'up':
      bVector = { x: 0, y: strength };
      break;
    case 'down':
      bVector = { x: 0, y: -strength };
      break;
    case 'left':
      bVector = { x: -strength, y: 0 };
      break;
    case 'right':
      bVector = { x: strength, y: 0 };
      break;
  }
  
  const fz = charge * (velocity.x * bVector.y - velocity.y * bVector.x);
  
  return {
    x: fz * (bVector.y !== 0 ? 1 : 0),
    y: -fz * (bVector.x !== 0 ? 1 : 0)
  };
}

export function getExpectedForceDirection(
  currentDirection: CurrentDirection,
  magneticDirection: MagneticDirection
): string {
  const currentMap: Record<CurrentDirection, Vector2D> = {
    positive: { x: 1, y: 0 },
    negative: { x: -1, y: 0 }
  };
  
  const magneticMap: Record<MagneticDirection, Vector2D> = {
    up: { x: 0, y: 1 },
    down: { x: 0, y: -1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  
  const v = currentMap[currentDirection];
  const b = magneticMap[magneticDirection];
  
  const crossZ = v.x * b.y - v.y * b.x;
  
  if (crossZ > 0) return '向上偏转';
  if (crossZ < 0) return '向下偏转';
  return '无偏转';
}

export function calculateKineticEnergy(mass: number, velocity: Vector2D): number {
  const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
  return 0.5 * mass * speed ** 2;
}

export function calculateAcceleration(force: Vector2D, mass: number): Vector2D {
  if (mass <= 0) return { x: 0, y: 0 };
  return {
    x: force.x / mass,
    y: force.y / mass
  };
}

export function updateVelocity(
  velocity: Vector2D,
  acceleration: Vector2D,
  deltaTime: number
): Vector2D {
  return {
    x: velocity.x + acceleration.x * deltaTime,
    y: velocity.y + acceleration.y * deltaTime
  };
}

export function updatePosition(
  position: Vector2D,
  velocity: Vector2D,
  deltaTime: number
): Vector2D {
  return {
    x: position.x + velocity.x * deltaTime,
    y: position.y + velocity.y * deltaTime
  };
}

export function checkDirectionError(
  actualForce: Vector2D,
  expectedDirection: string
): boolean {
  const actualUpward = actualForce.y > 0;
  const actualDownward = actualForce.y < 0;
  
  if (expectedDirection === '向上偏转' && actualDownward) return true;
  if (expectedDirection === '向下偏转' && actualUpward) return true;
  
  return false;
}

export function checkEnergyOverlimit(energy: number): boolean {
  return energy > MAX_ENERGY_THRESHOLD;
}

export function checkMassInvalid(mass: number): boolean {
  return mass <= 0 || mass > 100;
}
