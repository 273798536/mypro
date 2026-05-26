
import type { ColorStop } from '../types';

export const DEFAULT_COLOR_STOPS: ColorStop[] = [
  { position: 0, color: '#1E3A8A' },
  { position: 0.25, color: '#0EA5E9' },
  { position: 0.5, color: '#10B981' },
  { position: 0.75, color: '#F59E0B' },
  { position: 1, color: '#EF4444' },
];

export const INVERTED_COLOR_STOPS: ColorStop[] = [
  { position: 0, color: '#EF4444' },
  { position: 0.25, color: '#F59E0B' },
  { position: 0.5, color: '#10B981' },
  { position: 0.75, color: '#0EA5E9' },
  { position: 1, color: '#1E3A8A' },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function getColorForValue(
  value: number,
  minValue: number,
  maxValue: number,
  colorStops: ColorStop[] = DEFAULT_COLOR_STOPS
): string {
  if (maxValue === minValue) {
    return colorStops[0].color;
  }

  const normalized = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));

  let lowerStop = colorStops[0];
  let upperStop = colorStops[colorStops.length - 1];

  for (let i = 0; i < colorStops.length - 1; i++) {
    if (normalized >= colorStops[i].position && normalized <= colorStops[i + 1].position) {
      lowerStop = colorStops[i];
      upperStop = colorStops[i + 1];
      break;
    }
  }

  const range = upperStop.position - lowerStop.position;
  const localT = range === 0 ? 0 : (normalized - lowerStop.position) / range;

  const lowerRgb = hexToRgb(lowerStop.color);
  const upperRgb = hexToRgb(upperStop.color);

  const r = lowerRgb.r + localT * (upperRgb.r - lowerRgb.r);
  const g = lowerRgb.g + localT * (upperRgb.g - lowerRgb.g);
  const b = lowerRgb.b + localT * (upperRgb.b - lowerRgb.b);

  return rgbToHex(r, g, b);
}

export function createColorTexture(
  colorStops: ColorStop[] = DEFAULT_COLOR_STOPS,
  width: number = 256,
  height: number = 1
): Uint8Array {
  const data = new Uint8Array(width * height * 4);

  for (let x = 0; x < width; x++) {
    const t = x / (width - 1);
    const color = getColorForValue(t, 0, 1, colorStops);
    const rgb = hexToRgb(color);

    for (let y = 0; y < height; y++) {
      const index = (y * width + x) * 4;
      data[index] = rgb.r;
      data[index + 1] = rgb.g;
      data[index + 2] = rgb.b;
      data[index + 3] = 255;
    }
  }

  return data;
}

export function formatPressure(pressure: number | null): string {
  if (pressure === null) return '--';
  if (pressure >= 1000) {
    return (pressure / 1000).toFixed(2) + ' kPa';
  }
  return pressure.toFixed(1) + ' Pa';
}

export function pressureToCoefficient(
  pressure: number,
  dynamicPressure: number,
  staticPressure: number = 101325
): number {
  if (dynamicPressure === 0) return 0;
  return (pressure - staticPressure) / dynamicPressure;
}
