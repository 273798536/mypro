import type { FlightRecord } from '../types/game';

export function exportToJSON(record: FlightRecord): void {
  const dataStr = JSON.stringify(record, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  downloadFile(blob, `flight-record-${record.id.slice(0, 8)}.json`);
}

export function exportToCSV(records: FlightRecord[]): void {
  const headers = [
    'ID',
    '日期',
    '结果',
    '得分',
    '飞行时间(s)',
    '最大高度(m)',
    '最大速度(m/s)',
    '燃料使用量',
    '着陆精度(%)',
    '撞击速度(m/s)',
    '失败原因',
  ];

  const rows = records.map(record => [
    record.id,
    new Date(record.createdAt).toLocaleString(),
    record.success ? '成功' : '失败',
    record.score,
    record.summary.flightTime.toFixed(2),
    record.summary.maxAltitude.toFixed(1),
    record.summary.maxVelocity.toFixed(2),
    record.summary.fuelUsed.toFixed(1),
    record.summary.landingAccuracy.toFixed(1),
    record.summary.impactSpeed.toFixed(2),
    record.failureReason || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  downloadFile(blob, `flight-records-${Date.now()}.csv`);
}

export function exportFlightDataJSON(records: FlightRecord[]): void {
  const dataStr = JSON.stringify(records, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  downloadFile(blob, `all-flight-records-${Date.now()}.json`);
}

function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatFlightRecordForDisplay(record: FlightRecord): string {
  const date = new Date(record.createdAt).toLocaleString();
  const result = record.success ? '✅ 着陆成功' : '❌ 着陆失败';
  
  return `
飞行记录详情
====================
ID: ${record.id}
时间: ${date}
结果: ${result}
得分: ${record.score}
${record.failureReason ? `失败原因: ${record.failureReason}\n` : ''}
飞行统计:
  - 飞行时间: ${record.summary.flightTime.toFixed(2)}秒
  - 最大高度: ${record.summary.maxAltitude.toFixed(1)}米
  - 最大速度: ${record.summary.maxVelocity.toFixed(2)}m/s
  - 燃料使用: ${record.summary.fuelUsed.toFixed(1)}
  - 着陆精度: ${record.summary.landingAccuracy.toFixed(1)}%
  - 撞击速度: ${record.summary.impactSpeed.toFixed(2)}m/s
  `.trim();
}
