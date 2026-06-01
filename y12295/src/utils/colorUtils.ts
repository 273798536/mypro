import { scaleOrdinal } from 'd3-scale';
import { CATEGORY_COLORS, DEFAULT_COLORS } from '../types';

export function getCategoryColor(label: string, allLabels: string[]): string {
  if (CATEGORY_COLORS[label]) {
    return CATEGORY_COLORS[label];
  }
  
  const colorScale = scaleOrdinal<string>()
    .domain(allLabels)
    .range(DEFAULT_COLORS);
  
  return colorScale(label) || DEFAULT_COLORS[0];
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [0.5, 0.5, 0.5];
}

function interpolateViridis(t: number): string {
  const colors = [
    [0.267, 0.004, 0.329],
    [0.283, 0.141, 0.458],
    [0.254, 0.265, 0.530],
    [0.207, 0.372, 0.553],
    [0.164, 0.471, 0.558],
    [0.128, 0.567, 0.551],
    [0.135, 0.659, 0.518],
    [0.267, 0.749, 0.441],
    [0.478, 0.821, 0.318],
    [0.741, 0.873, 0.150],
    [0.993, 0.906, 0.144],
  ];
  
  t = Math.max(0, Math.min(1, t));
  const idx = t * (colors.length - 1);
  const i = Math.floor(idx);
  const f = idx - i;
  
  if (i >= colors.length - 1) {
    const c = colors[colors.length - 1];
    return `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;
  }
  
  const c1 = colors[i];
  const c2 = colors[i + 1];
  const r = Math.round((c1[0] + (c2[0] - c1[0]) * f) * 255);
  const g = Math.round((c1[1] + (c2[1] - c1[1]) * f) * 255);
  const b = Math.round((c1[2] + (c2[2] - c1[2]) * f) * 255);
  
  return `rgb(${r}, ${g}, ${b})`;
}

function rgbStringToHex(rgb: string): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return '#888888';
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function confidenceToRgb(confidence: number): [number, number, number] {
  const color = rgbStringToHex(interpolateViridis(confidence));
  return hexToRgb(color);
}

export function getPointSize(confidence: number): number {
  return 0.08 + confidence * 0.1;
}

export function colorWithOpacity(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);
  return `rgba(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)}, ${opacity})`;
}

export function generateColorScale(labels: string[]): (label: string) => string {
  const colors: Record<string, string> = {};
  labels.forEach((label, index) => {
    if (CATEGORY_COLORS[label]) {
      colors[label] = CATEGORY_COLORS[label];
    } else {
      colors[label] = DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    }
  });
  return (label: string) => colors[label] || DEFAULT_COLORS[0];
}
