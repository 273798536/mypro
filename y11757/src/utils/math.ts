import type { Vector2 } from '../game/types';

export const distance = (a: Vector2, b: Vector2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export const lerpVector = (a: Vector2, b: Vector2, t: number): Vector2 => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

export const normalize = (v: Vector2): Vector2 => {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export const formatNumber = (num: number, decimals: number = 0): string => {
  return num.toFixed(decimals);
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};
