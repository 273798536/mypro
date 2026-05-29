export const FORCE_CONFIG = {
  charge: -300,
  linkDistance: 80,
  linkStrength: 0.5,
  centerStrength: 0.1,
  collideRadius: 25,
  decay: 0.02,
  velocityDecay: 0.4,
  iterations: 150,
} as const;

export function generateRandomPosition() {
  const spread = 30;
  return {
    x: (Math.random() - 0.5) * spread,
    y: (Math.random() - 0.5) * spread,
    z: (Math.random() - 0.5) * spread,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
