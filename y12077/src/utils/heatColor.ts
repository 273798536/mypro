export const getHeatColor = (
  value: number,
  minValue: number,
  maxValue: number,
  alpha: number = 1
): string => {
  if (maxValue === minValue) {
    return `rgba(100, 149, 237, ${alpha})`;
  }

  const normalized = (value - minValue) / (maxValue - minValue);

  const hue = (1 - normalized) * 60;
  const saturation = 80;
  const lightness = 50 + normalized * 10;

  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
};

export const getHeatColorRGB = (
  value: number,
  minValue: number,
  maxValue: number
): [number, number, number] => {
  if (maxValue === minValue) {
    return [0.39, 0.58, 0.93];
  }

  const normalized = (value - minValue) / (maxValue - minValue);

  const hue = (1 - normalized) * 60;
  const saturation = 0.8;
  const lightness = 0.5 + normalized * 0.1;

  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  if (hue >= 0 && hue < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (hue >= 60 && hue < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (hue >= 120 && hue < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (hue >= 180 && hue < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (hue >= 240 && hue < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (hue >= 300 && hue < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return [r + m, g + m, b + m];
};

export const getConflictColor = (type: string, alpha: number = 1): string => {
  switch (type) {
    case 'duplicate':
      return `rgba(255, 77, 79, ${alpha})`;
    case 'occlusion':
      return `rgba(250, 140, 22, ${alpha})`;
    case 'mismatch':
      return `rgba(114, 46, 209, ${alpha})`;
    default:
      return `rgba(107, 114, 128, ${alpha})`;
  }
};

export const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatShortDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
