import api, { get, post, del } from './api';
import type { ImportLog, ImportDataType, PaginatedResponse, ApiResponse } from 'shared/types';

export const importService = {
  uploadFile: (file: File, dataType: ImportDataType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataType', dataType);
    return api.post<ApiResponse<ImportLog>>('/import/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data);
  },

  getLogs: (page = 1, pageSize = 20) =>
    get<PaginatedResponse<ImportLog>>('/import/logs', { page, pageSize }),

  deleteImport: (id: string) =>
    del<void>(`/import/${id}`),
};
