import type {
  ErrorAnalysis,
  ErrorType,
  CriticalPoint,
  Interval,
  SignInterval
} from '@/types';
import { PointType, ErrorType as ErrorTypeEnum } from '@/types';
import { checkDomainCoverage, formatInterval } from '../math/signAnalysis';

const EPSILON = 1e-4;

export function detectErrors(
  expression: string,
  domain: Interval[],
  standardCriticalPoints: CriticalPoint[],
  standardSignIntervals: SignInterval[],
  studentCriticalPoints: CriticalPoint[],
  studentSignIntervals: SignInterval[],
  nonDifferentiablePoints: number[] = []
): ErrorAnalysis[] {
  const errors: ErrorAnalysis[] = [];

  errors.push(...checkDomainErrors(domain, standardCriticalPoints));
  errors.push(...checkNonDifferentiablePointErrors(nonDifferentiablePoints, studentCriticalPoints));
  errors.push(...checkExtremaInflectionConfusion(studentCriticalPoints));
  errors.push(...checkCriticalPointErrors(standardCriticalPoints, studentCriticalPoints));
  errors.push(...checkSignIntervalErrors(standardSignIntervals, studentSignIntervals));

  return errors.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

function checkDomainErrors(
  domain: Interval[],
  criticalPoints: CriticalPoint[]
): ErrorAnalysis[] {
  const errors: ErrorAnalysis[] = [];
  
  const { covered, uncoveredPoints } = checkDomainCoverage(
    criticalPoints.map(p => p.x),
    domain
  );

  if (!covered) {
    errors.push({
      id: generateId(),
      type: 'domain_missing' as ErrorType,
      description: `定义域不完整，${uncoveredPoints.length} 个临界点位于定义域外`,
      location: { x: uncoveredPoints[0] },
      severity: 'high',
      suggestion: '请检查定义域设置，确保包含所有临界点。建议使用 (-∞, +∞) 或检查端点是否正确。',
      isResolved: false
    });
  }

  return errors;
}

function checkNonDifferentiablePointErrors(
  nonDifferentiablePoints: number[],
  studentPoints: CriticalPoint[]
): ErrorAnalysis[] {
  const errors: ErrorAnalysis[] = [];
  
  const missedPoints = nonDifferentiablePoints.filter(nd =>
    !studentPoints.some(sp =>
      sp.type === 'non_differentiable' && Math.abs(sp.x - nd) < EPSILON
    )
  );

  if (missedPoints.length > 0) {
    errors.push({
      id: generateId(),
      type: 'non_diff_ignored' as ErrorType,
      description: `忽略了 ${missedPoints.length} 个不可导点：${missedPoints.map(p => `x=${p.toFixed(2)}`).join(', ')}`,
      location: { x: missedPoints[0] },
      severity: 'high',
      suggestion: '不可导点也可能是极值点！请检查函数在这些点是否有定义，并分析左右导数符号变化。',
      isResolved: false
    });
  }

  return errors;
}

function checkExtremaInflectionConfusion(
  studentPoints: CriticalPoint[]
): ErrorAnalysis[] {
  const errors: ErrorAnalysis[] = [];
  
  const confusedPoints = studentPoints.filter(p => {
    if (p.type === 'critical') return false;
    const actualType = getActualType(p);
    return p.type !== actualType && actualType !== 'critical';
  });

  if (confusedPoints.length > 0) {
    const examples = confusedPoints.slice(0, 3).map(p =>
      `x=${p.x.toFixed(2)}: 标记为${getPointTypeName(p.type)}，实际是${getPointTypeName(getActualType(p))}`
    );
    
    errors.push({
      id: generateId(),
      type: 'extrema_inflection_confused' as ErrorType,
      description: `${confusedPoints.length} 个点类型判断错误：${examples.join('；')}`,
      location: { x: confusedPoints[0].x },
      severity: 'medium',
      suggestion: '极值点看一阶导数变号，或二阶导数符号；拐点看二阶导数变号。注意：极值点不一定是拐点，反之亦然！',
      isResolved: false
    });
  }

  return errors;
}

function getActualType(point: CriticalPoint): PointType {
  if (point.secondDerivativeSign === 'positive') return PointType.MINIMUM;
  if (point.secondDerivativeSign === 'negative') return PointType.MAXIMUM;
  if (point.secondDerivativeSign === 'zero') return PointType.INFLECTION;
  return point.type;
}

function getPointTypeName(type: PointType): string {
  const names: Record<PointType, string> = {
    critical: '临界点',
    maximum: '极大值点',
    minimum: '极小值点',
    inflection: '拐点',
    non_differentiable: '不可导点'
  };
  return names[type];
}

function checkCriticalPointErrors(
  standardPoints: CriticalPoint[],
  studentPoints: CriticalPoint[]
): ErrorAnalysis[] {
  const errors: ErrorAnalysis[] = [];
  
  const missedPoints = standardPoints.filter(sp =>
    !studentPoints.some(cp => Math.abs(cp.x - sp.x) < EPSILON)
  );

  const extraPoints = studentPoints.filter(cp =>
    !standardPoints.some(sp => Math.abs(sp.x - cp.x) < EPSILON)
  );

  if (missedPoints.length > 0) {
    errors.push({
      id: generateId(),
      type: 'calculation_error' as ErrorType,
      description: `漏掉了 ${missedPoints.length} 个临界点：${missedPoints.map(p => `x=${p.x.toFixed(2)}`).join(', ')}`,
      location: { x: missedPoints[0].x },
      severity: 'high',
      suggestion: '解方程 f\'(x) = 0 时注意检查是否有遗漏的解。建议检查导数表达式是否正确。',
      isResolved: false
    });
  }

  if (extraPoints.length > 0) {
    errors.push({
      id: generateId(),
      type: 'calculation_error' as ErrorType,
      description: `多算了 ${extraPoints.length} 个临界点：${extraPoints.map(p => `x=${p.x.toFixed(2)}`).join(', ')}`,
      location: { x: extraPoints[0].x },
      severity: 'medium',
      suggestion: '这些点处 f\'(x) ≠ 0，请检查计算过程。注意：不是所有解方程得到的点都是临界点。',
      isResolved: false
    });
  }

  return errors;
}

function checkSignIntervalErrors(
  standardIntervals: SignInterval[],
  studentIntervals: SignInterval[]
): ErrorAnalysis[] {
  const errors: ErrorAnalysis[] = [];
  
  let wrongIntervals = 0;
  let exampleInterval: Interval | null = null;

  standardIntervals.forEach(std => {
    const matchingStudent = studentIntervals.find(stu =>
      Math.abs(stu.interval.start - std.interval.start) < EPSILON &&
      Math.abs(stu.interval.end - std.interval.end) < EPSILON
    );

    if (matchingStudent && matchingStudent.sign !== std.sign) {
      wrongIntervals++;
      if (!exampleInterval) {
        exampleInterval = std.interval;
      }
    }
  });

  if (wrongIntervals > 0) {
    errors.push({
      id: generateId(),
      type: 'wrong_sign_interval' as ErrorType,
      description: `${wrongIntervals} 个区间的导数符号判断错误`,
      location: exampleInterval ? { interval: exampleInterval } : undefined,
      severity: 'medium',
      suggestion: '符号判断错误可能导致极值类型判断错误！建议用测试点验证每个区间的导数符号。',
      isResolved: false
    });
  }

  return errors;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function getErrorTypeName(type: ErrorType): string {
  const names: Record<ErrorType, string> = {
    domain_missing: '定义域遗漏',
    non_diff_ignored: '不可导点忽略',
    extrema_inflection_confused: '极值与拐点混淆',
    wrong_sign_interval: '符号区间错误',
    calculation_error: '计算错误'
  };
  return names[type];
}

export function formatErrorLocation(error: ErrorAnalysis): string {
  if (error.location?.x !== undefined) {
    return `x = ${error.location.x.toFixed(4)}`;
  }
  if (error.location?.interval) {
    return formatInterval(error.location.interval);
  }
  return '';
}

export function generateStudentReport(
  errors: ErrorAnalysis[],
  studentName: string
): string {
  const unresolvedErrors = errors.filter(e => !e.isResolved);
  const resolvedErrors = errors.filter(e => e.isResolved);
  
  let report = `${studentName}同学的函数极值题错题分析报告\n`;
  report += '='.repeat(50) + '\n\n';
  
  report += `错误总数：${errors.length} 个\n`;
  report += `已修正：${resolvedErrors.length} 个\n`;
  report += `待改进：${unresolvedErrors.length} 个\n\n`;
  
  if (unresolvedErrors.length > 0) {
    report += '需要重点复习的错误类型：\n';
    report += '-'.repeat(30) + '\n';
    
    unresolvedErrors.forEach((error, index) => {
      report += `${index + 1}. ${getErrorTypeName(error.type)}\n`;
      report += `   ${error.description}\n`;
      report += `   建议：${error.suggestion}\n\n`;
    });
  }
  
  report += '继续加油！记住：导数符号决定单调性，二阶导数决定凹凸性。\n';
  
  return report;
}
