import { compile } from 'mathjs';
import type {
  IntegrationInput,
  BoundaryWarning,
  ChartDataPoint,
  IntegrationMethod,
} from '@/types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function detectBoundaryWarnings(
  input: IntegrationInput,
  evalFn: (x: number) => number
): BoundaryWarning[] {
  const warnings: BoundaryWarning[] = [];
  const { intervalA, intervalB, stepSize } = input;
  const a = Math.min(intervalA, intervalB);
  const b = Math.max(intervalA, intervalB);
  const intervalLen = b - a;

  if (intervalA > intervalB) {
    warnings.push({
      id: generateId(),
      type: 'reversed_interval',
      severity: 'warning',
      message: `区间反向：左端点 ${intervalA} > 右端点 ${intervalB}，计算时已自动校正为 [${a}, ${b}]`,
    });
  }

  const probeCount = Math.max(200, Math.ceil(intervalLen / (stepSize * 0.1)));
  const probeStep = intervalLen / probeCount;
  const SINGULARITY_THRESHOLD = 1e8;

  for (let i = 0; i <= probeCount; i++) {
    const x = a + i * probeStep;
    try {
      const val = evalFn(x);
      if (!isFinite(val) || Math.abs(val) > SINGULARITY_THRESHOLD) {
        warnings.push({
          id: generateId(),
          type: 'singularity',
          severity: 'error',
          message: `奇点附近：在 x = ${x.toFixed(6)} 处函数值 ${isFinite(val) ? val.toExponential(2) : '无穷大'}，积分结果可能不可靠`,
          position: x,
        });
        break;
      }
    } catch {
      warnings.push({
        id: generateId(),
        type: 'singularity',
        severity: 'error',
        message: `奇点附近：在 x = ${x.toFixed(6)} 处函数无法求值，积分结果可能不可靠`,
        position: x,
      });
      break;
    }
  }

  if (intervalLen > 0 && stepSize > intervalLen / 4) {
    warnings.push({
      id: generateId(),
      type: 'oversized_step',
      severity: 'warning',
      message: `步长过大：步长 ${stepSize} 超过区间长度 ${intervalLen.toFixed(4)} 的 1/4（${(intervalLen / 4).toFixed(4)}），近似精度可能不足`,
    });
  }

  return warnings;
}

export function compileExpression(expression: string): ((x: number) => number) | null {
  try {
    const compiled = compile(expression);
    return (x: number) => {
      const result = compiled.evaluate({ x });
      return typeof result === 'number' ? result : NaN;
    };
  } catch {
    return null;
  }
}

export function trapezoidalIntegrate(
  evalFn: (x: number) => number,
  a: number,
  b: number,
  stepSize: number
): number {
  const n = Math.max(1, Math.round((b - a) / stepSize));
  const h = (b - a) / n;
  let sum = evalFn(a) + evalFn(b);

  for (let i = 1; i < n; i++) {
    sum += 2 * evalFn(a + i * h);
  }

  return (h / 2) * sum;
}

export function simpsonIntegrate(
  evalFn: (x: number) => number,
  a: number,
  b: number,
  stepSize: number
): number {
  const rawN = Math.round((b - a) / stepSize);
  const n = rawN % 2 === 0 ? Math.max(2, rawN) : Math.max(2, rawN + 1);
  const h = (b - a) / n;
  let sum = evalFn(a) + evalFn(b);

  for (let i = 1; i < n; i++) {
    const coeff = i % 2 === 0 ? 2 : 4;
    sum += coeff * evalFn(a + i * h);
  }

  return (h / 3) * sum;
}

export function computeIntegration(input: IntegrationInput): {
  result: number;
  errorEstimate: number;
  chartData: ChartDataPoint[];
  warnings: BoundaryWarning[];
} {
  const evalFn = compileExpression(input.expression);
  if (!evalFn) {
    return {
      result: NaN,
      errorEstimate: NaN,
      chartData: [],
      warnings: [
        {
          id: generateId(),
          type: 'singularity',
          severity: 'error',
          message: `函数表达式 "${input.expression}" 无法解析`,
        },
      ],
    };
  }

  const warnings = detectBoundaryWarnings(input, evalFn);

  const a = Math.min(input.intervalA, input.intervalB);
  const b = Math.max(input.intervalA, input.intervalB);

  const chartData = generateChartData(evalFn, a, b, input.stepSize);

  let result: number;
  let comparisonResult: number;

  if (input.method === 'trapezoidal') {
    result = trapezoidalIntegrate(evalFn, a, b, input.stepSize);
    comparisonResult = trapezoidalIntegrate(evalFn, a, b, input.stepSize / 2);
  } else {
    result = simpsonIntegrate(evalFn, a, b, input.stepSize);
    comparisonResult = simpsonIntegrate(evalFn, a, b, input.stepSize / 2);
  }

  const errorEstimate = Math.abs(result - comparisonResult);

  return { result, errorEstimate, chartData, warnings };
}

function generateChartData(
  evalFn: (x: number) => number,
  a: number,
  b: number,
  stepSize: number
): ChartDataPoint[] {
  const points: ChartDataPoint[] = [];
  const plotSteps = Math.max(200, Math.ceil((b - a) / (stepSize * 0.05)));
  const dx = (b - a) / plotSteps;

  for (let i = 0; i <= plotSteps; i++) {
    const x = a + i * dx;
    try {
      const y = evalFn(x);
      if (isFinite(y)) {
        points.push({ x: parseFloat(x.toFixed(8)), y });
      }
    } catch {
      // skip
    }
  }

  return points;
}

export function generateReportText(
  expression: string,
  intervalA: number,
  intervalB: number,
  stepSize: number,
  method: IntegrationMethod,
  result: number,
  errorEstimate: number,
  warnings: BoundaryWarning[],
  notes: string
): string {
  const a = Math.min(intervalA, intervalB);
  const b = Math.max(intervalA, intervalB);
  const methodName = method === 'trapezoidal' ? '梯形法' : '辛普森法';

  const lines: string[] = [
    '═══════════════════════════════════════',
    '        积分近似误差教具 — 计算报告',
    '═══════════════════════════════════════',
    '',
    `函数表达式：f(x) = ${expression}`,
    `积分区间：[${intervalA}, ${intervalB}]${intervalA > intervalB ? '（反向，已校正为 [' + a + ', ' + b + ']）' : ''}`,
    `步长：${stepSize}`,
    `积分方法：${methodName}`,
    '',
    '─── 计算结果 ───',
    `积分近似值：${isNaN(result) ? '无法计算' : result.toPrecision(12)}`,
    `误差估计（与半步长结果对比）：${isNaN(errorEstimate) ? '无法估计' : errorEstimate.toExponential(6)}`,
    '',
  ];

  if (warnings.length > 0) {
    lines.push('─── 边界提示 ───');
    for (const w of warnings) {
      const typeLabel =
        w.type === 'singularity'
          ? '[奇点]'
          : w.type === 'reversed_interval'
            ? '[区间反向]'
            : '[步长过大]';
      const severityLabel = w.severity === 'error' ? '⚠ 严重' : '⚡ 注意';
      lines.push(`${typeLabel} ${severityLabel}: ${w.message}`);
    }
    lines.push('');
  }

  if (notes.trim()) {
    lines.push('─── 课堂备注 ───');
    lines.push(notes);
    lines.push('');
  }

  lines.push(`报告生成时间：${new Date().toLocaleString('zh-CN')}`);
  lines.push('═══════════════════════════════════════');

  return lines.join('\n');
}
