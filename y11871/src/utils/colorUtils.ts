export const pressureToColor = (pressure: number, opacity: number = 1): string => {
  const clamped = Math.max(0, Math.min(1, pressure));
  if (clamped < 0.25) {
    return `rgba(16, 185, 129, ${opacity})`;
  } else if (clamped < 0.5) {
    return `rgba(245, 158, 11, ${opacity})`;
  } else if (clamped < 0.75) {
    return `rgba(249, 115, 22, ${opacity})`;
  } else if (clamped < 0.9) {
    return `rgba(239, 68, 68, ${opacity})`;
  } else {
    return `rgba(127, 29, 29, ${opacity})`;
  }
};

export const pressureToHexColor = (pressure: number): string => {
  const clamped = Math.max(0, Math.min(1, pressure));
  if (clamped < 0.25) return '#10b981';
  if (clamped < 0.5) return '#f59e0b';
  if (clamped < 0.75) return '#f97316';
  if (clamped < 0.9) return '#ef4444';
  return '#7f1d1d';
};

export const pressureToGlowColor = (pressure: number): string => {
  const clamped = Math.max(0, Math.min(1, pressure));
  if (clamped < 0.25) return '#10b981';
  if (clamped < 0.5) return '#f59e0b';
  if (clamped < 0.75) return '#f97316';
  if (clamped < 0.9) return '#ef4444';
  return '#dc2626';
};

export const getPressureLabel = (pressure: number): string => {
  const clamped = Math.max(0, Math.min(1, pressure));
  if (clamped < 0.25) return '低压';
  if (clamped < 0.5) return '中压';
  if (clamped < 0.75) return '高压';
  if (clamped < 0.9) return '极高';
  return '饱和';
};

export const formatHour = (hour: number): string => {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const getGradientColors = (): string[] => {
  return ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#7f1d1d'];
};
