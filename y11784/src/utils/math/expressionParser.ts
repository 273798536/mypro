import { evaluate, parse, type MathNode } from 'mathjs';
import type { Point2D } from '@/types';

export interface VectorFieldFunction {
  (point: Point2D): { x: number; y: number };
}

export interface ParsedExpression {
  nodeX: MathNode;
  nodeY: MathNode;
  evaluate: VectorFieldFunction;
  expressionX: string;
  expressionY: string;
}

export function parseVectorField(
  expressionX: string,
  expressionY: string
): ParsedExpression | null {
  try {
    const nodeX = parse(expressionX);
    const nodeY = parse(expressionY);

    const evaluateFn: VectorFieldFunction = (point: Point2D) => {
      const scope = { x: point.x, y: point.y };
      return {
        x: evaluate(expressionX, scope) as number,
        y: evaluate(expressionY, scope) as number,
      };
    };

    return {
      nodeX,
      nodeY,
      evaluate: evaluateFn,
      expressionX,
      expressionY,
    };
  } catch {
    return null;
  }
}

export function validateExpression(expression: string): boolean {
  try {
    parse(expression);
    const scope = { x: 1, y: 1 };
    const result = evaluate(expression, scope);
    return typeof result === 'number' && isFinite(result);
  } catch {
    return false;
  }
}

export function generateSamplePoints(
  start: Point2D,
  end: Point2D,
  count: number
): Point2D[] {
  const points: Point2D[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    points.push({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    });
  }
  return points;
}

export function evaluateAlongPath(
  vectorField: VectorFieldFunction,
  points: Point2D[]
): Array<{ point: Point2D; vector: { x: number; y: number } }> {
  return points.map((point) => ({
    point,
    vector: vectorField(point),
  }));
}
