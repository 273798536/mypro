import { Point } from '@/types';

export function evaluateFunction(expr: string, x: number): number | null {
  try {
    const cleanExpr = expr
      .replace(/\s/g, '')
      .replace(/y\s*=\s*/i, '')
      .replace(/\^/g, '**')
      .replace(/sin\(/g, 'Math.sin(')
      .replace(/cos\(/g, 'Math.cos(')
      .replace(/tan\(/g, 'Math.tan(')
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/abs\(/g, 'Math.abs(')
      .replace(/log\(/g, 'Math.log(')
      .replace(/exp\(/g, 'Math.exp(')
      .replace(/pi/gi, 'Math.PI')
      .replace(/e(?![x])/gi, 'Math.E');

    const func = new Function('x', `return ${cleanExpr}`);
    const result = func(x);
    
    if (typeof result === 'number' && isFinite(result)) {
      return Math.round(result * 100) / 100;
    }
    return null;
  } catch {
    return null;
  }
}

export function generateFunctionPoints(
  expr: string,
  xMin: number,
  xMax: number,
  step: number = 0.1
): Point[] {
  const points: Point[] = [];
  
  for (let x = xMin; x <= xMax; x += step) {
    const y = evaluateFunction(expr, x);
    if (y !== null) {
      points.push({ x: Math.round(x * 10) / 10, y });
    }
  }
  
  return points;
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}
