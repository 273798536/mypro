import type { TrajectoryParams, TrajectoryPoint, TrajectoryResult, TrajectoryLanding, TrajectoryApex } from '@/types/trajectory';
import {
  GRAVITY,
  GOLF_BALL_MASS,
  GOLF_BALL_RADIUS,
  GOLF_BALL_CROSS_SECTION_AREA,
  DRAG_COEFFICIENT,
  MAGNUS_COEFFICIENT,
  MAX_FLIGHT_TIME,
  TIME_STEP,
  COURSE_BOUNDARY,
  getAirDensity,
  rpmToRadPerSec,
} from './constants';
import { convertToMs, normalizeAngle } from '@/utils/unitConverter';

interface State {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

function derivatives(
  state: State,
  rho: number,
  windVx: number,
  windVz: number,
  backspinRad: number,
  sidespinRad: number,
): State {
  const { x, y, z, vx, vy, vz } = state;

  const relVx = vx - windVx;
  const relVy = vy;
  const relVz = vz - windVz;

  const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz);

  let ax = 0;
  let ay = -GRAVITY;
  let az = 0;

  if (relSpeed > 0.01) {
    const dragMag = 0.5 * rho * relSpeed * DRAG_COEFFICIENT * GOLF_BALL_CROSS_SECTION_AREA / GOLF_BALL_MASS;
    ax -= dragMag * relVx / relSpeed;
    ay -= dragMag * relVy / relSpeed;
    az -= dragMag * relVz / relSpeed;

    const angularVelX = sidespinRad;
    const angularVelY = backspinRad;
    const angularVelZ = 0;

    const liftCoef = MAGNUS_COEFFICIENT * rho * GOLF_BALL_CROSS_SECTION_AREA * GOLF_BALL_RADIUS / GOLF_BALL_MASS;

    const liftX = liftCoef * (angularVelY * relVz - angularVelZ * relVy);
    const liftY = liftCoef * (angularVelZ * relVx - angularVelX * relVz);
    const liftZ = liftCoef * (angularVelX * relVy - angularVelY * relVx);

    ax += liftX;
    ay += liftY;
    az += liftZ;
  }

  return { x: vx, y: vy, z: vz, vx: ax, vy: ay, vz: az };
}

