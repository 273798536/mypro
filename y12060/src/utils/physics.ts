export interface PhysicsState {
  position: { x: number; y: number; z: number };
  rotation: number;
  speed: number;
  steeringAngle: number;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  liftUp: boolean;
  liftDown: boolean;
}

export interface PhysicsConfig {
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  turnSpeed: number;
  maxSteeringAngle: number;
  friction: number;
  turnRadius: number;
  wheelBase: number;
}

const DEFAULT_CONFIG: PhysicsConfig = {
  maxSpeed: 15,
  acceleration: 8,
  deceleration: 15,
  turnSpeed: 2.5,
  maxSteeringAngle: Math.PI / 4,
  friction: 0.95,
  turnRadius: 2.2,
  wheelBase: 2.0
};

export function updatePhysics(
  state: PhysicsState,
  input: InputState,
  forkHeight: number,
  deltaTime: number,
  config: Partial<PhysicsConfig> = {}
): PhysicsState & { forkHeight: number } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const dt = Math.min(deltaTime, 0.05);
  
  let { speed, steeringAngle } = state;
  let { x, y, z } = state.position;
  let rotation = state.rotation;
  let newForkHeight = forkHeight;
  
  if (input.forward) {
    speed = Math.min(speed + cfg.acceleration * dt, cfg.maxSpeed);
  } else if (input.backward) {
    speed = Math.max(speed - cfg.acceleration * dt, -cfg.maxSpeed * 0.5);
  } else {
    if (Math.abs(speed) < 0.1) {
      speed = 0;
    } else if (speed > 0) {
      speed = Math.max(0, speed - cfg.deceleration * dt);
    } else {
      speed = Math.min(0, speed + cfg.deceleration * dt);
    }
  }
  
  speed *= cfg.friction;
  
  if (input.left) {
    steeringAngle = Math.max(steeringAngle - cfg.turnSpeed * dt, -cfg.maxSteeringAngle);
  } else if (input.right) {
    steeringAngle = Math.min(steeringAngle + cfg.turnSpeed * dt, cfg.maxSteeringAngle);
  } else {
    if (steeringAngle > 0.05) {
      steeringAngle = Math.max(0, steeringAngle - cfg.turnSpeed * dt * 0.5);
    } else if (steeringAngle < -0.05) {
      steeringAngle = Math.min(0, steeringAngle + cfg.turnSpeed * dt * 0.5);
    } else {
      steeringAngle = 0;
    }
  }
  
  if (Math.abs(speed) > 0.01 && Math.abs(steeringAngle) > 0.01) {
    const turnFactor = speed > 0 ? 1 : -1;
    rotation += steeringAngle * turnFactor * Math.abs(speed) * dt * 0.5;
  }
  
  const moveSpeed = speed * dt;
  x += Math.sin(rotation) * moveSpeed;
  z += Math.cos(rotation) * moveSpeed;
  
  if (input.liftUp) {
    newForkHeight = Math.min(newForkHeight + 2 * dt, 6.0);
  } else if (input.liftDown) {
    newForkHeight = Math.max(newForkHeight - 2 * dt, 0);
  }
  
  const boundary = 18;
  x = Math.max(-boundary, Math.min(boundary, x));
  z = Math.max(-boundary, Math.min(boundary, z));
  
  return {
    position: { x, y, z },
    rotation,
    speed,
    steeringAngle,
    forkHeight: newForkHeight
  };
}

export function getTurningRadius(speed: number, steeringAngle: number, baseRadius: number): number {
  if (Math.abs(steeringAngle) < 0.01) return Infinity;
  return baseRadius / Math.abs(Math.sin(steeringAngle));
}

export function getStoppingDistance(speed: number, deceleration: number = 15): number {
  return (speed * speed) / (2 * deceleration);
}

export function getSpeedKmh(speedMetersPerSecond: number): number {
  return speedMetersPerSecond * 3.6;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}
