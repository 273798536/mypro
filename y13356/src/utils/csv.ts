import type { Snapshot } from '@/types';
import { getStatusLabel, formatBoolean } from './status';
import { formatDateTime } from './date';

const escapeCsvValue = (value: string | number | boolean): string => {
  const strValue = String(value);
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
};

interface CsvColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: any, row: T) => string;
}

const generateCsvContent = <T>(data: T[], columns: CsvColumn<T>[]): string => {
  const headerRow = columns.map(col => escapeCsvValue(col.header)).join(',');
  
  const dataRows = data.map(row => {
    return columns.map(col => {
      const value = (row as any)[col.key];
      if (col.formatter) {
        return escapeCsvValue(col.formatter(value, row));
      }
      return escapeCsvValue(value ?? '');
    }).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
};

const downloadCsv = (content: string, filename: string): void => {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

export const exportSnapshotsToCsv = (snapshots: Snapshot[]): void => {
  const columns: CsvColumn<Snapshot>[] = [
    { key: 'id', header: '快照ID' },
    { key: 'name', header: '快照名称' },
    { key: 'modelVersion', header: '模型版本' },
    {
      key: 'status',
      header: '状态',
      formatter: (value) => getStatusLabel(value),
    },
    {
      key: 'hasGrayError',
      header: '灰度错误',
      formatter: (value) => formatBoolean(value),
    },
    { key: 'grayRatio', header: '灰度比例' },
    { key: 'stepCount', header: '步骤数' },
    { key: 'changeCount', header: '变化数' },
    { key: 'createdBy', header: '创建人' },
    {
      key: 'createdAt',
      header: '创建时间',
      formatter: (value) => formatDateTime(value),
    },
    { key: 'remark', header: '备注' },
  ];
  
  const content = generateCsvContent(snapshots, columns);
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadCsv(content, `特征血缘版本快照_${timestamp}.csv`);
};

export const exportSnapshotDetailToCsv = (
  snapshot: Snapshot,
  steps: any[],
  notes: any[]
): void => {
  const snapshotColumns: CsvColumn<Snapshot>[] = [
    { key: 'id', header: '快照ID' },
    { key: 'name', header: '快照名称' },
    { key: 'modelVersion', header: '模型版本' },
    {
      key: 'status',
      header: '状态',
      formatter: (value) => getStatusLabel(value),
    },
    {
      key: 'hasGrayError',
      header: '灰度错误',
      formatter: (value) => formatBoolean(value),
    },
    { key: 'grayRatio', header: '灰度比例' },
    { key: 'stepCount', header: '步骤数' },
    { key: 'changeCount', header: '变化数' },
    { key: 'createdBy', header: '创建人' },
    {
      key: 'createdAt',
      header: '创建时间',
      formatter: (value) => formatDateTime(value),
    },
    { key: 'remark', header: '备注' },
  ];
  
  const snapshotContent = generateCsvContent([snapshot], snapshotColumns);
  
  const stepColumns: CsvColumn<any>[] = [
    { key: 'stepIndex', header: '步骤序号' },
    { key: 'stepName', header: '步骤名称' },
    { key: 'description', header: '步骤描述' },
    {
      key: 'hasChange',
      header: '有变化',
      formatter: (value) => formatBoolean(value),
    },
    {
      key: 'changeType',
      header: '变化类型',
      formatter: (value) => {
        const map: Record<string, string> = {
          none: '无变化',
          added: '新增',
          removed: '移除',
          modified: '修改',
        };
        return map[value] || value;
      },
    },
    { key: 'changeDetail', header: '变化详情' },
  ];
  
  const stepsContent = generateCsvContent(steps, stepColumns);
  
  const noteColumns: CsvColumn<any>[] = [
    { key: 'createdBy', header: '备注人' },
    {
      key: 'createdAt',
      header: '备注时间',
      formatter: (value) => formatDateTime(value),
    },
    { key: 'content', header: '备注内容' },
  ];
  
  const notesContent = generateCsvContent(notes, noteColumns);
  
  const fullContent = [
    '=== 快照基本信息 ===',
    snapshotContent,
    '',
    '=== 步骤详情 ===',
    stepsContent,
    '',
    '=== 后补备注 ===',
    notesContent,
  ].join('\n');
  
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadCsv(fullContent, `特征血缘快照明细_${snapshot.modelVersion}_${timestamp}.csv`);
};
