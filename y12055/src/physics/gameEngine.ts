import type {
  Submarine,
  BallastTank,
  TreasureChest,
  OceanEnvironment,
  BuoyancyCalculation,
  OperationLog,
  OperationType,
  GameResult,
  GameSettings,
  ActiveInput,
  DensityZone,
} from "./types";
import { calculateBuoyancy, calculateTotalMass, getFluidDensity } from "./buoyancyEngine";
import { checkBoundaries, checkDensityZoneChange, checkTreasureCollection } from "./boundaryDetector";
import {
  GRAVITY,
  WATER_DENSITY,
  OXYGEN_MAX,
  FIXED_DT,
  BALLAST_FILL_RATE,
  BALLAST_DRAIN_RATE,
  MOVE_FORCE,
  DRAG_COEFFICIENT,
  MAX_DEPTH,
  DEFAULT_SUBMARINE,
  DEFAULT_BALLAST_TANK,
  DEFAULT_TREASURE,
  DENSITY_ZONES,
  OBSTACLES,
  TARGET_DEPTH,
} from "./constants";

let opIdCounter = 0;

export interface GameEngineState {
  submarine: Submarine;
  ballastTank: BallastTank;
  treasureChest: TreasureChest | null;
  environment: OceanEnvironment;
  settings: GameSettings;
  buoyancy: BuoyancyCalculation;
  frame: number;
  result: GameResult | null;
  phase: "idle" | "playing" | "paused" | "ended";
  warnings: string[];
  lastOperation: OperationLog | null;
}

export function createInitialState(settings: GameSettings): GameEngineState {
  const sub: Submarine = { ...DEFAULT_SUBMARINE };
  const tank: BallastTank = { ...DEFAULT_BALLAST_TANK };
  const treasure: TreasureChest | null = settings.withTreasure
    ? { ...DEFAULT_TREASURE, collected: false }
    : null;

  const env: OceanEnvironment = {
    baseDensity: WATER_DENSITY,
    densityZones: settings.enableDensityZones
      ? (DENSITY_ZONES as unknown as DensityZone[])
      : [],
    gravity: GRAVITY,
    maxDepth: MAX_DEPTH,
    oxygenRemaining: OXYGEN_MAX,
  };

  const buoyancy = calculateBuoyancy(sub, tank, treasure, env, "INIT");

  return {
    submarine: sub,
    ballastTank: tank,
    treasureChest: treasure,
    environment: env,
    settings,
    buoyancy,
    frame: 0,
    result: null,
    phase: "idle",
    warnings: [],
    lastOperation: null,
  };
}

export function applyInput(
  state: GameEngineState,
  input: ActiveInput,
  dt: number
): OperationLog[] {
  const logs: OperationLog[] = [];

  if (input.fill && state.ballastTank.currentWater < state.ballastTank.maxVolume) {
    const prev = state.ballastTank.currentWater;
    state.ballastTank.currentWater = Math.min(
      state.ballastTank.maxVolume,
      state.ballastTank.currentWater + BALLAST_FILL_RATE
    );
    opIdCounter++;
    const log: OperationLog = {
      id: `op-${opIdCounter}`,
      timestamp: Date.now(),
      frame: state.frame,
      operation: "BALLAST_FILL",
      parameters: { from: prev, to: state.ballastTank.currentWater },
      buoyancyCalculationId: "",
      description: `注水：${prev.toFixed(2)}m³ → ${state.ballastTank.currentWater.toFixed(2)}m³`,
      treasureAffected: false,
    };
    logs.push(log);
  }

  if (input.drain && state.ballastTank.currentWater > 0) {
    const prev = state.ballastTank.currentWater;
    state.ballastTank.currentWater = Math.max(
      0,
      state.ballastTank.currentWater - BALLAST_DRAIN_RATE
    );
    opIdCounter++;
    const log: OperationLog = {
      id: `op-${opIdCounter}`,
      timestamp: Date.now(),
      frame: state.frame,
      operation: "BALLAST_DRAIN",
      parameters: { from: prev, to: state.ballastTank.currentWater },
      buoyancyCalculationId: "",
      description: `排水：${prev.toFixed(2)}m³ → ${state.ballastTank.currentWater.toFixed(2)}m³`,
      treasureAffected: false,
    };
    logs.push(log);
  }

  let moveOp: OperationType | null = null;
  let moveDesc = "";
  let forceX = 0;
  let forceY = 0;

  if (input.left) {
    forceX -= MOVE_FORCE;
    moveOp = "MOVE_LEFT";
    moveDesc = "向左移动";
  }
  if (input.right) {
    forceX += MOVE_FORCE;
    moveOp = "MOVE_RIGHT";
    moveDesc = "向右移动";
  }
  if (input.up) {
    forceY -= MOVE_FORCE;
    moveOp = "MOVE_UP";
    moveDesc = "向上移动";
  }
  if (input.down) {
    forceY += MOVE_FORCE;
    moveOp = "MOVE_DOWN";
    moveDesc = "向下移动";
  }

  if (moveOp) {
    const totalMass = calculateTotalMass(state.submarine, state.ballastTank, state.treasureChest);
    const ax = forceX / totalMass;
    const ay = forceY / totalMass;

    state.submarine.vx += ax * dt;
    state.submarine.vy += ay * dt;

    opIdCounter++;
    const log: OperationLog = {
      id: `op-${opIdCounter}`,
      timestamp: Date.now(),
      frame: state.frame,
      operation: moveOp,
      parameters: { forceX, forceY },
      buoyancyCalculationId: "",
      description: moveDesc,
      treasureAffected: false,
    };
    logs.push(log);
  }

  return logs;
}

