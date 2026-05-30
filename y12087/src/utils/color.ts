import type { ColorScale, StreamlineStatus, AnomalyType } from '@/types';
import { clamp, lerp } from './math';

export const STATUS_COLORS: Record<StreamlineStatus, string> = {
  normal: '#10b981',
  explosion: '#ef4444',
  direction_flip: '#f59e0b',
  out_of_bounds: '#8b5cf6',
};

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  explosion: '采样爆炸',
  direction_flip: '方向反转',
  out_of_bounds: '参数越界',
};

export const DEFAULT_COLOR_SCALE: ColorScale = {
  min: 0,
  max: 5,
  colors: ['#22c55e', '#eab308', '#ef4444'],
  enabled: true,
};

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [1, 1, 1];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function getColorFromScale(
  value: number,
  scale: ColorScale
): [number, number, number] {
  const normalized = clamp(
    (value - scale.min) / (scale.max - scale.min),
    0,
    1
  );

  const colors = scale.colors;
  const segmentCount = colors.length - 1;
  const position = normalized * segmentCount;
  const index = Math.floor(Math.min(position, segmentCount - 1));
  const t = position - index;

  const c1 = hexToRgb(colors[index]);
  const c2 = hexToRgb(colors[Math.min(index + 1, colors.length - 1)]);
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

export function getStreamlineColor(
  status: StreamlineStatus,
  speed: number,
  colorScale: ColorScale | null,
  useColorScale: boolean = false
): string {
  if (useColorScale && colorScale && status === 'normal') {
    const rgb = getColorFromScale(speed, colorScale);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  }
  return STATUS_COLORS[status];
}

export function createGradientTexture(
  scale: ColorScale,
  width: number = 256,
  height: number = 32
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  const colors = scale.colors;
  colors.forEach((color, i) => {
    const position = colors.length === 1 ? 0 : i / (colors.length - 1);
    gradient.addColorStop(position, color);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas;
}
