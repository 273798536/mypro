import type { SimulationParams, SimulationMetrics, TrajectoryPoint, Warning } from '../physics';

export const exportToJSON = (data: {
  params: SimulationParams;
  metrics: SimulationMetrics;
  noDragTrajectory: TrajectoryPoint[];
  withDragTrajectory: TrajectoryPoint[];
  warnings: Warning[];
}): void => {
  const exportData = {
    exportTime: new Date().toISOString(),
    params: data.params,
    metrics: data.metrics,
    warnings: data.warnings,
    trajectoryData: {
      noDragSample: data.noDragTrajectory.slice(0, Math.min(100, data.noDragTrajectory.length)),
      withDragSample: data.withDragTrajectory.slice(0, Math.min(100, data.withDragTrajectory.length)),
    },
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `trajectory-report-${Date.now()}.json`);
};

export const exportToCSV = (
  noDragTrajectory: TrajectoryPoint[],
  withDragTrajectory: TrajectoryPoint[]
): void => {
  const maxLen = Math.max(noDragTrajectory.length, withDragTrajectory.length);
  let csv =
    'Time (s),NoDrag_X (m),NoDrag_Y (m),NoDrag_Vx (m/s),NoDrag_Vy (m/s),WithDrag_X (m),WithDrag_Y (m),WithDrag_Vx (m/s),WithDrag_Vy (m/s),DragForce (N)\n';

  for (let i = 0; i < maxLen; i++) {
    const noDrag = noDragTrajectory[i] || { time: '', x: '', y: '', vx: '', vy: '' };
    const withDrag = withDragTrajectory[i] || {
      time: '',
      x: '',
      y: '',
      vx: '',
      vy: '',
      dragForce: '',
    };
    csv += `${noDrag.time},${noDrag.x},${noDrag.y},${noDrag.vx},${noDrag.vy},${withDrag.x},${withDrag.y},${withDrag.vx},${withDrag.vy},${withDrag.dragForce || ''}\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `trajectory-data-${Date.now()}.csv`);
};

export const generateReportText = (data: {
  params: SimulationParams;
  metrics: SimulationMetrics;
  warnings: Warning[];
}): string => {
  const { params, metrics, warnings } = data;

  let report = `
═══════════════════════════════════════════════
           射箭弹道空气阻力对比报告
═══════════════════════════════════════════════

生成时间: ${new Date().toLocaleString('zh-CN')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                   输入参数
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  初速度:      ${params.initialVelocity.toFixed(1)} m/s
  发射角:      ${params.launchAngle.toFixed(1)}°
  阻力系数:    ${params.dragCoefficient.toFixed(3)}
  箭重:        ${params.arrowMass.toFixed(0)} g
  靶距:        ${params.targetDistance.toFixed(1)} m
  积分步长:    ${params.timeStep.toFixed(4)} s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                   结果对比
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【射程对比】
  无空气阻力:  ${metrics.noDragLanding.x.toFixed(2)} m
  有空气阻力:  ${metrics.withDragLanding.x.toFixed(2)} m
  射程误差:    ${metrics.landingError.toFixed(2)} m (${((metrics.landingError / metrics.noDragLanding.x) * 100).toFixed(1)}%)

【最大高度】
  无空气阻力:  ${metrics.maxHeight.noDrag.toFixed(2)} m
  有空气阻力:  ${metrics.maxHeight.withDrag.toFixed(2)} m

【飞行时间】
  无空气阻力:  ${metrics.timeOfFlight.noDrag.toFixed(2)} s
  有空气阻力:  ${metrics.timeOfFlight.withDrag.toFixed(2)} s

【靶处垂直误差】
  ${metrics.verticalErrorAtTarget.toFixed(2)} m

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                 异常与警告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  if (warnings.length === 0) {
    report += '  无异常警告\n';
  } else {
    warnings.forEach((w, i) => {
      report += `  [${w.severity.toUpperCase()}] ${w.message}\n`;
      if (w.suggestion) {
        report += `      建议: ${w.suggestion}\n`;
      }
    });
  }

  if (metrics.isExtrapolated) {
    report += '\n  ⚠ 注意: 本次计算包含外推数据\n';
  }

  report += `
═══════════════════════════════════════════════
`;

  return report;
};

export const exportReport = (data: {
  params: SimulationParams;
  metrics: SimulationMetrics;
  warnings: Warning[];
}): void => {
  const reportText = generateReportText(data);
  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8;' });
  downloadBlob(blob, `trajectory-report-${Date.now()}.txt`);
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const copyReportToClipboard = async (data: {
  params: SimulationParams;
  metrics: SimulationMetrics;
  warnings: Warning[];
}): Promise<boolean> => {
  try {
    const reportText = generateReportText(data);
    await navigator.clipboard.writeText(reportText);
    return true;
  } catch (e) {
    console.warn('Failed to copy to clipboard:', e);
    return false;
  }
};