export function tick(state: GameEngineState, input: ActiveInput): GameEngineState {
  if (state.phase !== "playing") return state;

  const dt = FIXED_DT;
  const prevY = state.submarine.y;
  const prevDensity = getFluidDensity(prevY, state.environment);

  const inputLogs = applyInput(state, input, dt);

  const totalMass = calculateTotalMass(state.submarine, state.ballastTank, state.treasureChest);
  const ay = -state.buoyancy.netForce / totalMass;
  state.submarine.vy += ay * dt;
  state.submarine.vx -= DRAG_COEFFICIENT * state.submarine.vx * dt / totalMass;
  state.submarine.vy -= DRAG_COEFFICIENT * state.submarine.vy * dt / totalMass;

  state.submarine.x += state.submarine.vx * dt;
  state.submarine.y += state.submarine.vy * dt;

  if (state.submarine.y < 0) {
    state.submarine.y = 0;
    if (state.submarine.vy < 0) {
      state.submarine.vy = 0;
    }
  }
  if (state.submarine.x < 0) {
    state.submarine.x = 0;
    state.submarine.vx = 0;
  }
  if (state.submarine.x > 100) {
    state.submarine.x = 100;
    state.submarine.vx = 0;
  }

  const currentDensity = getFluidDensity(state.submarine.y, state.environment);
  let trigger = "TICK";
  let densityLog: OperationLog | null = null;

  if (Math.abs(prevDensity - currentDensity) > 0.1) {
    const zoneChange = checkDensityZoneChange(prevY, state.submarine.y, state.environment);
    trigger = zoneChange.entered ? "DENSITY_ZONE_ENTER" : "DENSITY_ZONE_EXIT";
    opIdCounter++;
    densityLog = {
      id: `op-${opIdCounter}`,
      timestamp: Date.now(),
      frame: state.frame,
      operation: zoneChange.entered ? "DENSITY_ZONE_ENTER" : "DENSITY_ZONE_EXIT",
      parameters: { prevDensity, currentDensity },
      buoyancyCalculationId: "",
      description: zoneZoneChangeDesc(zoneChange.entered, prevDensity, currentDensity),
      treasureAffected: false,
    };
  }

  if (state.treasureChest && !state.treasureChest.collected) {
    if (checkTreasureCollection(state.submarine, state.treasureChest)) {
      state.treasureChest.collected = true;
      trigger = "COLLECT_TREASURE";
      opIdCounter++;
      inputLogs.push({
        id: `op-${opIdCounter}`,
        timestamp: Date.now(),
        frame: state.frame,
        operation: "COLLECT_TREASURE",
        parameters: { mass: state.treasureChest.mass, volume: state.treasureChest.volume },
        buoyancyCalculationId: "",
        description: `收集宝箱！质量+${state.treasureChest.mass}kg，体积+${state.treasureChest.volume}m³`,
        treasureAffected: true,
      });
    }
  }

  const buoyancy = calculateBuoyancy(
    state.submarine,
    state.ballastTank,
    state.treasureChest,
    state.environment,
    trigger
  );

  for (const log of inputLogs) {
    log.buoyancyCalculationId = buoyancy.id;
    log.treasureAffected = log.treasureAffected || (state.treasureChest?.collected ?? false);
  }
  if (densityLog) {
    densityLog.buoyancyCalculationId = buoyancy.id;
    inputLogs.push(densityLog);
  }

  if (state.settings.enableOxygen) {
    state.environment.oxygenRemaining -= dt;
  }

  const boundaryResult = checkBoundaries(
    state.submarine,
    state.environment,
    OBSTACLES as unknown as { x: number; y: number; width: number; height: number }[],
    state.treasureChest,
    state.settings,
    TARGET_DEPTH
  );

  state.buoyancy = buoyancy;
  state.frame++;
  state.warnings = boundaryResult.warning ? [boundaryResult.warning] : [];
  state.lastOperation = inputLogs.length > 0 ? inputLogs[inputLogs.length - 1] : null;

  if (boundaryResult.triggered && boundaryResult.result) {
    boundaryResult.result.frame = state.frame;
    state.result = boundaryResult.result;
    state.phase = "ended";
  }

  return state;
}

function zoneZoneChangeDesc(entered: boolean, prev: number, current: number): string {
  if (entered) {
    return `进入密度突变区域：${prev.toFixed(0)} → ${current.toFixed(0)} kg/m³`;
  }
  return `离开密度突变区域：${prev.toFixed(0)} → ${current.toFixed(0)} kg/m³`;
}

export function resetOpCounter(): void {
  opIdCounter = 0;
}
