import api, { get, post, del } from './api';
import type { ExportTask, ApiResponse } from 'shared/types';

export interface GenerateExportRequest {
  taskName: string;
  exportType: 'excel' | 'pdf';
  status?: string;
  storeId?: string;
  recordIds?: string[];
  createdBy?: string;
}

export const exportService = {
  generate: (data: GenerateExportRequest) =>
    post<ExportTask>('/export/generate', data),

  getTasks: () =>
    get<ExportTask[]>('/export/tasks'),

  download: (id: string) =>
    api.get<Blob>(`/export/download/${id}`, {
      responseType: 'blob',
    }).then(res => res.data),

  retry: (id: string) =>
    post<ExportTask>(`/export/retry/${id}`, {}),

  deleteTask: (id: string) =>
    del<void>(`/export/${id}`),
};
