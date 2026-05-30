export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function vectorMagnitude(v: [number, number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function vectorNormalize(v: [number, number, number]): [number, number, number] {
  const mag = vectorMagnitude(v);
  if (mag === 0) return [0, 0, 0];
  return [v[0] / mag, v[1] / mag, v[2] / mag];
}

export function vectorDot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vectorAngle(a: [number, number, number], b: [number, number, number]): number {
  const dot = vectorDot(a, b);
  const magA = vectorMagnitude(a);
  const magB = vectorMagnitude(b);
  if (magA === 0 || magB === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magB)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

export function vectorAdd(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vectorScale(
  v: [number, number, number],
  s: number
): [number, number, number] {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function isInBounds(
  point: [number, number, number],
  xRange: [number, number],
  yRange: [number, number],
  zRange: [number, number]
): boolean {
  return (
    point[0] >= xRange[0] &&
    point[0] <= xRange[1] &&
    point[1] >= yRange[0] &&
    point[1] <= yRange[1] &&
    point[2] >= zRange[0] &&
    point[2] <= zRange[1]
  );
}

export function calculateHash(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
