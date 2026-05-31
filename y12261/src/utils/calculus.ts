import { Axis, SliceData } from '@/types/game';

export function evaluateFunction(expr: string, x: number): number {
  try {
    const safeExpr = expr
      .replace(/\^/g, '**')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/exp/g, 'Math.exp')
      .replace(/log/g, 'Math.log')
      .replace(/abs/g, 'Math.abs')
      .replace(/pi/gi, 'Math.PI');
    
    const result = new Function('x', `return ${safeExpr}`)(x);
    return typeof result === 'number' && isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

export function generateSlices(
  expr: string,
  interval: [number, number],
  sliceCount: number,
  axis: Axis
): SliceData[] {
  const [a, b] = interval;
  const thickness = (b - a) / sliceCount;
  const slices: SliceData[] = [];

  for (let i = 0; i < sliceCount; i++) {
    const x = a + i * thickness + thickness / 2;
    const radius = Math.abs(evaluateFunction(expr, x));
    const volume = Math.PI * radius * radius * thickness;

    slices.push({
      index: i,
      x,
      radius,
      volume,
      thickness,
    });
  }

  return slices;
}

export function calculateVolume(slices: SliceData[]): number {
  return slices.reduce((sum, slice) => sum + slice.volume, 0);
}

export function calculateErrorPercentage(
  calculated: number,
  actual: number
): number {
  if (actual === 0) return calculated === 0 ? 0 : 100;
  return Math.abs((calculated - actual) / actual) * 100;
}

export function simpsonsRule(
  expr: string,
  interval: [number, number],
  n: number = 1000
): number {
  const [a, b] = interval;
  const h = (b - a) / n;
  
  let sum = evaluateFunction(expr, a) ** 2 + evaluateFunction(expr, b) ** 2;
  
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    const y = evaluateFunction(expr, x) ** 2;
    sum += (i % 2 === 0 ? 2 : 4) * y;
  }
  
  return Math.PI * (h / 3) * sum;
}

export function getAccuracyScore(errorPercentage: number): number {
  if (errorPercentage < 1) return 30;
  if (errorPercentage < 3) return 25;
  if (errorPercentage < 5) return 20;
  if (errorPercentage < 10) return 15;
  if (errorPercentage < 20) return 10;
  return Math.max(0, 30 - Math.floor(errorPercentage / 2));
}

export function getGrade(totalScore: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (totalScore >= 90) return 'A';
  if (totalScore >= 80) return 'B';
  if (totalScore >= 70) return 'C';
  if (totalScore >= 60) return 'D';
  return 'F';
}

export function formatNumber(num: number, decimals: number = 4): string {
  return num.toFixed(decimals);
}

export function generateFunctionPoints(
  expr: string,
  interval: [number, number],
  points: number = 200
): Array<{ x: number; y: number }> {
  const [a, b] = interval;
  const step = (b - a) / points;
  const result: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= points; i++) {
    const x = a + i * step;
    const y = evaluateFunction(expr, x);
    result.push({ x, y });
  }

  return result;
}
