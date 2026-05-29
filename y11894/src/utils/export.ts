import type { FitModel, FitResult, DiagnosisResult, ResidualAnalysis } from './types';

export function generateTextReport(
  model: FitModel,
  fitResult: FitResult,
  diagnosis: DiagnosisResult,
  residualAnalysis: ResidualAnalysis | null,
  boundaryTouch: boolean[],
  xData: number[],
  yData: number[]
): string {
  const lines: string[] = [];
  const sep = '─'.repeat(50);

  lines.push('曲线拟合异常诊断报告');
  lines.push(sep);
  lines.push('');

  lines.push(`模型: ${model.name}`);
  lines.push(`公式: ${model.latexFormula}`);
  lines.push(`数据点数: ${xData.length}`);
  lines.push('');

  lines.push('── 诊断摘要 ──');
  lines.push(`状态: ${diagnosis.status === 'pass' ? '通过' : diagnosis.status === 'warning' ? '警告' : '失败'}`);
  lines.push(`初值发散: ${diagnosis.divergenceDetected ? '已拦截' : '未检测到'}`);
  if (diagnosis.divergenceDetected) {
    lines.push(`发散原因: ${diagnosis.divergenceReason}`);
  }
  lines.push(`离群点: ${diagnosis.outlierCount}/${diagnosis.totalPoints}`);
  if (diagnosis.outlierWarning) {
    lines.push(`离群警告: ${diagnosis.outlierWarning}`);
  }
  if (diagnosis.unitAnomaly) {
    lines.push(`单位异常: ${diagnosis.unitAnomaly}`);
  }
  lines.push('');
  lines.push(`结论: ${diagnosis.summary}`);
  lines.push('');

  if (fitResult.success) {
    lines.push('── 拟合结果 ──');
    lines.push(`R² = ${fitResult.rSquared.toFixed(6)}`);
    lines.push(`调整R² = ${fitResult.adjustedRSquared.toFixed(6)}`);
    lines.push(`RMSE = ${fitResult.rmse.toPrecision(4)}`);
    lines.push(`迭代次数 = ${fitResult.iterations}`);
    lines.push(`收敛 = ${fitResult.converged ? '是' : '否'}`);
    lines.push('');

    lines.push('── 参数估计 ──');
    model.paramNames.forEach((name, i) => {
      const ci = fitResult.confidenceIntervals[i];
      const touch = boundaryTouch[i] ? ' ⚠ 触达边界' : '';
      lines.push(
        `${name} = ${fitResult.parameters[i].toPrecision(6)} ± ${fitResult.standardErrors[i].toPrecision(3)}  95%CI:[${ci[0].toPrecision(3)}, ${ci[1].toPrecision(3)}]${touch}`
      );
    });
    lines.push('');
  }

  if (diagnosis.outliers.filter((o) => o.isOutlier).length > 0) {
    lines.push('── 离群点明细 ──');
    diagnosis.outliers
      .filter((o) => o.isOutlier)
      .forEach((o) => {
        lines.push(`  行${o.rowIndex}: x=${o.x.toPrecision(5)}, y=${o.y.toPrecision(5)}, 残差=${o.residual.toPrecision(3)}`);
      });
    lines.push('');
  }

  if (residualAnalysis) {
    lines.push('── 残差分析 ──');
    lines.push(`残差均值 = ${residualAnalysis.meanResidual.toExponential(3)}`);
    lines.push(`残差标准差 = ${residualAnalysis.residualStdDev.toPrecision(4)}`);
    lines.push(`残差模式 = ${residualAnalysis.hasPattern ? '检测到系统性模式' : '无显著模式'}`);
    if (residualAnalysis.patternDescription) {
      lines.push(`  ${residualAnalysis.patternDescription}`);
    }
  }

  lines.push('');
  lines.push(sep);
  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);

  return lines.join('\n');
}

export function downloadTextReport(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
