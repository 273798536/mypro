export function normalize(value: number, fromRange: [number, number], toRange: [number, number]): number {
  const [fromMin, fromMax] = fromRange;
  const [toMin, toMax] = toRange;
  
  if (fromMax === fromMin) return (toMin + toMax) / 2;
  
  const normalized = (value - fromMin) / (fromMax - fromMin);
  return toMin + normalized * (toMax - toMin);
}

export function denormalize(value: number, fromRange: [number, number], toRange: [number, number]): number {
  return normalize(value, fromRange, toRange);
}

export function distance3D(
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function std(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const squaredDiffs = values.map(v => Math.pow(v - m, 2));
  return Math.sqrt(mean(squaredDiffs));
}

export function maxDrawdown(returns: number[]): number {
  if (returns.length === 0) return 0;
  
  let peak = returns[0];
  let maxDD = 0;
  
  for (const r of returns) {
    peak = Math.max(peak, r);
    const drawdown = (peak - r) / peak;
    maxDD = Math.max(maxDD, drawdown);
  }
  
  return maxDD;
}

export function calculateConcentration(assets: { weight: number }[]): number {
  if (assets.length === 0) return 0;
  
  const totalWeight = assets.reduce((sum, a) => sum + Math.abs(a.weight), 0);
  if (totalWeight === 0) return 0;
  
  const weights = assets.map(a => Math.abs(a.weight) / totalWeight);
  const sumSquares = weights.reduce((sum, w) => sum + w * w, 0);
  
  return Math.sqrt(sumSquares);
}

export function randomNormal(mean: number = 0, std: number = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * std;
}

export function randomLogNormal(mean: number, std: number): number {
  const normal = randomNormal(0, 1);
  return Math.exp(mean + std * normal);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getBounds(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  return [min, max];
}
