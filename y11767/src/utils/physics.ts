import { Vector3 } from 'three';
import { Ball, PhysicsError } from '../types';

export const PARAM_BOUNDS = {
  mass: { min: 0.1, max: 10.0, unit: 'kg' },
  velocity: { min: 0, max: 10.0, unit: 'm/s' },
  friction: { min: 0, max: 1.0, unit: '' },
  radius: { min: 0.1, max: 1.0, unit: 'm' },
};

export const MOMENTUM_CONSERVATION_THRESHOLD = 0.01;
export const PENETRATION_THRESHOLD = 0.1;

export function calculateMomentum(ball: Ball): Vector3 {
  return ball.velocity.clone().multiplyScalar(ball.mass);
}

export function calculateTotalMomentum(balls: Ball[]): Vector3 {
  return balls.reduce((total, ball) => {
    return total.add(calculateMomentum(ball));
  }, new Vector3(0, 0, 0));
}

export function calculateKineticEnergy(ball: Ball): number {
  const speedSq = ball.velocity.lengthSq();
  return 0.5 * ball.mass * speedSq;
}

export function calculateTotalKineticEnergy(balls: Ball[]): number {
  return balls.reduce((total, ball) => total + calculateKineticEnergy(ball), 0);
}

export function elasticCollision2D(ball1: Ball, ball2: Ball): [Vector3, Vector3] {
  const normal = new Vector3().subVectors(ball2.position, ball1.position).normalize();
  const tangent = new Vector3(-normal.z, 0, normal.x);

  const v1n = normal.dot(ball1.velocity);
  const v1t = tangent.dot(ball1.velocity);
  const v2n = normal.dot(ball2.velocity);
  const v2t = tangent.dot(ball2.velocity);

  const m1 = ball1.mass;
  const m2 = ball2.mass;

  const v1nPrime = ((m1 - m2) * v1n + 2 * m2 * v2n) / (m1 + m2);
  const v2nPrime = ((m2 - m1) * v2n + 2 * m1 * v1n) / (m1 + m2);

  const v1nPrimeVec = normal.clone().multiplyScalar(v1nPrime);
  const v1tPrimeVec = tangent.clone().multiplyScalar(v1t);
  const v2nPrimeVec = normal.clone().multiplyScalar(v2nPrime);
  const v2tPrimeVec = tangent.clone().multiplyScalar(v2t);

  return [
    new Vector3().addVectors(v1nPrimeVec, v1tPrimeVec),
    new Vector3().addVectors(v2nPrimeVec, v2tPrimeVec),
  ];
}

export function checkBallCollision(ball1: Ball, ball2: Ball): boolean {
  const distance = ball1.position.distanceTo(ball2.position);
  return distance <= ball1.radius + ball2.radius;
}

export function checkPenetration(ball1: Ball, ball2: Ball): { penetrated: boolean; depth: number } {
  const distance = ball1.position.distanceTo(ball2.position);
  const minDistance = ball1.radius + ball2.radius;
  const depth = minDistance - distance;
  return {
    penetrated: depth > PENETRATION_THRESHOLD * Math.min(ball1.radius, ball2.radius),
    depth,
  };
}

export function separateBalls(ball1: Ball, ball2: Ball): void {
  const normal = new Vector3().subVectors(ball2.position, ball1.position).normalize();
  const distance = ball1.position.distanceTo(ball2.position);
  const minDistance = ball1.radius + ball2.radius;
  const overlap = minDistance - distance;

  if (overlap > 0) {
    const separation = normal.clone().multiplyScalar(overlap / 2 + 0.001);
    ball1.position.sub(separation);
    ball2.position.add(separation);
  }
}

export function checkWallCollision(
  ball: Ball,
  tableWidth: number,
  tableHeight: number
): { collided: boolean; newVelocity: Vector3 } {
  const newVel = ball.velocity.clone();
  let collided = false;

  const halfW = tableWidth / 2 - ball.radius;
  const halfH = tableHeight / 2 - ball.radius;

  if (ball.position.x >= halfW || ball.position.x <= -halfW) {
    newVel.x *= -1;
    ball.position.x = Math.max(-halfW, Math.min(halfW, ball.position.x));
    collided = true;
  }

  if (ball.position.z >= halfH || ball.position.z <= -halfH) {
    newVel.z *= -1;
    ball.position.z = Math.max(-halfH, Math.min(halfH, ball.position.z));
    collided = true;
  }

  return { collided, newVelocity: newVel };
}

export function applyFriction(velocity: Vector3, friction: number, dt: number): Vector3 {
  const speed = velocity.length();
  if (speed < 0.01) return new Vector3(0, 0, 0);

  const frictionForce = friction * 9.8 * dt;
  const newSpeed = Math.max(0, speed - frictionForce);

  if (newSpeed === 0) return new Vector3(0, 0, 0);
  return velocity.clone().normalize().multiplyScalar(newSpeed);
}

export function validateParameter(
  value: number,
  paramName: keyof typeof PARAM_BOUNDS,
  sourceLocation: string,
  ballId?: string
): PhysicsError | null {
  const bounds = PARAM_BOUNDS[paramName];
  if (value < bounds.min || value > bounds.max) {
    return {
      id: `param-error-${Date.now()}-${Math.random()}`,
      type: 'param_out_of_bounds',
      message: `${paramName} 参数 ${value.toFixed(3)} ${bounds.unit} 超出范围 [${bounds.min}, ${bounds.max}]`,
      timestamp: Date.now(),
      sourceLocation,
      ballIds: ballId ? [ballId] : [],
      severity: 'error',
      data: { value, min: bounds.min, max: bounds.max, paramName },
    };
  }
  return null;
}

export function checkMomentumConservation(
  initialMomentum: Vector3,
  currentMomentum: Vector3,
  sourceLocation: string,
  ballIds: string[]
): PhysicsError | null {
  const initialMag = initialMomentum.length();
  const currentMag = currentMomentum.length();

  if (initialMag < 0.001) return null;

  const change = Math.abs(currentMag - initialMag) / initialMag;

  if (change > MOMENTUM_CONSERVATION_THRESHOLD) {
    const direction = currentMag > initialMag ? '增加' : '减少';
    return {
      id: `momentum-error-${Date.now()}-${Math.random()}`,
      type: 'momentum_gain',
      message: `总动量${direction}: ${(change * 100).toFixed(2)}% (阈值: ${MOMENTUM_CONSERVATION_THRESHOLD * 100}%)`,
      timestamp: Date.now(),
      sourceLocation,
      ballIds,
      severity: change > 0.05 ? 'error' : 'warning',
      data: {
        initial: initialMag,
        current: currentMag,
        changePercent: change * 100,
      },
    };
  }
  return null;
}

export function checkPenetrationError(
  ball1: Ball,
  ball2: Ball,
  sourceLocation: string
): PhysicsError | null {
  const { penetrated, depth } = checkPenetration(ball1, ball2);
  if (penetrated) {
    return {
      id: `penetration-error-${Date.now()}-${Math.random()}`,
      type: 'penetration',
      message: `球体穿透检测: 嵌入深度 ${depth.toFixed(4)}m`,
      timestamp: Date.now(),
      sourceLocation,
      ballIds: [ball1.id, ball2.id],
      severity: 'error',
      data: { depth, ball1: ball1.label, ball2: ball2.label },
    };
  }
  return null;
}

export function formatVector(v: Vector3): string {
  return `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
}

export function vectorToObject(v: Vector3) {
  return {
    x: v.x,
    y: v.y,
    z: v.z,
    magnitude: v.length(),
  };
}
