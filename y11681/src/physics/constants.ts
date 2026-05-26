export const GRAVITY = 9.80665;

export const AIR_DENSITY_SEA_LEVEL = 1.225;

export const GOLF_BALL_MASS = 0.04593;

export const GOLF_BALL_RADIUS = 0.021335;

export const GOLF_BALL_DIAMETER = GOLF_BALL_RADIUS * 2;

export const GOLF_BALL_CROSS_SECTION_AREA = Math.PI * GOLF_BALL_RADIUS * GOLF_BALL_RADIUS;

export const DRAG_COEFFICIENT = 0.24;

export const LIFT_COEFFICIENT_BASE = 0.00005;

export const MAX_FLIGHT_TIME = 15;

export const TIME_STEP = 0.005;

export const COURSE_BOUNDARY = {
  minX: -50,
  maxX: 50,
  minY: 0,
  maxY: 50,
  minZ: 0,
  maxZ: 400,
};

export const MAGNUS_COEFFICIENT = 0.0001;

export function getAirDensity(temperature: number, humidity: number, altitude: number): number {
  const tKelvin = temperature + 273.15;
  const pressure = 101325 * Math.exp(-0.00012 * altitude);
  const satVaporPressure = 610.78 * Math.exp((17.27 * temperature) / (temperature + 237.3));
  const vaporPressure = (humidity / 100) * satVaporPressure;
  const dryAirPressure = pressure - vaporPressure;
  const density = dryAirPressure / (287.058 * tKelvin) + vaporPressure / (461.495 * tKelvin);
  return density;
}

export function rpmToRadPerSec(rpm: number): number {
  return (rpm * 2 * Math.PI) / 60;
}
