export type ColorMap = 'spectrum' | 'viridis' | 'plasma' | 'grayscale';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

export function rgbToString(r: number, g: number, b: number, alpha: number = 1): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

export function getSpectrumColor(value: number, min: number, max: number): [number, number, number] {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  if (normalized < 0.25) {
    const t = normalized / 0.25;
    return [lerp(20, 20, t), lerp(40, 180, t), lerp(80, 220, t)];
  } else if (normalized < 0.5) {
    const t = (normalized - 0.25) / 0.25;
    return [lerp(20, 50, t), lerp(180, 220, t), lerp(220, 180, t)];
  } else if (normalized < 0.75) {
    const t = (normalized - 0.5) / 0.25;
    return [lerp(50, 140, t), lerp(220, 120, t), lerp(180, 200, t)];
  } else {
    const t = (normalized - 0.75) / 0.25;
    return [lerp(140, 236, t), lerp(120, 72, t), lerp(200, 153, t)];
  }
}

export function getViridisColor(value: number, min: number, max: number): [number, number, number] {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  const stops: [number, [number, number, number]][] = [
    [0.0, [68, 1, 84]],
    [0.1, [72, 40, 120]],
    [0.2, [62, 74, 137]],
    [0.3, [49, 104, 142]],
    [0.4, [38, 130, 142]],
    [0.5, [31, 158, 137]],
    [0.6, [53, 183, 121]],
    [0.7, [109, 205, 89]],
    [0.8, [180, 222, 44]],
    [0.9, [253, 231, 37]],
    [1.0, [252, 255, 164]],
  ];
  
  for (let i = 0; i < stops.length - 1; i++) {
    if (normalized >= stops[i][0] && normalized <= stops[i + 1][0]) {
      const t = (normalized - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
      return [
        lerp(stops[i][1][0], stops[i + 1][1][0], t),
        lerp(stops[i][1][1], stops[i + 1][1][1], t),
        lerp(stops[i][1][2], stops[i + 1][1][2], t),
      ];
    }
  }
  
  return stops[stops.length - 1][1];
}

export function getPlasmaColor(value: number, min: number, max: number): [number, number, number] {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  const stops: [number, [number, number, number]][] = [
    [0.0, [13, 8, 135]],
    [0.1, [75, 3, 161]],
    [0.2, [125, 3, 168]],
    [0.3, [168, 34, 150]],
    [0.4, [203, 70, 121]],
    [0.5, [229, 107, 93]],
    [0.6, [246, 147, 69]],
    [0.7, [253, 188, 57]],
    [0.8, [244, 231, 72]],
    [0.9, [230, 249, 108]],
    [1.0, [240, 249, 232]],
  ];
  
  for (let i = 0; i < stops.length - 1; i++) {
    if (normalized >= stops[i][0] && normalized <= stops[i + 1][0]) {
      const t = (normalized - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
      return [
        lerp(stops[i][1][0], stops[i + 1][1][0], t),
        lerp(stops[i][1][1], stops[i + 1][1][1], t),
        lerp(stops[i][1][2], stops[i + 1][1][2], t),
      ];
    }
  }
  
  return stops[stops.length - 1][1];
}

export function getColor(
  value: number,
  min: number,
  max: number,
  colorMap: ColorMap = 'spectrum'
): [number, number, number] {
  switch (colorMap) {
    case 'viridis':
      return getViridisColor(value, min, max);
    case 'plasma':
      return getPlasmaColor(value, min, max);
    case 'grayscale':
      const gray = lerp(30, 230, (value - min) / (max - min));
      return [gray, gray, gray];
    case 'spectrum':
    default:
      return getSpectrumColor(value, min, max);
  }
}

export function createGradientCanvas(
  width: number,
  height: number,
  colorMap: ColorMap = 'spectrum',
  min: number = -120,
  max: number = 0
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  for (let i = 0; i < height; i++) {
    const value = lerp(max, min, i / height);
    const [r, g, b] = getColor(value, min, max, colorMap);
    ctx.fillStyle = rgbToString(r, g, b);
    ctx.fillRect(0, i, width, 1);
  }
  
  return canvas;
}

export function getFrequencyLabel(freq: number): string {
  if (freq >= 1000) {
    return `${(freq / 1000).toFixed(1)}k`;
  }
  return `${Math.round(freq)}`;
}

export function findPeaks(
  data: Float32Array,
  frequencies: number[],
  threshold: number = 0.7,
  minDistance: number = 5
): { index: number; frequency: number; magnitude: number }[] {
  const peaks: { index: number; frequency: number; magnitude: number }[] = [];
  const length = data.length;
  
  let max = -Infinity;
  let min = Infinity;
  for (let i = 0; i < length; i++) {
    max = Math.max(max, data[i]);
    min = Math.min(min, data[i]);
  }
  
  const thresholdValue = min + (max - min) * threshold;
  
  for (let i = 1; i < length - 1; i++) {
    if (data[i] > thresholdValue && data[i] > data[i - 1] && data[i] > data[i + 1]) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1].index >= minDistance) {
        peaks.push({
          index: i,
          frequency: frequencies[i],
          magnitude: data[i],
        });
      }
    }
  }
  
  peaks.sort((a, b) => b.magnitude - a.magnitude);
  
  return peaks.slice(0, 10);
}
