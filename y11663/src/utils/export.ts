
import type { ExperimentRecord } from '../types';

export function captureScreenshot(canvas: HTMLCanvasElement, filename?: string): void {
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename || `wind-tunnel-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

export function exportRecordToJSON(record: ExperimentRecord): void {
  const dataStr = JSON.stringify(record, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `experiment-${record.id}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportRecordsToCSV(records: ExperimentRecord[]): void {
  const headers = [
    'ID',
    '创建时间',
    '翼型',
    '迎角(°)',
    '速度(m/s)',
    '采样点数',
    '无效点数',
    '最小压力(Pa)',
    '最大压力(Pa)',
    '来源',
    '备注',
  ];

  const rows = records.map((r) => [
    r.id,
    r.createdAt,
    r.airfoil.name,
    r.params.angleOfAttack.toFixed(1),
    r.params.velocity.toFixed(1),
    r.pressureField.samplingPoints.length,
    r.pressureField.samplingPoints.filter((p) => !p.isValid).length,
    r.pressureField.minPressure.toFixed(1),
    r.pressureField.maxPressure.toFixed(1),
    r.source,
    r.notes,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `experiments-${Date.now()}.csv`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function importRecordFromJSON(file: File): Promise<ExperimentRecord> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const record = JSON.parse(e.target?.result as string) as ExperimentRecord;
        resolve(record);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
