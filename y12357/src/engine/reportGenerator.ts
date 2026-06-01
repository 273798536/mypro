import type {
  Flywheel,
  AngularVelocityRecord,
  InertiaResult,
  MeasurementReport,
  SamplingGap,
  UnitError,
  FrictionOmission,
} from '../types';

export const generateReport = (
  flywheel: Flywheel,
  angularVelocities: AngularVelocityRecord[],
  results: InertiaResult[],
  gaps: SamplingGap[],
  unitErrors: UnitError[],
  frictionOmissions: FrictionOmission[],
  selectedTimeRange?: [number, number]
): MeasurementReport => {
  const flywheelRecords = angularVelocities.filter(r => r.flywheelId === flywheel.id);
  
  const relevantResults = results.filter(r => {
    if (r.flywheelId !== flywheel.id) return false;
    if (selectedTimeRange) {
      return r.timeRange[0] >= selectedTimeRange[0] && r.timeRange[1] <= selectedTimeRange[1];
    }
    return true;
  });
  
  const hasConflicts = 
    unitErrors.some(e => e.flywheelId === flywheel.id) ||
    frictionOmissions.some(o => o.flywheelId === flywheel.id) ||
    gaps.some(g => g.flywheelId === flywheel.id && !g.isInterpolated);
  
  const latestResult = relevantResults[relevantResults.length - 1];
  const reportedInertia = latestResult ? latestResult.finalInertia : 0;
  
  return {
    id: `rpt-${flywheel.id}-${Date.now()}`,
    flywheelId: flywheel.id,
    reportNo: `REP-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    reportDate: new Date().toISOString().slice(0, 10),
    reportedInertia,
    reportedUnit: 'kg·m²',
    rawDataSnapshot: {
      flywheel: { ...flywheel },
      angularVelocities: flywheelRecords.map(r => ({ ...r })),
      results: relevantResults.map(r => ({ ...r })),
    },
    angularVelocityIds: flywheelRecords.map(r => r.id),
    status: hasConflicts ? 'conflicting' : 'final',
  };
};

export const exportReportAsJSON = (report: MeasurementReport): string => {
  return JSON.stringify(report, null, 2);
};

export const exportReportAsCSV = (report: MeasurementReport): string => {
  const lines: string[] = [];
  
  lines.push('飞轮转动惯量测算报告');
  lines.push(`报告编号,${report.reportNo}`);
  lines.push(`报告日期,${report.reportDate}`);
  lines.push(`飞轮名称,${report.rawDataSnapshot.flywheel.name}`);
  lines.push(`材料,${report.rawDataSnapshot.flywheel.material}`);
  lines.push(`批次号,${report.rawDataSnapshot.flywheel.batchNo}`);
  lines.push(`半径,${report.rawDataSnapshot.flywheel.radius}m`);
  lines.push(`质量,${report.rawDataSnapshot.flywheel.mass}kg`);
  lines.push(`摩擦系数,${report.rawDataSnapshot.flywheel.frictionCoeff ?? '未配置'}`);
  lines.push('');
  lines.push('计算结果');
  lines.push('参数,数值,单位');
  
  if (report.rawDataSnapshot.results.length > 0) {
    const result = report.rawDataSnapshot.results[report.rawDataSnapshot.results.length - 1];
    lines.push(`理论惯量,${result.theoreticalInertia.toFixed(4)},kg·m²`);
    lines.push(`实测惯量,${result.measuredInertia.toFixed(4)},kg·m²`);
    lines.push(`摩擦修正,${result.frictionCorrection.toFixed(4)},kg·m²`);
    lines.push(`最终惯量,${result.finalInertia.toFixed(4)},kg·m²`);
    lines.push(`偏差率,${result.deviation.toFixed(2)},%`);
  }
  
  lines.push('');
  lines.push('角速度记录');
  lines.push('时间戳(s),角速度(rad/s),角加速度(rad/s²),力矩(N·m)');
  
  report.rawDataSnapshot.angularVelocities.forEach(r => {
    lines.push(`${r.timestamp.toFixed(2)},${r.omega.toFixed(4)},${r.alpha.toFixed(4)},${r.torque.toFixed(2)}`);
  });
  
  return lines.join('\n');
};

export const downloadReport = (report: MeasurementReport, format: 'json' | 'csv') => {
  let content: string;
  let filename: string;
  let mimeType: string;
  
  if (format === 'json') {
    content = exportReportAsJSON(report);
    filename = `${report.reportNo}.json`;
    mimeType = 'application/json';
  } else {
    content = exportReportAsCSV(report);
    filename = `${report.reportNo}.csv`;
    mimeType = 'text/csv';
  }
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const buildTraceabilityChain = (
  velocityRecord: AngularVelocityRecord,
  result: InertiaResult,
  report: MeasurementReport
) => {
  return {
    velocityRecord,
    usedInCalculation: result.calculationTrace.angularVelocityIds.includes(velocityRecord.id),
    calculationSteps: result.calculationTrace.steps,
    referencedInReport: report.angularVelocityIds.includes(velocityRecord.id),
    reportNo: report.reportNo,
  };
};
