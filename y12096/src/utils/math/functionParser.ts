import { evaluate, parse, MathNode } from 'mathjs';

export function parseFunction(expr: string): (x: number) => number {
  try {
    const node = parse(expr);
    return (x: number): number => {
      try {
        const result = node.evaluate({ x });
        return typeof result === 'number' ? result : 0;
      } catch {
        return 0;
      }
    };
  } catch {
    return () => 0;
  }
}

export function validateFunction(expr: string): { valid: boolean; error?: string } {
  if (!expr.trim()) {
    return { valid: false, error: '函数表达式不能为空' };
  }
  try {
    const node = parse(expr);
    const testResult = node.evaluate({ x: 1 });
    if (typeof testResult !== 'number') {
      return { valid: false, error: '函数必须返回数值' };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : '函数表达式无效' };
  }
}

export function evaluateAt(expr: string, x: number): number {
  try {
    const result = evaluate(expr, { x });
    return typeof result === 'number' ? result : NaN;
  } catch {
    return NaN;
  }
}

export function functionToLatex(expr: string): string {
  try {
    const node = parse(expr);
    return node.toTex();
  } catch {
    return expr;
  }
}

export function generateFunctionPoints(
  func: (x: number) => number,
  a: number,
  b: number,
  samples: number = 200
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const step = (b - a) / samples;
  for (let i = 0; i <= samples; i++) {
    const x = a + i * step;
    const y = func(x);
    if (isFinite(y)) {
      points.push([x, y]);
    }
  }
  return points;
}
