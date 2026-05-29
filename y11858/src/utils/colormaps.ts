import type { ColorMapName } from '../types';

type ColorStop = [number, number, number, number];

export const COLOR_MAPS: Record<ColorMapName, ColorStop[]> = {
  quantum: [
    [0.0, 0.04, 0.09, 0.16],
    [0.15, 0.12, 0.10, 0.42],
    [0.3, 0.49, 0.23, 0.93],
    [0.5, 0.02, 0.71, 0.83],
    [0.7, 0.35, 0.96, 0.43],
    [0.85, 0.97, 0.84, 0.09],
    [1.0, 1.00, 0.99, 0.80],
  ],
  viridis: [
    [0.0, 0.267, 0.004, 0.329],
    [0.25, 0.282, 0.140, 0.458],
    [0.5, 0.127, 0.566, 0.551],
    [0.75, 0.369, 0.789, 0.383],
    [1.0, 0.993, 0.906, 0.144],
  ],
  plasma: [
    [0.0, 0.050, 0.030, 0.530],
    [0.25, 0.494, 0.012, 0.658],
    [0.5, 0.798, 0.280, 0.470],
    [0.75, 0.973, 0.585, 0.253],
    [1.0, 0.940, 0.975, 0.131],
  ],
  rainbow: [
    [0.0, 0.5, 0.0, 0.5],
    [0.17, 0.0, 0.0, 1.0],
    [0.33, 0.0, 0.7, 1.0],
    [0.5, 0.0, 1.0, 0.0],
    [0.67, 1.0, 1.0, 0.0],
    [0.83, 1.0, 0.5, 0.0],
    [1.0, 1.0, 0.0, 0.0],
  ],
};

export function sampleColorMap(name: ColorMapName, t: number): [number, number, number] {
  const stops = COLOR_MAPS[name];
  const clamped = Math.max(0, Math.min(1, t));

  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i][0] && clamped <= stops[i + 1][0]) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const range = upper[0] - lower[0];
  const localT = range > 0 ? (clamped - lower[0]) / range : 0;

  return [
    lower[1] + (upper[1] - lower[1]) * localT,
    lower[2] + (upper[2] - lower[2]) * localT,
    lower[3] + (upper[3] - lower[3]) * localT,
  ];
}

export function generateColorMapTexture(name: ColorMapName, size = 256): Uint8Array {
  const data = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    const [r, g, b] = sampleColorMap(name, t);
    data[i * 4] = Math.round(r * 255);
    data[i * 4 + 1] = Math.round(g * 255);
    data[i * 4 + 2] = Math.round(b * 255);
    data[i * 4 + 3] = 255;
  }
  return data;
}
