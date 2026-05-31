import type { 
  Task, 
  RawDataPackage, 
  CalculationResult, 
  Report,
  CorrectionLog,
  ApiResponse,
  TaskCreateRequest,
  ImportPackageRequest,
  ImportMixedPackageRequest,
  CorrectionRequest
} from '@/types';

const BASE_URL = 'http://localhost:5001/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  return response.json();
}

export const taskApi = {
  getAll: (includeDuplicates = false) => 
    request<Task[]>(`/tasks${includeDuplicates ? '?includeDuplicates=true' : ''}`),
  
  get: (taskId: string) => 
    request<Task>(`/tasks/${taskId}`),
  
  create: (data: TaskCreateRequest) => 
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  delete: (taskId: string) => 
    request<void>(`/tasks/${taskId}`, { method: 'DELETE' }),
  
  clone: (taskId: string) => 
    request<Task>(`/tasks/${taskId}/clone`, { method: 'POST' }),
};

export const packageApi = {
  getForTask: (taskId: string) => 
    request<RawDataPackage[]>(`/tasks/${taskId}/packages`),
  
  import: (taskId: string, data: ImportPackageRequest) => 
    request<RawDataPackage>(`/tasks/${taskId}/packages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  importMixed: (taskId: string, data: ImportMixedPackageRequest) => 
    request<RawDataPackage[]>(`/tasks/${taskId}/packages/mixed`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const calculationApi = {
  get: (taskId: string) => 
    request<CalculationResult>(`/tasks/${taskId}/calculation`),
  
  run: (taskId: string) => 
    request<CalculationResult>(`/tasks/${taskId}/calculation`, { method: 'POST' }),
};

export const correctionApi = {
  getForTask: (taskId: string) => 
    request<CorrectionLog[]>(`/tasks/${taskId}/corrections`),
  
  add: (taskId: string, data: CorrectionRequest) => 
    request<CorrectionLog>(`/tasks/${taskId}/corrections`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getSummary: (taskId: string) => 
    request<any>(`/tasks/${taskId}/corrections/summary`),
};

export const reportApi = {
  get: (taskId: string, format = 'json') => 
    request<Report>(`/tasks/${taskId}/report?format=${format}`),
  
  export: (taskId: string, format = 'json') => 
    fetch(`${BASE_URL}/tasks/${taskId}/report/export?format=${format}`),
};

export const traceApi = {
  getForCalculation: (resultId: string) => 
    request<any[]>(`/calculation/${resultId}/traces`),
  
  getChain: (traceId: string) => 
    request<any>(`/traces/${traceId}/chain`),
};

export const sampleApi = {
  importDirtySample: () => 
    request<Task>('/samples/dirty-sample/import', { method: 'POST' }),
};