function rk4Step(state: State, dt: number, rho: number, windVx: number, windVz: number, backspinRad: number, sidespinRad: number): State {
  const k1 = derivatives(state, rho, windVx, windVz, backspinRad, sidespinRad);
  const s2: State = {
    x: state.x + k1.x * dt / 2,
    y: state.y + k1.y * dt / 2,
    z: state.z + k1.z * dt / 2,
    vx: state.vx + k1.vx * dt / 2,
    vy: state.vy + k1.vy * dt / 2,
    vz: state.vz + k1.vz * dt / 2,
  };
  const k2 = derivatives(s2, rho, windVx, windVz, backspinRad, sidespinRad);
  const s3: State = {
    x: state.x + k2.x * dt / 2,
    y: state.y + k2.y * dt / 2,
    z: state.z + k2.z * dt / 2,
    vx: state.vx + k2.vx * dt / 2,
    vy: state.vy + k2.vy * dt / 2,
    vz: state.vz + k2.vz * dt / 2,
  };
  const k3 = derivatives(s3, rho, windVx, windVz, backspinRad, sidespinRad);
  const s4: State = {
    x: state.x + k3.x * dt,
    y: state.y + k3.y * dt,
    z: state.z + k3.z * dt,
    vx: state.vx + k3.vx * dt,
    vy: state.vy + k3.vy * dt,
    vz: state.vz + k3.vz * dt,
  };
  const k4 = derivatives(s4, rho, windVx, windVz, backspinRad, sidespinRad);

  return {
    x: state.x + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y: state.y + (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    z: state.z + (dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
    vx: state.vx + (dt / 6) * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx),
    vy: state.vy + (dt / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy),
    vz: state.vz + (dt / 6) * (k1.vz + 2 * k2.vz + 2 * k3.vz + k4.vz),
  };
}

export function calculateTrajectory(params: TrajectoryParams): TrajectoryResult {
  const calcStart = performance.now();

  const speedMs = convertToMs(params.ballSpeed, params.ballSpeedUnit);
  const windMs = convertToMs(params.windSpeed, params.windSpeedUnit);
  const windRad = (params.windDirection * Math.PI) / 180;
  const launchRad = (params.launchAngle * Math.PI) / 180;
  const directionRad = (params.launchDirection * Math.PI) / 180;

  const vx = speedMs * Math.cos(launchRad) * Math.sin(directionRad);
  const vy = speedMs * Math.sin(launchRad);
  const vz = speedMs * Math.cos(launchRad) * Math.cos(directionRad);

  const windVx = windMs * Math.cos(windRad);
  const windVz = windMs * Math.sin(windRad);

  const backspinRad = rpmToRadPerSec(params.backspin);
  const sidespinRad = rpmToRadPerSec(params.sidespin);

  const rho = getAirDensity(params.temperature, params.humidity, params.altitude);

  const points: TrajectoryPoint[] = [];
  let state: State = { x: 0, y: 0.02, z: 0, vx, vy, vz };
  let t = 0;

  let apex: TrajectoryApex = { height: 0, distance: 0, time: 0 };
  let maxY = 0;
  let landed = false;
  let landing: TrajectoryLanding = {
    x: 0,
    z: 0,
    distance: 0,
    carry: 0,
    roll: 0,
    outOfBounds: false,
  };

  const maxSteps = Math.ceil(MAX_FLIGHT_TIME / TIME_STEP);

  for (let i = 0; i < maxSteps && !landed; i++) {
    const prevY = state.y;
    state = rk4Step(state, TIME_STEP, rho, windVx, windVz, backspinRad, sidespinRad);
    t += TIME_STEP;

    if (state.y > maxY) {
      maxY = state.y;
      apex = {
        height: maxY,
        distance: Math.sqrt(state.x * state.x + state.z * state.z),
        time: t,
      };
    }

    points.push({
      x: state.x,
      y: state.y,
      z: state.z,
      t,
      vx: state.vx,
      vy: state.vy,
      vz: state.vz,
    });

    if (prevY > 0 && state.y <= 0 && t > 0.1) {
      const frac = prevY / (prevY - state.y);
      const landX = state.x - (state.vx * TIME_STEP) * (1 - frac);
      const landZ = state.z - (state.vz * TIME_STEP) * (1 - frac);
      const landT = t - (1 - frac) * TIME_STEP;

      const carry = Math.sqrt(landX * landX + landZ * landZ);
      const impactSpeed = Math.sqrt(state.vx * state.vx + state.vy * state.vy + state.vz * state.vz);
      const rollDist = Math.min(impactSpeed * 0.15, 30);

      landing = {
        x: landX,
        z: landZ,
        distance: carry + rollDist,
        carry,
        roll: rollDist,
        outOfBounds: false,
      };

      if (landX < COURSE_BOUNDARY.minX || landX > COURSE_BOUNDARY.maxX || landZ < COURSE_BOUNDARY.minZ || landZ > COURSE_BOUNDARY.maxZ) {
        landing.outOfBounds = true;
        const reasons: string[] = [];
        if (landX < COURSE_BOUNDARY.minX) reasons.push(`横向落点 ${landX.toFixed(1)}米 超出左边界(${COURSE_BOUNDARY.minX}米)`);
        if (landX > COURSE_BOUNDARY.maxX) reasons.push(`横向落点 ${landX.toFixed(1)}米 超出右边界(${COURSE_BOUNDARY.maxX}米)`);
        if (landZ < COURSE_BOUNDARY.minZ) reasons.push(`纵向落点 ${landZ.toFixed(1)}米 超出近端边界`);
        if (landZ > COURSE_BOUNDARY.maxZ) reasons.push(`纵向落点 ${landZ.toFixed(1)}米 超出远端边界(${COURSE_BOUNDARY.maxZ}米)`);
        landing.outOfBoundsReason = reasons.join('；');
      }

      landed = true;
    }
  }

  if (!landed) {
    landing = {
      x: state.x,
      z: state.z,
      distance: Math.sqrt(state.x * state.x + state.z * state.z),
      carry: 0,
      roll: 0,
      outOfBounds: true,
      outOfBoundsReason: `飞行时间超过 ${MAX_FLIGHT_TIME}秒 未落地`,
    };
  }

  const calcEnd = performance.now();

  return {
    params,
    points,
    landing,
    apex,
    flightTime: t,
    calculationTime: calcEnd - calcStart,
    validation: { valid: true, errors: [], warnings: [] },
  };
}
