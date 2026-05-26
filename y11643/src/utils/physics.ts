import type { RocketState, EnvironmentState } from '../types/game';
import { GAME_CONFIG } from '../types/game';

export interface PhysicsUpdateResult {
  rocket: RocketState;
  warnings: string[];
}

export function updatePhysics(
  rocket: RocketState,
  env: EnvironmentState,
  dt: number,
  thrustInput: number
): PhysicsUpdateResult {
  const warnings: string[] = [];
  const newRocket = { ...rocket };

  const effectiveThrust = thrustInput * rocket.maxThrust;
  newRocket.thrust = effectiveThrust;

  if (effectiveThrust > rocket.maxThrust * 0.95) {
    warnings.push('推力接近极限！注意控制');
  }

  const fuelConsumption = thrustInput * GAME_CONFIG.FUEL_CONSUMPTION_RATE * dt;
  newRocket.fuel = Math.max(0, newRocket.fuel - fuelConsumption);

  if (newRocket.fuel <= 0 && thrustInput > 0) {
    warnings.push('燃料不足！推力失效');
  }

  const actualThrust = newRocket.fuel > 0 ? effectiveThrust : 0;

  const angleRad = (rocket.angle * Math.PI) / 180;
  const thrustAx = actualThrust * Math.sin(angleRad);
  const thrustAy = -actualThrust * Math.cos(angleRad);

  const windForce = env.windSpeed * env.windDirection * 0.5;
  const windAx = windForce;

  const gravityAy = env.gravity;

  const totalAx = thrustAx + windAx;
  const totalAy = thrustAy + gravityAy;

  newRocket.vx += totalAx * dt;
  newRocket.vy += totalAy * dt;

  const windTorque = env.windSpeed * env.windDirection * 0.1;
  newRocket.angularVelocity += windTorque * dt;
  newRocket.angularVelocity *= 0.98;
  newRocket.angle += newRocket.angularVelocity * dt;

  newRocket.x += newRocket.vx * dt * 10;
  newRocket.y += newRocket.vy * dt * 10;

  if (Math.abs(newRocket.vx) > GAME_CONFIG.SAFE_LANDING_VX * 2) {
    warnings.push('横向速度过大警告！');
  }

  return { rocket: newRocket, warnings };
}

export function checkLandingConditions(
  rocket: RocketState,
  env: EnvironmentState
): {
  canLandSafely: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (Math.abs(rocket.vy) > GAME_CONFIG.SAFE_LANDING_VY) {
    violations.push(`下降速度 ${Math.abs(rocket.vy).toFixed(1)} m/s 超标`);
  }

  if (Math.abs(rocket.vx) > GAME_CONFIG.SAFE_LANDING_VX) {
    violations.push(`横向速度 ${Math.abs(rocket.vx).toFixed(1)} m/s 超标`);
  }

  if (Math.abs(rocket.angle) > GAME_CONFIG.SAFE_LANDING_ANGLE) {
    violations.push(`姿态角 ${Math.abs(rocket.angle).toFixed(1)}° 超标`);
  }

  const platformLeft = env.platformX - env.platformWidth / 2;
  const platformRight = env.platformX + env.platformWidth / 2;

  if (rocket.x < platformLeft || rocket.x > platformRight) {
    violations.push('未在着陆平台范围内');
  }

  return {
    canLandSafely: violations.length === 0,
    violations,
  };
}

export function calculateLandingAccuracy(
  rocketX: number,
  platformX: number,
  platformWidth: number
): number {
  const distance = Math.abs(rocketX - platformX);
  const maxDistance = platformWidth / 2;
  const accuracy = Math.max(0, 1 - distance / maxDistance);
  return accuracy * 100;
}

export function generateWind(
  currentWind: number,
  currentDirection: number,
  dt: number
): { speed: number; direction: number } {
  const windChange = (Math.random() - 0.5) * 0.5 * dt;
  let newWind = currentWind + windChange;
  newWind = Math.max(-GAME_CONFIG.MAX_WIND_SPEED, Math.min(GAME_CONFIG.MAX_WIND_SPEED, newWind));

  let newDirection = currentDirection;
  if (Math.random() < 0.01) {
    newDirection = Math.random() > 0.5 ? 1 : -1;
  }

  return { speed: newWind, direction: newDirection };
}

export function createInitialRocket(canvasWidth: number): RocketState {
  return {
    x: canvasWidth / 2,
    y: 100,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    fuel: GAME_CONFIG.MAX_FUEL,
    maxFuel: GAME_CONFIG.MAX_FUEL,
    thrust: 0,
    maxThrust: GAME_CONFIG.MAX_THRUST,
  };
}

export function createInitialEnvironment(
  canvasWidth: number,
  canvasHeight: number
): EnvironmentState {
  const groundY = canvasHeight - 50;
  return {
    gravity: GAME_CONFIG.GRAVITY,
    windSpeed: 0,
    windDirection: 1,
    platformX: canvasWidth / 2,
    platformY: groundY - 10,
    platformWidth: GAME_CONFIG.PLATFORM_WIDTH,
    groundY,
  };
}
