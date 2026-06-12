import axios from 'axios';
import type { 
  RouteCorridor, InspectionRecord, MaterialVersion, ManualNote, 
  HistoryChange, FilterCriteria, PaginatedResponse, ApiResponse,
  ScreenshotExport, User
} from '@shared/types';
import { filterCriteriaToSearchParams } from '@shared/utils';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const corridorApi = {
  getAll: () => api.get<ApiResponse<RouteCorridor[]>>('/corridors'),
  getById: (id: string) => api.get<ApiResponse<RouteCorridor>>(`/corridors/${id}`),
  create: (data: Omit<RouteCorridor, 'id' | 'createdAt' | 'updatedAt'>) => 
    api.post<ApiResponse<RouteCorridor>>('/corridors', data),
  update: (id: string, data: Partial<RouteCorridor>) => 
    api.put<ApiResponse<RouteCorridor>>(`/corridors/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse>(`/corridors/${id}`)
};

export const recordApi = {
  getList: (filter: FilterCriteria, page = 1, pageSize = 20) => {
    const params = filterCriteriaToSearchParams(filter);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return api.get<ApiResponse<PaginatedResponse<InspectionRecord>>>(`/records?${params.toString()}`);
  },
  
  getOverlapping: (filter: FilterCriteria, page = 1, pageSize = 20) => {
    const params = filterCriteriaToSearchParams(filter);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return api.get<ApiResponse<PaginatedResponse<InspectionRecord>>>(`/records/overlapping?${params.toString()}`);
  },
  
  getById: (id: string) => api.get<ApiResponse<InspectionRecord>>(`/records/${id}`),
  
  getDetails: (id: string) => api.get<ApiResponse<{
    record: InspectionRecord;
    materials: MaterialVersion[];
    notes: ManualNote[];
    history: HistoryChange[];
  }>>(`/records/${id}/details`),
  
  create: (data: Omit<InspectionRecord, 'id' | 'isOverlapping' | 'createdAt' | 'updatedAt'>) => 
    api.post<ApiResponse<InspectionRecord>>('/records', data),
  
  update: (id: string, data: Partial<InspectionRecord>) => 
    api.put<ApiResponse<InspectionRecord>>(`/records/${id}`, data),
  
  confirm: (id: string, remark?: string) => 
    api.post<ApiResponse<InspectionRecord>>(`/records/${id}/confirm`, { remark }),
  
  reject: (id: string, remark?: string) => 
    api.post<ApiResponse<InspectionRecord>>(`/records/${id}/reject`, { remark }),
  
  delete: (id: string) => api.delete<ApiResponse>(`/records/${id}`),
  
  getMaterials: (id: string) => api.get<ApiResponse<MaterialVersion[]>>(`/records/${id}/materials`),
  
  addMaterial: (id: string, data: Omit<MaterialVersion, 'id' | 'version' | 'createdAt'>) => 
    api.post<ApiResponse<MaterialVersion>>(`/records/${id}/materials`, data),
  
  getNotes: (id: string) => api.get<ApiResponse<ManualNote[]>>(`/records/${id}/notes`),
  
  addNote: (id: string, data: Omit<ManualNote, 'id' | 'createdAt' | 'updatedAt'>) => 
    api.post<ApiResponse<ManualNote>>(`/records/${id}/notes`, data),
  
  getHistory: (id: string) => api.get<ApiResponse<HistoryChange[]>>(`/records/${id}/history`)
};

export const exportApi = {
  exportExcel: (filter: FilterCriteria) => {
    const params = filterCriteriaToSearchParams(filter);
    window.open(`/api/export/excel?${params.toString()}`, '_blank');
  },
  
  exportCSV: (filter: FilterCriteria) => {
    const params = filterCriteriaToSearchParams(filter);
    window.open(`/api/export/csv?${params.toString()}`, '_blank');
  },
  
  exportPDF: (recordId: string, annotation?: string) => {
    const params = new URLSearchParams();
    if (annotation) params.set('annotation', annotation);
    window.open(`/api/export/pdf/${recordId}?${params.toString()}`, '_blank');
  },
  
  saveScreenshot: (data: Omit<ScreenshotExport, 'id' | 'createdAt'>) => 
    api.post<ApiResponse<ScreenshotExport>>('/export/screenshot', data),
  
  getScreenshots: (recordId?: string) => {
    const params = new URLSearchParams();
    if (recordId) params.set('recordId', recordId);
    return api.get<ApiResponse<ScreenshotExport[]>>(`/export/screenshots?${params.toString()}`);
  },
  
  importExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<{ success: number; failed: number; errors: string[]; importedIds: string[] }>>(
      '/export/import/excel', 
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
  
  importCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<{ success: number; failed: number; errors: string[]; importedIds: string[] }>>(
      '/export/import/csv', 
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  }
};

export const historyApi = {
  getWeeklyReview: () => api.get<ApiResponse<{
    totalChanges: number;
    confirmations: number;
    modifications: number;
    records: HistoryChange[];
  }>>('/history/weekly-review'),
  
  getByDateRange: (startDate: string, endDate: string) => 
    api.get<ApiResponse<HistoryChange[]>>(`/history?startDate=${startDate}&endDate=${endDate}`)
};

export const userApi = {
  getAll: () => api.get<ApiResponse<User[]>>('/users'),
  getCurrent: () => api.get<ApiResponse<User>>('/users/current'),
  getById: (id: string) => api.get<ApiResponse<User>>(`/users/${id}`),
  create: (data: { name: string; role: User['role'] }) => 
    api.post<ApiResponse<User>>('/users', data)
};

export default api;
