export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

export const normalizeAngle = (angle: number): number => {
  let result = angle % 360;
  if (result > 180) result -= 360;
  if (result < -180) result += 360;
  return result;
};

export const isAngleOutOfRange = (
  angle: number,
  range: [number, number] = [-360, 360]
): boolean => {
  return angle < range[0] || angle > range[1];
};

export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const predictNextValue = (
  prevValues: number[],
  frameCount: number = 3
): number => {
  if (prevValues.length === 0) return 0;
  if (prevValues.length === 1) return prevValues[0];

  const recent = prevValues.slice(-frameCount);
  let sum = 0;
  let weightSum = 0;

  for (let i = 0; i < recent.length; i++) {
    const weight = i + 1;
    sum += recent[i] * weight;
    weightSum += weight;
  }

  return sum / weightSum;
};

export const formatAngle = (angle: number, decimals: number = 1): string => {
  return `${angle.toFixed(decimals)}°`;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};
