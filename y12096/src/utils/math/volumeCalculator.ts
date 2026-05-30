import type { CalculationMethod, CalculationResult, CalculationStep } from '../../types/params';
import { parseFunction } from './functionParser';

export function calculateVolume(
  functionExpr: string,
  a: number,
  b: number,
  method: CalculationMethod,
  axis: 'x' | 'y' | 'custom',
  axisOffset: number = 0,
  precision: number = 2000
): CalculationResult {
  const func = parseFunction(functionExpr);
  const actualA = Math.min(a, b);
  const actualB = Math.max(a, b);

  if (method === 'disk') {
    return calculateVolumeDisk(func, functionExpr, actualA, actualB, axis, axisOffset, precision);
  } else {
    return calculateVolumeShell(func, functionExpr, actualA, actualB, axis, axisOffset, precision);
  }
}

function calculateVolumeDisk(
  func: (x: number) => number,
  expr: string,
  a: number,
  b: number,
  axis: 'x' | 'y' | 'custom',
  axisOffset: number,
  n: number
): CalculationResult {
  const dx = (b - a) / n;
  let volume = 0;
  const sliceAreas: number[] = [];

  for (let i = 0; i < n; i++) {
    const x = a + i * dx;
    const y = func(x);
    let radius: number;

    if (axis === 'x') {
      radius = Math.abs(y - axisOffset);
    } else if (axis === 'y') {
      radius = Math.abs(x - axisOffset);
    } else {
      radius = Math.abs(y - axisOffset);
    }

    const area = Math.PI * radius * radius;
    sliceAreas.push(area);
    volume += area * dx;
  }

  const axisLabel = axis === 'x' ? 'X' : axis === 'y' ? 'Y' : `y=${axisOffset}`;
  const steps: CalculationStep[] = [
    {
      description: '确定积分区间',
      formula: `x \\in [${a}, ${b}]`,
    },
    {
      description: `选择绕${axisLabel}轴旋转，使用圆盘法`,
      formula: `V = \\pi \\int_{${a}}^{${b}} [f(x)]^2 dx`,
    },
    {
      description: '函数表达式',
      formula: `f(x) = ${expr}`,
    },
    {
      description: '数值积分计算结果',
      formula: `V \\approx ${volume.toFixed(6)}`,
      value: volume,
    },
  ];

  return { volume, method: 'disk', steps, sliceAreas };
}

function calculateVolumeShell(
  func: (x: number) => number,
  expr: string,
  a: number,
  b: number,
  axis: 'x' | 'y' | 'custom',
  axisOffset: number,
  n: number
): CalculationResult {
  const dx = (b - a) / n;
  let volume = 0;
  const sliceAreas: number[] = [];

  for (let i = 0; i < n; i++) {
    const x = a + i * dx;
    const y = func(x);
    let radius: number;
    let height: number;

    if (axis === 'x') {
      radius = Math.abs(y - axisOffset);
      height = dx;
    } else if (axis === 'y') {
      radius = Math.abs(x - axisOffset);
      height = Math.abs(y);
    } else {
      radius = Math.abs(x - axisOffset);
      height = Math.abs(y);
    }

    const circumference = 2 * Math.PI * radius;
    const shellArea = circumference * height;
    sliceAreas.push(shellArea);
    volume += shellArea * dx;
  }

  const axisLabel = axis === 'x' ? 'X' : axis === 'y' ? 'Y' : `x=${axisOffset}`;
  const steps: CalculationStep[] = [
    {
      description: '确定积分区间',
      formula: `x \\in [${a}, ${b}]`,
    },
    {
      description: `选择绕${axisLabel}轴旋转，使用壳层法`,
      formula: `V = 2\\pi \\int_{${a}}^{${b}} x \\cdot f(x) dx`,
    },
    {
      description: '函数表达式',
      formula: `f(x) = ${expr}`,
    },
    {
      description: '数值积分计算结果',
      formula: `V \\approx ${volume.toFixed(6)}`,
      value: volume,
    },
  ];

  return { volume, method: 'shell', steps, sliceAreas };
}

export function getVolumeForDisplay(volume: number): string {
  if (Math.abs(volume) < 0.000001) return '0';
  if (Math.abs(volume) >= 1000) return volume.toFixed(2);
  return volume.toFixed(6);
}
