import { parse, evaluate } from 'mathjs';
import type { VectorFieldFormula } from '@/types';
import { vectorMagnitude } from '@/utils/math';

interface CompiledFormula {
  fx: string;
  fy: string;
  fz: string;
}

const compiledCache = new Map<string, CompiledFormula>();

const ALLOWED_FUNCTIONS = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'sqrt', 'cbrt', 'exp', 'log', 'log2', 'log10',
  'abs', 'sign', 'ceil', 'floor', 'round', 'trunc',
  'min', 'max', 'pow', 'mod',
];

function validateExpression(expr: string): boolean {
  const stack: string[] = [];
  const tokens = expr.match(/[a-zA-Z_]\w*|\(|\)|[+\-*/^]|\d+\.?\d*|\s+/g) || [];
  
  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    
    if (trimmed === '(') {
      stack.push(trimmed);
    } else if (trimmed === ')') {
      if (stack.pop() !== '(') return false;
    } else if (/^[a-zA-Z_]\w*$/.test(trimmed)) {
      if (!['x', 'y', 'z', 'pi', 'e', ...ALLOWED_FUNCTIONS].includes(trimmed)) {
        return false;
      }
    }
  }
  
  return stack.length === 0;
}

function compileFormula(formula: VectorFieldFormula): CompiledFormula {
  const cached = compiledCache.get(formula.id);
  if (cached) return cached;
  
  if (!validateExpression(formula.fx) || 
      !validateExpression(formula.fy) || 
      !validateExpression(formula.fz)) {
    throw new Error('Invalid formula expression contains disallowed functions');
  }
  
  parse(formula.fx);
  parse(formula.fy);
  parse(formula.fz);
  
  const compiled: CompiledFormula = {
    fx: formula.fx,
    fy: formula.fy,
    fz: formula.fz,
  };
  
  compiledCache.set(formula.id, compiled);
  return compiled;
}

export function evaluateVectorField(
  x: number,
  y: number,
  z: number,
  formula: VectorFieldFormula
): [number, number, number] {
  try {
    const compiled = compileFormula(formula);
    const scope = { x, y, z, pi: Math.PI, e: Math.E };
    
    const vx = evaluate(compiled.fx, scope) as number;
    const vy = evaluate(compiled.fy, scope) as number;
    const vz = evaluate(compiled.fz, scope) as number;
    
    if (!isFinite(vx) || !isFinite(vy) || !isFinite(vz)) {
      throw new Error('Non-finite value encountered');
    }
    
    return [vx, vy, vz];
  } catch (error) {
    return [NaN, NaN, NaN];
  }
}

export function evaluateVectorFieldSafe(
  x: number,
  y: number,
  z: number,
  formula: VectorFieldFormula,
  maxMagnitude: number = 1000
): [number, number, number] {
  const [vx, vy, vz] = evaluateVectorField(x, y, z, formula);
  
  if (isNaN(vx) || isNaN(vy) || isNaN(vz)) {
    return [0, 0, 0];
  }
  
  const mag = vectorMagnitude([vx, vy, vz]);
  if (mag > maxMagnitude) {
    const scale = maxMagnitude / mag;
    return [vx * scale, vy * scale, vz * scale];
  }
  
  return [vx, vy, vz];
}

export function validateFormula(formula: VectorFieldFormula): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!validateExpression(formula.fx)) {
    errors.push('X分量公式包含非法字符或函数');
  }
  if (!validateExpression(formula.fy)) {
    errors.push('Y分量公式包含非法字符或函数');
  }
  if (!validateExpression(formula.fz)) {
    errors.push('Z分量公式包含非法字符或函数');
  }
  
  try {
    const midX = (formula.params.xRange[0] + formula.params.xRange[1]) / 2;
    const midY = (formula.params.yRange[0] + formula.params.yRange[1]) / 2;
    const midZ = (formula.params.zRange[0] + formula.params.zRange[1]) / 2;
    
    const result = evaluateVectorField(midX, midY, midZ, formula);
    if (result.some(v => isNaN(v))) {
      errors.push('公式在参数范围内计算失败');
    }
  } catch (error) {
    errors.push('公式编译失败: ' + (error as Error).message);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function clearFormulaCache(): void {
  compiledCache.clear();
}
