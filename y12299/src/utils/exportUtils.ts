import { ExportRecord, WindParams, RiskPoint } from '../types';
import yaml from 'js-yaml';

export function generateExportRecord(
  modelName: string,
  windParams: WindParams,
  riskPoints: RiskPoint[],
  screenshotUrl: string,
  hasDataGap: boolean,
  dataGapNote?: string
): ExportRecord {
  const angleViolations = riskPoints.filter((r) => r.type === 'angle_violation').length;
  const oversampling = riskPoints.filter((r) => r.type === 'oversampling').length;
  const reverseFlows = riskPoints.filter((r) => r.type === 'reverse_flow').length;

  return {
    id: `export-${Date.now()}`,
    timestamp: Date.now(),
    modelName,
    windParams: { ...windParams },
    screenshotUrl,
    riskSummary: {
      angleViolations,
      oversampling,
      reverseFlows,
    },
    hasDataGap,
    dataGapNote,
  };
}

export function exportToYAML(record: ExportRecord): string {
  const data = {
    export_id: record.id,
    export_time: new Date(record.timestamp).toISOString(),
    model: {
      name: record.modelName,
    },
    wind_parameters: {
      speed: `${record.windParams.speed} m/s`,
      yaw_angle: `${record.windParams.yawAngle}°`,
      pitch_angle: `${record.windParams.pitchAngle}°`,
      air_density: `${record.windParams.density} kg/m³`,
    },
    risk_analysis: {
      angle_violations: record.riskSummary.angleViolations,
      oversampling: record.riskSummary.oversampling,
      reverse_flows: record.riskSummary.reverseFlows,
    },
    data_quality: {
      has_data_gap: record.hasDataGap,
      note: record.dataGapNote || 'N/A',
    },
  };

  return yaml.dump(data, { indent: 2 });
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function captureScreenshot(canvasElement: HTMLCanvasElement): string {
  return canvasElement.toDataURL('image/png');
}
