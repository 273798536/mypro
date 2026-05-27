import { GRAVITY, AIR_DENSITY } from './constants';
import type { TrajectoryPoint, IntegrationStep, SimulationParams } from './types';

export interface State {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

type DerivativeFunction = (state: State, time: number, params: SimulationParams) => {
  dx: number;
  dy: number;
  dvx: number;
  dvy: number;
};

export const derivativesWithDrag: DerivativeFunction = (state, _, params) => {
  const { vx, vy } = state;
  const { dragCoefficient, arrowMass, arrowDiameter } = params;

  const v = Math.sqrt(vx * vx + vy * vy);
  const massKg = arrowMass / 1000;
  const crossSectionalArea = Math.PI * Math.pow(arrowDiameter / 2, 2);

  let dragAccel = 0;
  if (v > 0.001) {
    const dragForce = 0.5 * AIR_DENSITY * v * v * dragCoefficient * crossSectionalArea;
    dragAccel = dragForce / massKg;
  }

  return {
    dx: vx,
    dy: vy,
    dvx: -dragAccel * (vx / Math.max(v, 0.001)),
    dvy: -GRAVITY - dragAccel * (vy / Math.max(v, 0.001)),
  };
};

export const derivativesNoDrag: DerivativeFunction = (state, _, __) => {
  return {
    dx: state.vx,
    dy: state.vy,
    dvx: 0,
    dvy: -GRAVITY,
  };
};

export const eulerStep = (
  state: State,
  time: number,
  dt: number,
  params: SimulationParams,
  withDrag: boolean
): State => {
  const derivatives = withDrag ? derivativesWithDrag : derivativesNoDrag;
  const d = derivatives(state, time, params);

  return {
    x: state.x + d.dx * dt,
    y: state.y + d.dy * dt,
    vx: state.vx + d.dvx * dt,
    vy: state.vy + d.dvy * dt,
  };
};

export const rungeKutta4Step = (
  state: State,
  time: number,
  dt: number,
  params: SimulationParams,
  withDrag: boolean
): { state: State; k1: State; k2: State; k3: State; k4: State } => {
  const derivatives = withDrag ? derivativesWithDrag : derivativesNoDrag;

  const k1d = derivatives(state, time, params);
  const k1: State = {
    x: k1d.dx * dt,
    y: k1d.dy * dt,
    vx: k1d.dvx * dt,
    vy: k1d.dvy * dt,
  };

  const state2: State = {
    x: state.x + k1.x / 2,
    y: state.y + k1.y / 2,
    vx: state.vx + k1.vx / 2,
    vy: state.vy + k1.vy / 2,
  };
  const k2d = derivatives(state2, time + dt / 2, params);
  const k2: State = {
    x: k2d.dx * dt,
    y: k2d.dy * dt,
    vx: k2d.dvx * dt,
    vy: k2d.dvy * dt,
  };

  const state3: State = {
    x: state.x + k2.x / 2,
    y: state.y + k2.y / 2,
    vx: state.vx + k2.vx / 2,
    vy: state.vy + k2.vy / 2,
  };
  const k3d = derivatives(state3, time + dt / 2, params);
  const k3: State = {
    x: k3d.dx * dt,
    y: k3d.dy * dt,
    vx: k3d.dvx * dt,
    vy: k3d.dvy * dt,
  };

  const state4: State = {
    x: state.x + k3.x,
    y: state.y + k3.y,
    vx: state.vx + k3.vx,
    vy: state.vy + k3.vy,
  };
  const k4d = derivatives(state4, time + dt, params);
  const k4: State = {
    x: k4d.dx * dt,
    y: k4d.dy * dt,
    vx: k4d.dvx * dt,
    vy: k4d.dvy * dt,
  };

  const newState: State = {
    x: state.x + (k1.x + 2 * k2.x + 2 * k3.x + k4.x) / 6,
    y: state.y + (k1.y + 2 * k2.y + 2 * k3.y + k4.y) / 6,
    vx: state.vx + (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx) / 6,
    vy: state.vy + (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy) / 6,
  };

  return { state: newState, k1, k2, k3, k4 };
};

export const checkNumericalStability = (
  prevState: State,
  currentState: State,
  dt: number,
  threshold: number = 1000
): boolean => {
  const dvx = Math.abs(currentState.vx - prevState.vx) / dt;
  const dvy = Math.abs(currentState.vy - prevState.vy) / dt;
  return dvx < threshold && dvy < threshold;
};

export const calculateDragForce = (
  vx: number,
  vy: number,
  dragCoefficient: number,
  arrowDiameter: number
): number => {
  const v = Math.sqrt(vx * vx + vy * vy);
  const crossSectionalArea = Math.PI * Math.pow(arrowDiameter / 2, 2);
  return 0.5 * AIR_DENSITY * v * v * dragCoefficient * crossSectionalArea;
};

export const convertStateToPoint = (
  state: State,
  time: number,
  params: SimulationParams,
  withDrag: boolean
): TrajectoryPoint => {
  const point: TrajectoryPoint = {
    time,
    x: state.x,
    y: state.y,
    vx: state.vx,
    vy: state.vy,
  };

  if (withDrag) {
    const derivatives = derivativesWithDrag(state, time, params);
    point.ax = derivatives.dvx;
    point.ay = derivatives.dvy;
    point.dragForce = calculateDragForce(
      state.vx,
      state.vy,
      params.dragCoefficient,
      params.arrowDiameter
    );
  } else {
    point.ax = 0;
    point.ay = -GRAVITY;
    point.dragForce = 0;
  }

  return point;
};
