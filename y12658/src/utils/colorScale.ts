import * as THREE from 'three';

export interface ColorScale {
  getColor: (t: number) => THREE.Color;
  getCssColor: (t: number) => string;
}

const VIRIDIS_STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [0.267, 0.004, 0.329]],
  [0.1, [0.283, 0.141, 0.458]],
  [0.2, [0.254, 0.265, 0.530]],
  [0.3, [0.207, 0.372, 0.553]],
  [0.4, [0.164, 0.471, 0.558]],
  [0.5, [0.128, 0.567, 0.551]],
  [0.6, [0.135, 0.659, 0.518]],
  [0.7, [0.267, 0.749, 0.441]],
  [0.8, [0.478, 0.821, 0.318]],
  [0.9, [0.741, 0.873, 0.150]],
  [1.0, [0.993, 0.906, 0.144]],
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function sampleStops(t: number): [number, number, number] {
  const tt = Math.max(0, Math.min(1, t));
  for (let i = 0; i < VIRIDIS_STOPS.length - 1; i++) {
    const [pos1, c1] = VIRIDIS_STOPS[i];
    const [pos2, c2] = VIRIDIS_STOPS[i + 1];
    if (tt >= pos1 && tt <= pos2) {
      const lt = (tt - pos1) / (pos2 - pos1);
      return [lerp(c1[0], c2[0], lt), lerp(c1[1], c2[1], lt), lerp(c1[2], c2[2], lt)];
    }
  }
  return VIRIDIS_STOPS[VIRIDIS_STOPS.length - 1][1];
}

export function createViridisScale(min: number, max: number): ColorScale {
  const range = max - min || 1;
  return {
    getColor: (v) => {
      const t = (v - min) / range;
      const [r, g, b] = sampleStops(t);
      return new THREE.Color(r, g, b);
    },
    getCssColor: (v) => {
      const t = (v - min) / range;
      const [r, g, b] = sampleStops(t);
      const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    },
  };
}

export function valueRange(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) {
    min -= 0.5;
    max += 0.5;
  }
  return { min, max };
}
