export const GRAVITY = 9.8;
export const WATER_DENSITY = 1000;
export const OXYGEN_MAX = 120;
export const FIXED_DT = 1 / 60;
export const BALLAST_FILL_RATE = 0.04;
export const BALLAST_DRAIN_RATE = 0.04;
export const MOVE_FORCE = 3000;
export const DRAG_COEFFICIENT = 80;
export const MAX_DEPTH = 50;
export const WORLD_WIDTH = 100;

export const DEFAULT_SUBMARINE = {
  mass: 5000,
  volume: 3.2,
  x: 50,
  y: 0,
  vx: 0,
  vy: 0,
} as const;

export const DEFAULT_BALLAST_TANK = {
  maxVolume: 2.5,
  currentWater: 0,
  waterDensity: 1000,
} as const;

export const DEFAULT_TREASURE = {
  id: "treasure-1",
  mass: 500,
  volume: 0.3,
  x: 30,
  y: 25,
  collected: false,
} as const;

export const DENSITY_ZONES = [
  { id: "dz-1", startY: 20, endY: 30, density: 1025 },
  { id: "dz-2", startY: 35, endY: 45, density: 1050 },
] as const;

export const OBSTACLES = [
  { x: 20, y: 15, width: 8, height: 3 },
  { x: 60, y: 30, width: 10, height: 4 },
  { x: 40, y: 40, width: 6, height: 5 },
] as const;

export const TARGET_DEPTH = 25;
