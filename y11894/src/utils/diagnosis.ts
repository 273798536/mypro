import type { DataPoint, DiagnosisResult, ResidualAnalysis, FitModel, FitResult } from './types';

export function diagnoseDivergence(fitResult: FitResult): {
  detected: boolean;
  reason: string;
} {
  if (fitResult.converged && fitResult.success) {
    return { detected: false, reason: '' };
  }

  const history = fitResult.residualHistory;
  if (history.length < 4) {
    return { detected: true, reason: '迭代初期即发散：初值可能远离最优解，尝试根据数据范围调整初值' };
  }

  const lastResidual = history[history.length - 1];
  const initialResidual = history[0];
  if (lastResidual > initialResidual * 10) {
    return { detected: true, reason: '残差大幅增长：模型函数可能与数据形态不匹配，或初值导致参数走向非预期区域' };
  }

  if (!fitResult.success && !fitResult.converged) {
    if (lastResidual > initialResidual * 0.5) {
      return { detected: true, reason: '初值发散已被拦截：迭代停滞，残差未显著下降。建议根据数据量级调整初值（如Y值范围设定L参数）' };
    }
    return { detected: true, reason: '迭代未收敛：可能因梯度消失、参数无约束或模型过参数化，建议收紧参数边界或更换模型' };
  }

  return { detected: false, reason: '' };
}

export function detectOutliers(
  model: FitModel,
  params: number[],
  xData: number[],
  yData: number[],
  threshold = 2
): DataPoint[] {
  const residuals = xData.map((x, i) => yData[i] - model.fn(params, x));
  const meanRes = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const stdRes = Math.sqrt(
    residuals.reduce((s, r) => s + (r - meanRes) ** 2, 0) / residuals.length
  );

  return xData.map((x, i) => ({
    x,
    y: yData[i],
    rowIndex: i + 1,
    residual: residuals[i],
    isOutlier: stdRes > 0 ? Math.abs((residuals[i] - meanRes) / stdRes) > threshold : false,
  }));
}

export function detectUnitAnomaly(yData: number[]): string | null {
  const positiveValues = yData.filter((y) => y > 0);
  if (positiveValues.length < 2) return null;

  const logValues = positiveValues.map((y) => Math.log10(y));
  const logMin = Math.min(...logValues);
  const logMax = Math.max(...logValues);
  const magnitudeSpan = logMax - logMin;

  if (magnitudeSpan > 3) {
    return `Y值跨越${magnitudeSpan.toFixed(1)}个数量级（10^${logMin.toFixed(1)} ~ 10^${logMax.toFixed(1)}），可能存在单位换算错误或混合了不同量纲的数据`;
  }

  const anyVerySmall = positiveValues.some((y) => y < 1e-6);
  const anyVeryLarge = positiveValues.some((y) => y > 1e6);
  if (anyVerySmall) {
    return '检测到极小Y值（< 1e-6），可能需要单位换算（如μm→mm）';
  }
  if (anyVeryLarge) {
    return '检测到极大Y值（> 1e6），可能需要单位换算（如nm→mm）';
  }

  return null;
}

