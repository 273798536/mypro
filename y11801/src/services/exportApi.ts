import { get, post } from './api';
import type { ExportTask, ApiResponse } from '../../shared/types';

export const createExportTask = async (
  taskName: string,
  exportType: 'excel' | 'pdf',
  recordIds: string[],
  createdBy: string
): Promise<ApiResponse<ExportTask>> => {
  return post<ExportTask>('/export/create', { taskName, exportType, recordIds, createdBy });
};

export const getExportTasks = async (): Promise<ApiResponse<ExportTask[]>> => {
  return get<ExportTask[]>('/export/tasks');
};

export const getExportTaskDetail = async (id: string): Promise<ApiResponse<ExportTask>> => {
  return get<ExportTask>(`/export/tasks/${id}`);
};

export const downloadExport = async (id: string): Promise<ApiResponse<{ downloadUrl: string }>> => {
  return get<{ downloadUrl: string }>(`/export/download/${id}`);
};
