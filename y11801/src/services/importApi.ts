import { get, post, del } from './api';
import type { ImportLog, ImportDataType, ApiResponse } from '../../shared/types';

export const uploadFile = async (
  file: File,
  dataType: ImportDataType,
  operator: string
): Promise<ApiResponse<ImportLog>> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('dataType', dataType);
  formData.append('operator', operator);

  const response = await fetch('http://localhost:3001/api/import/upload', {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

export const getImportLogs = async (): Promise<ApiResponse<ImportLog[]>> => {
  return get<ImportLog[]>('/import/logs');
};

export const deleteImport = async (id: string): Promise<ApiResponse> => {
  return del(`/import/${id}`);
};
