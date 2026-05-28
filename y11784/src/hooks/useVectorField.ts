import { useState, useMemo, useCallback } from 'react';
import type { VectorField, Point2D } from '@/types';
import { parseVectorField, validateExpression, type ParsedExpression } from '@/utils/math/expressionParser';

export function useVectorField(vectorField: VectorField | null) {
  const [parseError, setParseError] = useState<string | null>(null);

  const parsedField = useMemo<ParsedExpression | null>(() => {
    if (!vectorField) {
      setParseError(null);
      return null;
    }

    if (!validateExpression(vectorField.expressionX)) {
      setParseError('X 分量表达式无效');
      return null;
    }
    if (!validateExpression(vectorField.expressionY)) {
      setParseError('Y 分量表达式无效');
      return null;
    }

    const parsed = parseVectorField(vectorField.expressionX, vectorField.expressionY);
    if (!parsed) {
      setParseError('表达式解析失败');
      return null;
    }

    setParseError(null);
    return parsed;
  }, [vectorField]);

  const evaluateAt = useCallback(
    (point: Point2D) => {
      if (!parsedField) return { x: 0, y: 0 };
      try {
        return parsedField.evaluate(point);
      } catch {
        return { x: 0, y: 0 };
      }
    },
    [parsedField]
  );

  const generateGridVectors = useCallback(
    (gridSize: number = 10): Array<{ point: Point2D; vector: { x: number; y: number }; magnitude: number }> => {
      if (!vectorField || !parsedField) return [];

      const { minX, maxX, minY, maxY } = vectorField.range;
      const stepX = (maxX - minX) / gridSize;
      const stepY = (maxY - minY) / gridSize;

      const vectors: Array<{
        point: Point2D;
        vector: { x: number; y: number };
        magnitude: number;
      }> = [];

      for (let i = 0; i <= gridSize; i++) {
        for (let j = 0; j <= gridSize; j++) {
          const point = {
            x: minX + i * stepX,
            y: minY + j * stepY,
          };
          const vector = evaluateAt(point);
          const magnitude = Math.sqrt(vector.x ** 2 + vector.y ** 2);
          vectors.push({ point, vector, magnitude });
        }
      }

      return vectors;
    },
    [vectorField, parsedField, evaluateAt]
  );

  return {
    parsedField,
    parseError,
    evaluateAt,
    generateGridVectors,
    isValid: parsedField !== null && parseError === null,
  };
}
