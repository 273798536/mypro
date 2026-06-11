import Papa from 'papaparse';
import { BoomPoint, RemarkHistory } from '../types';
import { getAnomalyTypeLabel, getStatusLabel } from './unit';
import { formatDateTime } from './date';

export function exportPointsToCSV(points: BoomPoint[]): string {
  const rows = points.map(p => ({
    '点位ID': p.id,
    '吊杆编号': p.boomId,
    '时间': formatDateTime(p.timestamp),
    '数值': p.value,
    '单位': p.unit,
    '楼层': p.floor,
    '楼层单位': p.floorUnit,
    '是否异常': p.isAnomaly ? '是' : '否',
    '异常类型': getAnomalyTypeLabel(p.anomalyType),
    '当前备注': p.currentRemark,
    '状态': getStatusLabel(p.status),
    '材料ID': p.materialId,
  }));

  return Papa.unparse(rows);
}

export function exportRemarksToCSV(remarks: RemarkHistory[]): string {
  const rows = remarks.map(r => ({
    '记录ID': r.id,
    '点位ID': r.pointId,
    '备注内容': r.remark,
    '修改时间': formatDateTime(r.timestamp),
    '操作人': r.operator,
  }));

  return Papa.unparse(rows);
}

export function parseCSVToPoints(csvContent: string): BoomPoint[] {
  const result = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  const points: BoomPoint[] = [];

  for (const row of result.data as Record<string, string>[]) {
    const point: BoomPoint = {
      id: row['点位ID'] || row['id'] || `import-${Date.now()}-${Math.random()}`,
      boomId: row['吊杆编号'] || row['boomId'] || 'UNKNOWN',
      timestamp: row['时间'] ? new Date(row['时间']).getTime() : Date.now(),
      value: parseFloat(row['数值'] || row['value'] || '0'),
      unit: row['单位'] || row['unit'] || 'kN',
      floor: parseInt(row['楼层'] || row['floor'] || '0', 10),
      floorUnit: row['楼层单位'] || row['floorUnit'] || '米',
      isAnomaly: row['是否异常'] === '是' || row['isAnomaly'] === 'true',
      anomalyType: (row['异常类型'] as any) || row['anomalyType'] as any,
      currentRemark: row['当前备注'] || row['currentRemark'] || '',
      status: (row['状态'] as any) || row['status'] as any || 'pending',
      materialId: row['材料ID'] || row['materialId'] || '',
    };
    points.push(point);
  }

  return points;
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
