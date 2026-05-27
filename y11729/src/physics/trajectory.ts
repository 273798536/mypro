import { GRAVITY } from './constants';
import {
  rungeKutta4Step,
  checkNumericalStability,
  convertStateToPoint,
  type State,
} from './integrator';
import type {
  SimulationParams,
  TrajectoryPoint,
  SimulationMetrics,
  Warning,
  IntegrationStep,
} from './types';

const degToRad = (deg: number): number => (deg * Math.PI) / 180;

const findLandingPoint = (
  points: TrajectoryPoint[]
): { x: number; y: number; time: number } => {
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    if (prev.y >= 0 && curr.y < 0) {
      const t = prev.y / (prev.y - curr.y);
      return {
        x: prev.x + t * (curr.x - prev.x),
        y: 0,
        time: prev.time + t * (curr.time - prev.time),
      };
    }
  }

  const last = points[points.length - 1];
  return { x: last.x, y: last.y, time: last.time };
};

const findMaxHeight = (points: TrajectoryPoint[]): number => {
  let maxH = 0;
  for (const point of points) {
    if (point.y > maxH) maxH = point.y;
  }
  return maxH;
};

const calculateVerticalErrorAtTarget = (
  points: TrajectoryPoint[],
  targetDistance: number
): number => {
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    if (prev.x <= targetDistance && curr.x >= targetDistance) {
      const t = (targetDistance - prev.x) / (curr.x - prev.x || 1);
      return prev.y + t * (curr.y - prev.y);
    }
  }
  return -1;
};

const estimateEnergyLoss = (
  trajectory: TrajectoryPoint[]
): { loss: number; initialKE: number; finalKE: number } => {
  if (trajectory.length < 2) return { loss: 0, initialKE: 0, finalKE: 0 };

  const first = trajectory[0];
  const last = trajectory[trajectory.length - 1];

  const initialKE = 0.5 * (first.vx * first.vx + first.vy * first.vy);
  const finalKE = 0.5 * (last.vx * last.vx + last.vy * last.vy);

  return {
    loss: initialKE - finalKE,
    initialKE,
    finalKE,
  };
};

export const calculateNoDragTrajectory = (
  params: SimulationParams
): { trajectory: TrajectoryPoint[]; warnings: Warning[] } => {
  const { initialVelocity, launchAngle, timeStep, targetDistance } = params;
  const angleRad = degToRad(launchAngle);

  const vx0 = initialVelocity * Math.cos(angleRad);
  const vy0 = initialVelocity * Math.sin(angleRad);

  const maxTime = (2 * vy0) / GRAVITY + 2;
  const points: TrajectoryPoint[] = [];
  const warnings: Warning[] = [];

  for (let t = 0; t <= maxTime; t += timeStep) {
    const x = vx0 * t;
    const y = vy0 * t - 0.5 * GRAVITY * t * t;

    points.push({
      time: t,
      x,
      y,
      vx: vx0,
      vy: vy0 - GRAVITY * t,
      ax: 0,
      ay: -GRAVITY,
      dragForce: 0,
    });

    if (y < -50) break;
  }

  const landing = findLandingPoint(points);
  if (targetDistance > landing.x) {
    warnings.push({
      type: 'RANGE_EXCEEDED',
      message: `靶距 ${targetDistance}m 超过最大射程 ${landing.x.toFixed(1)}m，落点将外推计算`,
      severity: 'warning',
      suggestion: '建议减小发射角度或提高初速度',
    });
  }

  return { trajectory: points, warnings };
};

