import type { Material, Lesson, FilterState } from '../types';
import { statusLabels, sourceLabels } from '../data/mockData';

function escapeCSV(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildFilterNote(filters: FilterState): string {
  const parts: string[] = [];

  if (filters.search) {
    parts.push(`关键词: ${filters.search}`);
  }
  if (filters.teacher) {
    parts.push(`老师: ${filters.teacher}`);
  }
  if (filters.student) {
    parts.push(`学生: ${filters.student}`);
  }
  if (filters.status) {
    parts.push(`状态: ${statusLabels[filters.status] || filters.status}`);
  }
  if (filters.source) {
    parts.push(`来源: ${sourceLabels[filters.source] || filters.source}`);
  }
  if (filters.dateRange.start || filters.dateRange.end) {
    parts.push(`日期范围: ${filters.dateRange.start || '不限'} 至 ${filters.dateRange.end || '不限'}`);
  }

  return parts.length > 0 ? parts.join('; ') : '全部数据';
}

export interface ExportData {
  materials: Material[];
  lessons: Lesson[];
  filters: FilterState;
  exportTime: string;
}

export function generateCSV(data: ExportData): string {
  const { materials, lessons, filters, exportTime } = data;
  const lines: string[] = [];

  lines.push(`# 琴房课时分账对齐 - 导出明细`);
  lines.push(`# 导出时间: ${exportTime}`);
  lines.push(`# 筛选口径: ${buildFilterNote(filters)}`);
  lines.push(`# 材料数量: ${materials.length} 条`);
  lines.push(`# 课时记录: ${lessons.length} 条`);
  lines.push('');

  lines.push('=== 材料汇总 ===');
  const materialHeaders = [
    '材料ID',
    '材料名称',
    '类型',
    '状态',
    '授课老师',
    '学生',
    '总金额(元)',
    '课时数',
    '上传日期',
    '材料来源',
    '当前版本',
    '是否名称不一致',
    '是否有人工批注',
    '备注',
  ];
  lines.push(materialHeaders.map(escapeCSV).join(','));

  materials.forEach((m) => {
    lines.push(
      [
        m.id,
        m.name,
        m.type,
        statusLabels[m.status] || m.status,
        m.teacher,
        m.student,
        m.totalAmount,
        m.lessonCount,
        m.uploadDate,
        sourceLabels[m.source] || m.source,
        m.currentVersion,
        m.hasNameMismatch ? '是' : '否',
        m.hasManualAnnotation ? '是' : '否',
        m.description || '',
      ]
        .map(escapeCSV)
        .join(',')
    );
  });

  lines.push('');
  lines.push('=== 课时明细 ===');
  const lessonHeaders = [
    '课时ID',
    '所属材料ID',
    '学生姓名',
    '授课老师',
    '上课日期',
    '课时时长(分钟)',
    '费用(元)',
    '学习进度',
    '是否名称不一致',
    '不一致说明',
  ];
  lines.push(lessonHeaders.map(escapeCSV).join(','));

  lessons.forEach((l) => {
    lines.push(
      [
        l.id,
        l.materialId,
        l.studentName,
        l.teacherName,
        l.lessonDate,
        l.duration,
        l.amount,
        l.progress,
        l.nameMismatch ? '是' : '否',
        l.mismatchNote || '',
      ]
        .map(escapeCSV)
        .join(',')
    );
  });

  return lines.join('\n');
}

export function downloadCSV(csvContent: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
