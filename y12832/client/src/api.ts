import axios from 'axios';
import type { Sample, ProcessingRecord, AuditLog, ReportData, TraceData, SampleStatus, QualityStatus } from './types';

const OPERATOR = '生物老师';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'X-Operator': OPERATOR,
  },
});

export const statusLabels: Record<SampleStatus, string> = {
  imported: '已导入',
  reviewing: '复核中',
  reviewed: '已复核',
  processing: '处理中',
  completed: '已完成',
  exported: '已导出',
};

export const statusColors: Record<SampleStatus, string> = {
  imported: 'default',
  reviewing: 'processing',
  reviewed: 'blue',
  processing: 'orange',
  completed: 'green',
  exported: 'purple',
};

export const qualityLabels: Record<QualityStatus, string> = {
  pass: '合格',
  warning: '有异常',
  fail: '不合格',
};

export const qualityColors: Record<QualityStatus, string> = {
  pass: 'green',
  warning: 'orange',
  fail: 'red',
};

export const recordTypeLabels: Record<string, string> = {
  quality_check: '质量检查',
  difference_analysis: '差异分析',
  exception_review: '异常复核',
  status_update: '状态更新',
  timepoint_fix: '时间点修正',
  duplicate_handle: '重复处理',
};

export const recordResultLabels: Record<string, string> = {
  pending: '待处理',
  pass: '通过',
  fail: '不通过',
  warning: '异常',
  fixed: '已修正',
};

export const recordResultColors: Record<string, string> = {
  pending: 'default',
  pass: 'green',
  fail: 'red',
  warning: 'orange',
  fixed: 'blue',
};

export const auditActionLabels: Record<string, string> = {
  sample_import: '样本导入',
  sample_update: '样本更新',
  status_change: '状态变更',
  review_submit: '提交复核',
  timepoint_fix: '时间点修正',
  duplicate_handle: '重复处理',
  record_create: '创建记录',
  record_update: '更新记录',
  report_export: '导出报告',
};

export async function getHealth() {
  return api.get('/health');
}

export async function getSamples(params?: {
  page?: number;
  pageSize?: number;
  status?: SampleStatus;
  barcode?: string;
}) {
  return api.get<{
    success: boolean;
    data: Sample[];
    total: number;
    page: number;
    pageSize: number;
  }>('/samples', { params });
}

export async function getSampleById(id: number) {
  return api.get<{ success: boolean; data: Sample }>(`/samples/${id}`);
}

export async function importSamples(data: any[]) {
  return api.post<{ success: boolean; data: Sample[]; count: number }>('/samples/import', { samples: data });
}

export async function importSamplesByFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<{ success: boolean; data: Sample[]; count: number }>('/samples/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function updateSampleStatus(id: number, status: SampleStatus, reason?: string) {
  return api.put<{ success: boolean; data: Sample }>(`/samples/${id}/status`, { status, reason });
}

export async function submitReview(id: number, data: {
  hasMissingTimePoint: boolean;
  hasDuplicateBarcode: boolean;
  qualityStatus: QualityStatus;
  qualityNotes?: string;
  reviewComment?: string;
}) {
  return api.post<{ success: boolean; data: Sample }>(`/samples/${id}/review`, data);
}

export async function getProcessingRecords(sampleId: number) {
  return api.get<{ success: boolean; data: ProcessingRecord[] }>(`/samples/${sampleId}/records`);
}

export async function createDifferenceAnalysis(sampleId: number, data: {
  description: string;
  differenceDetails: string;
  analysisData?: string;
}) {
  return api.post<{ success: boolean; data: ProcessingRecord }>(`/samples/${sampleId}/difference-analysis`, data);
}

export async function updateProcessingRecord(recordId: number, data: {
  result?: string;
  handlingOpinion?: string;
  reviewComment?: string;
  isReviewed?: boolean;
  reviewedBy?: string;
  differenceDetails?: string;
}) {
  return api.put<{ success: boolean; data: ProcessingRecord }>(`/records/${recordId}`, data);
}

export async function traceException(recordId: number) {
  return api.get<{ success: boolean; data: TraceData }>(`/records/${recordId}/trace`);
}

export async function getAuditLogs(sampleId: number) {
  return api.get<{ success: boolean; data: AuditLog[] }>(`/samples/${sampleId}/audit-logs`);
}

export async function getAllAuditLogs() {
  return api.get<{ success: boolean; data: AuditLog[] }>('/audit-logs');
}

export async function generateReport(sampleId: number) {
  return api.get<{ success: boolean; data: ReportData }>(`/samples/${sampleId}/report`);
}

export async function exportReports(sampleIds: number[]) {
  return api.post('/samples/export', { sampleIds }, { responseType: 'blob' });
}

export async function checkInitialized() {
  return api.get<{ success: boolean; data: { initialized: boolean } }>('/system/initialized');
}

export async function resetData() {
  return api.post('/system/reset-data');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
