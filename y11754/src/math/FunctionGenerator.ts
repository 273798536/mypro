import type { MathFunction } from '../types';
import { findExtremumPoints } from './ExtremumDetector';
import { findAllSpecialPoints } from './SpecialPointHandler';
import { calculateDerivative } from './DerivativeCalculator';

export const functionTemplates: MathFunction[] = [
  {
    id: 'linear_1',
    expression: '2 * x + 1',
    displayExpression: 'y = 2x + 1',
    domain: [-5, 5],
    range: [-9, 11],
    derivative: '2',
    specialPoints: [],
    difficulty: 'easy'
  },
  {
    id: 'linear_2',
    expression: '-3 * x + 2',
    displayExpression: 'y = -3x + 2',
    domain: [-5, 5],
    range: [-13, 17],
    derivative: '-3',
    specialPoints: [],
    difficulty: 'easy'
  },
  {
    id: 'quadratic_1',
    expression: 'x^2 - 4',
    displayExpression: 'y = x² - 4',
    domain: [-4, 4],
    range: [-4, 12],
    derivative: '2 * x',
    specialPoints: [],
    difficulty: 'easy'
  },
  {
    id: 'quadratic_2',
    expression: '-x^2 + 4 * x',
    displayExpression: 'y = -x² + 4x',
    domain: [-1, 5],
    range: [-5, 4],
    derivative: '-2 * x + 4',
    specialPoints: [],
    difficulty: 'easy'
  },
  {
    id: 'cubic_1',
    expression: 'x^3 - 3 * x',
    displayExpression: 'y = x³ - 3x',
    domain: [-3, 3],
    range: [-2, 2],
    derivative: '3 * x^2 - 3',
    specialPoints: [],
    difficulty: 'medium'
  },
  {
    id: 'cubic_2',
    expression: '-x^3 + 3 * x^2',
    displayExpression: 'y = -x³ + 3x²',
    domain: [-1, 4],
    range: [-4, 4],
    derivative: '-3 * x^2 + 6 * x',
    specialPoints: [],
    difficulty: 'medium'
  },
  {
    id: 'sin_1',
    expression: 'sin(x)',
    displayExpression: 'y = sin(x)',
    domain: [-Math.PI * 2, Math.PI * 2],
    range: [-1, 1],
    derivative: 'cos(x)',
    specialPoints: [],
    difficulty: 'medium'
  },
  {
    id: 'cos_1',
    expression: 'cos(x)',
    displayExpression: 'y = cos(x)',
    domain: [-Math.PI * 2, Math.PI * 2],
    range: [-1, 1],
    derivative: '-sin(x)',
    specialPoints: [],
    difficulty: 'medium'
  },
  {
    id: 'abs_1',
    expression: 'abs(x)',
    displayExpression: 'y = |x|',
    domain: [-5, 5],
    range: [0, 5],
    specialPoints: [],
    difficulty: 'medium'
  },
  {
    id: 'abs_2',
    expression: 'abs(x - 2) + 1',
    displayExpression: 'y = |x - 2| + 1',
    domain: [-3, 7],
    range: [1, 6],
    specialPoints: [],
    difficulty: 'medium'
  },
  {
    id: 'sqrt_1',
    expression: 'sqrt(x)',
    displayExpression: 'y = √x',
    domain: [0, 10],
    range: [0, 3.16],
    derivative: '1 / (2 * sqrt(x))',
    specialPoints: [],
    difficulty: 'medium'
  },
  {
    id: 'exp_1',
    expression: 'e^x',
    displayExpression: 'y = eˣ',
    domain: [-3, 2],
    range: [0.05, 7.39],
    derivative: 'e^x',
    specialPoints: [],
    difficulty: 'medium'
  },
  {
    id: 'ln_1',
    expression: 'log(x)',
    displayExpression: 'y = ln(x)',
    domain: [0.1, 5],
    range: [-2.3, 1.6],
    derivative: '1 / x',
    specialPoints: [],
    difficulty: 'medium'
  },
  {
    id: 'rational_1',
    expression: '1 / x',
    displayExpression: 'y = 1/x',
    domain: [-5, 5],
    range: [-5, 5],
    derivative: '-1 / x^2',
    specialPoints: [],
    difficulty: 'hard'
  },
  {
    id: 'poly_hard_1',
    expression: 'x^4 - 2 * x^2',
    displayExpression: 'y = x⁴ - 2x²',
    domain: [-2, 2],
    range: [-1, 2],
    derivative: '4 * x^3 - 4 * x',
    specialPoints: [],
    difficulty: 'hard'
  },
  {
    id: 'composite_1',
    expression: 'sin(x^2)',
    displayExpression: 'y = sin(x²)',
    domain: [-3, 3],
    range: [-1, 1],
    derivative: '2 * x * cos(x^2)',
    specialPoints: [],
    difficulty: 'hard'
  }
];

export function generateFunctionById(id: string): MathFunction | null {
  const template = functionTemplates.find(f => f.id === id);
  if (!template) return null;

  const func = { ...template };

  if (!func.derivative) {
    func.derivative = calculateDerivative(func.expression);
  }

  const extrema = findExtremumPoints(func.expression, func.domain);
  const specialPoints = findAllSpecialPoints(func.expression, func.domain);

  func.specialPoints = [...extrema, ...specialPoints];

  return func;
}

export function generateRandomFunction(
  difficulty?: 'easy' | 'medium' | 'hard',
  excludeIds: string[] = []
): MathFunction {
  let candidates = functionTemplates.filter(f => !excludeIds.includes(f.id));

  if (difficulty) {
    candidates = candidates.filter(f => f.difficulty === difficulty);
  }

  if (candidates.length === 0) {
    candidates = functionTemplates;
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  const selected = candidates[randomIndex];

  return generateFunctionById(selected.id)!;
}

export function generateFunctionsForLevel(
  levelId: number,
  count: number
): MathFunction[] {
  const difficultyMap: Record<number, 'easy' | 'medium' | 'hard'> = {
    1: 'easy',
    2: 'easy',
    3: 'medium',
    4: 'medium',
    5: 'medium',
    6: 'hard',
    7: 'hard',
    8: 'hard'
  };

  const difficulty = difficultyMap[levelId] || 'medium';
  const functions: MathFunction[] = [];
  const usedIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const func = generateRandomFunction(difficulty, usedIds);
    functions.push(func);
    usedIds.push(func.id);
  }

  return functions;
}

export function getDifficultyLabel(difficulty: 'easy' | 'medium' | 'hard'): string {
  const labels: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  };
  return labels[difficulty] || difficulty;
}

export function getDifficultyColor(difficulty: 'easy' | 'medium' | 'hard'): string {
  const colors: Record<string, string> = {
    easy: '#51cf66',
    medium: '#ffd43b',
    hard: '#ff6b6b'
  };
  return colors[difficulty] || '#666';
}