export function runFullDiagnosis(
  model: FitModel,
  fitResult: FitResult,
  xData: number[],
  yData: number[]
): DiagnosisResult {
  const { detected: divergenceDetected, reason: divergenceReason } =
    diagnoseDivergence(fitResult);

  const outliers = fitResult.success
    ? detectOutliers(model, fitResult.parameters, xData, yData)
    : xData.map((x, i) => ({
        x,
        y: yData[i],
        rowIndex: i + 1,
        residual: 0,
        isOutlier: false,
      }));

  const outlierCount = outliers.filter((o) => o.isOutlier).length;
  const totalPoints = outliers.length;
  const outlierRatio = totalPoints > 0 ? outlierCount / totalPoints : 0;

  let outlierWarning: string | null = null;
  if (outlierRatio > 0.3) {
    outlierWarning = `离群点占比${(outlierRatio * 100).toFixed(0)}%（${outlierCount}/${totalPoints}），超过30%阈值，模型选择可能不当或数据质量存在问题`;
  } else if (outlierCount > 0) {
    outlierWarning = `检测到${outlierCount}个离群点（占${(outlierRatio * 100).toFixed(0)}%），已标记，详见列表`;
  }

  const unitAnomaly = detectUnitAnomaly(yData);

  let status: DiagnosisResult['status'] = 'pass';
  if (divergenceDetected) {
    status = 'fail';
  } else if (outlierWarning || unitAnomaly) {
    status = 'warning';
  }

  let summary: string;
  if (divergenceDetected) {
    summary = `⚠ 初值发散已被拦截。原因：${divergenceReason}`;
  } else if (outlierCount > 0 && unitAnomaly) {
    summary = `拟合已收敛，但存在${outlierCount}个离群点且数据量级异常（${unitAnomaly}），结论需谨慎`;
  } else if (outlierCount > 0) {
    summary = `拟合已收敛，存在${outlierCount}个离群点，建议核查后决定是否剔除`;
  } else if (unitAnomaly) {
    summary = `拟合已收敛且无离群点，但${unitAnomaly}`;
  } else {
    summary = '拟合正常收敛，无离群点，数据量级正常';
  }

  return {
    divergenceDetected,
    divergenceReason,
    outliers,
    outlierCount,
    totalPoints,
    outlierRatio,
    outlierWarning,
    unitAnomaly,
    summary,
    status,
  };
}

export function computeResidualAnalysis(
  model: FitModel,
  params: number[],
  xData: number[],
  yData: number[]
): ResidualAnalysis {
  const residuals = xData.map((x, i) => yData[i] - model.fn(params, x));
  const meanResidual = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const residualStdDev = Math.sqrt(
    residuals.reduce((s, r) => s + (r - meanResidual) ** 2, 0) / residuals.length
  );
  const standardizedResiduals = residuals.map((r) =>
    residualStdDev > 0 ? (r - meanResidual) / residualStdDev : 0
  );

  const n = xData.length;
  let positiveRuns = 0;
  let negativeRuns = 0;
  let currentSign = standardizedResiduals[0] >= 0;
  for (let i = 1; i < n; i++) {
    const sign = standardizedResiduals[i] >= 0;
    if (sign !== currentSign) {
      if (currentSign) positiveRuns++;
      else negativeRuns++;
      currentSign = sign;
    }
  }
  if (currentSign) positiveRuns++;
  else negativeRuns++;
  const totalRuns = positiveRuns + negativeRuns;

  const expectedRuns = n > 1 ? (2 * positiveRuns * negativeRuns) / n + 1 : 1;
  const hasPattern = totalRuns < expectedRuns * 0.7;

  let patternDescription: string | null = null;
  if (hasPattern) {
    const midPoint = Math.floor(n / 2);
    const firstHalfMean = standardizedResiduals.slice(0, midPoint).reduce((a, b) => a + b, 0) / midPoint;
    const secondHalfMean = standardizedResiduals.slice(midPoint).reduce((a, b) => a + b, 0) / (n - midPoint);
    if (Math.abs(secondHalfMean - firstHalfMean) > 0.5) {
      patternDescription = '残差呈系统性趋势：前后段均值偏移，模型可能遗漏系统性成分';
    } else {
      patternDescription = '残差游程数偏少：可能存在自相关或模型欠拟合';
    }
  }

  return {
    residuals,
    standardizedResiduals,
    meanResidual,
    residualStdDev,
    hasPattern,
    patternDescription,
  };
}

export function checkBoundaryTouch(
  params: number[],
  bounds: { lower: number; upper: number }[]
): boolean[] {
  const eps = 1e-6;
  return params.map((p, i) => {
    const lb = bounds[i]?.lower ?? -Infinity;
    const ub = bounds[i]?.upper ?? Infinity;
    return Math.abs(p - lb) < eps * Math.max(1, Math.abs(lb)) ||
           Math.abs(p - ub) < eps * Math.max(1, Math.abs(ub));
  });
}
