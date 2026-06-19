import * as XLSX from 'xlsx';
import type { PermissionAuditVersion, ExceptionRecord } from '@/types';
import {
  getExceptionTypeLabel,
  getSeverityLabel,
  getRecordStatusLabel,
  formatDateTime,
} from './format';

export function exportToExcel(
  auditVersion: PermissionAuditVersion,
  affectedRecords: ExceptionRecord[],
  fileName: string = '权限审计报告'
): void {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['审计报告摘要'],
    [],
    ['权限版本', auditVersion.version],
    ['发布时间', formatDateTime(auditVersion.publishTime)],
    ['变更人', auditVersion.operator],
    ['变更摘要', auditVersion.changeSummary],
    [],
    ['变更前结论', auditVersion.conclusionBefore],
    ['变更后结论', auditVersion.conclusionAfter],
    [],
    ['受影响任务数', auditVersion.affectedTasks.length],
    ['受影响异常记录数', auditVersion.affectedRecordCount],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, '审计摘要');

  const changeHeaders = ['变更类型', '分类', '描述', '原值', '新值'];
  const changeData = auditVersion.changeDetails.map((d) => [
    d.type === 'add' ? '新增' : d.type === 'remove' ? '删除' : '修改',
    d.category,
    d.description,
    d.oldValue || '-',
    d.newValue || '-',
  ]);
  const wsChange = XLSX.utils.aoa_to_sheet([changeHeaders, ...changeData]);
  XLSX.utils.book_append_sheet(wb, wsChange, '变更明细');

  const recordHeaders = [
    '记录ID',
    '异常类型',
    '严重程度',
    '处理状态',
    '所属表',
    '来源服务',
    '事件时间',
    '描述',
  ];
  const recordData = affectedRecords.map((r) => [
    r.id,
    getExceptionTypeLabel(r.type),
    getSeverityLabel(r.severity),
    getRecordStatusLabel(r.status),
    r.tableName,
    r.sourceService,
    formatDateTime(r.eventTime),
    r.description,
  ]);
  const wsRecords = XLSX.utils.aoa_to_sheet([recordHeaders, ...recordData]);
  XLSX.utils.book_append_sheet(wb, wsRecords, '受影响记录');

  XLSX.writeFile(wb, `${fileName}_${auditVersion.version}.xlsx`);
}

export function triggerPrint(): void {
  window.print();
}

export function downloadText(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