export const calculateWithDragTrajectory = (
  params: SimulationParams
): {
  trajectory: TrajectoryPoint[];
  integrationSteps: IntegrationStep[];
  warnings: Warning[];
} => {
  const { initialVelocity, launchAngle, timeStep } = params;
  const angleRad = degToRad(launchAngle);

  let state: State = {
    x: 0,
    y: 0,
    vx: initialVelocity * Math.cos(angleRad),
    vy: initialVelocity * Math.sin(angleRad),
  };

  const points: TrajectoryPoint[] = [convertStateToPoint(state, 0, params, true)];
  const integrationSteps: IntegrationStep[] = [];
  const warnings: Warning[] = [];

  let stepCount = 0;
  const maxSteps = 10000;
  let prevState = { ...state };

  for (let t = timeStep; stepCount < maxSteps; t += timeStep) {
    stepCount++;

    const result = rungeKutta4Step(prevState, t - timeStep, timeStep, params, true);
    state = result.state;

    if (!checkNumericalStability(prevState, state, timeStep)) {
      warnings.push({
        type: 'NUMERICAL_INSTABILITY',
        message: `在 t=${t.toFixed(3)}s 检测到数值不稳定，计算可能失真`,
        severity: 'error',
        suggestion: '建议减小积分步长或降低阻力系数',
      });
      break;
    }

    if (stepCount <= 20) {
      integrationSteps.push({
        step: stepCount,
        time: t,
        x: state.x,
        y: state.y,
        vx: state.vx,
        vy: state.vy,
        k1: { vx: result.k1.vx, vy: result.k1.vy },
        k2: { vx: result.k2.vx, vy: result.k2.vy },
        k3: { vx: result.k3.vx, vy: result.k3.vy },
        k4: { vx: result.k4.vx, vy: result.k4.vy },
      });
    }

    points.push(convertStateToPoint(state, t, params, true));

    if (state.y < -50) break;

    prevState = { ...state };
  }

  if (stepCount >= maxSteps) {
    warnings.push({
      type: 'NUMERICAL_INSTABILITY',
      message: '计算达到最大步数限制，轨迹可能不完整',
      severity: 'warning',
    });
  }

  return { trajectory: points, integrationSteps, warnings };
};

export const calculateMetrics = (
  noDragTrajectory: TrajectoryPoint[],
  withDragTrajectory: TrajectoryPoint[],
  params: SimulationParams
): SimulationMetrics => {
  const noDragLanding = findLandingPoint(noDragTrajectory);
  const withDragLanding = findLandingPoint(withDragTrajectory);

  const noDragError = calculateVerticalErrorAtTarget(noDragTrajectory, params.targetDistance);
  const withDragError = calculateVerticalErrorAtTarget(withDragTrajectory, params.targetDistance);

  const energyInfo = estimateEnergyLoss(withDragTrajectory);

  return {
    noDragLanding,
    withDragLanding,
    landingError: Math.abs(noDragLanding.x - withDragLanding.x),
    verticalErrorAtTarget: Math.abs(noDragError - withDragError),
    maxHeight: {
      noDrag: findMaxHeight(noDragTrajectory),
      withDrag: findMaxHeight(withDragTrajectory),
    },
    isExtrapolated: params.targetDistance > Math.min(noDragLanding.x, withDragLanding.x),
    energyLoss: energyInfo.loss,
    timeOfFlight: {
      noDrag: noDragLanding.time,
      withDrag: withDragLanding.time,
    },
  };
};

export const runSimulation = (
  params: SimulationParams
): {
  noDragTrajectory: TrajectoryPoint[];
  withDragTrajectory: TrajectoryPoint[];
  integrationSteps: IntegrationStep[];
  warnings: Warning[];
  metrics: SimulationMetrics;
} => {
  const { trajectory: noDragTrajectory, warnings: noDragWarnings } =
    calculateNoDragTrajectory(params);
  const {
    trajectory: withDragTrajectory,
    integrationSteps,
    warnings: withDragWarnings,
  } = calculateWithDragTrajectory(params);

  const metrics = calculateMetrics(noDragTrajectory, withDragTrajectory, params);
  const warnings = [...noDragWarnings, ...withDragWarnings];

  return {
    noDragTrajectory,
    withDragTrajectory,
    integrationSteps,
    warnings,
    metrics,
  };
};
