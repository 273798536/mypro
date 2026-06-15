import Papa from 'papaparse';
import type { ConflictRecord, ConflictStatus } from '@/types';
import { STATUS_LABELS } from '@/types';
import { format } from 'date-fns';

export interface CSVRow {
  曲目名称: string;
  文件名: string;
  处理状态: string;
  时码偏半拍: string;
  当前备注: string;
  合同扫描件数量: number;
  历史版本数: number;
  最后更新时间: string;
  创建时间: string;
}

export function recordsToCSV(records: ConflictRecord[]): string {
  const rows: CSVRow[] = records.map(record => ({
    '曲目名称': record.trackName,
    '文件名': record.fileName,
    '处理状态': STATUS_LABELS[record.status],
    '时码偏半拍': record.isTimecodeOffset ? '是' : '否',
    '当前备注': record.currentNote,
    '合同扫描件数量': record.contractScans.length,
    '历史版本数': record.historyVersions.length,
    '最后更新时间': format(new Date(record.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
    '创建时间': format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm:ss'),
  }));

  return Papa.unparse(rows, {
    header: true,
    encoding: 'UTF-8',
  });
}

export function downloadCSV(csvContent: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSV(csvContent: string): Array<Partial<ConflictRecord>> {
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    encoding: 'UTF-8',
  });

  const statusMap: Record<string, ConflictStatus> = {
    '待处理': 'pending',
    '处理中': 'processing',
    '已解决': 'resolved',
    '已关闭': 'closed',
  };

  return (result.data as Array<Record<string, string>>).map(row => ({
    trackName: row['曲目名称'] || row.trackName,
    fileName: row['文件名'] || row.fileName,
    status: statusMap[row['处理状态']] || (row.status as ConflictStatus) || 'pending',
    isTimecodeOffset: row['时码偏半拍'] === '是' || row.isTimecodeOffset === 'true',
    currentNote: row['当前备注'] || row.currentNote || '',
  }));
}
