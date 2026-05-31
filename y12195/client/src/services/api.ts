import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ApiResponse,
  User,
  Student,
  WarningScore,
  DashboardStats,
  WarningVersion,
  VersionComparison,
  ManualCorrection,
  CreateCorrectionRequest,
  CorrectionEffectiveness,
  GroupStats,
  MakeupRequest,
  MakeupResponse,
  FollowUpRecord,
  ImportPreview,
  ImportConfirm,
  ImportResult,
  AttendanceRecord,
} from '../../../shared/types';

const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

async function request<T>(url: string, method: string, data?: any, params?: any): Promise<T> {
  try {
    const response = await api.request<ApiResponse<T>>({
      url,
      method,
      data,
      params,
    });
    if (response.data.success && response.data.data !== undefined) {
      return response.data.data;
    }
    throw new Error(response.data.message || response.data.error || '请求失败');
  } catch (error) {
    if (error instanceof AxiosError) {
      const message = error.response?.data?.message || error.response?.data?.error || error.message;
      throw new Error(message);
    }
    throw error;
  }
}

export const auth = {
  login(username: string, password: string): Promise<{ user: User; token: string }> {
    return request<{ user: User; token: string }>('/auth/login', 'POST', { username, password });
  },
  getCurrentUser(): Promise<User> {
    return request<User>('/auth/me', 'GET');
  },
};

export const warnings = {
  getDashboard(): Promise<DashboardStats> {
    return request<DashboardStats>('/warnings/dashboard', 'GET');
  },
  getList(params?: { level?: string; versionId?: string; teacherId?: string }): Promise<WarningScore[]> {
    return request<WarningScore[]>('/warnings', 'GET', undefined, params);
  },
  getDetail(id: string): Promise<WarningScore> {
    return request<WarningScore>(`/warnings/${id}`, 'GET');
  },
  recalculate(): Promise<WarningScore[]> {
    return request<WarningScore[]>('/warnings/recalculate', 'POST');
  },
};

export const students = {
  getList(params?: { teacherId?: string; courseType?: string; search?: string; level?: string; limit?: number; offset?: number }): Promise<{ list: Student[]; total: number }> {
    return request<{ list: Student[]; total: number }>('/students', 'GET', undefined, params);
  },
  getDetail(id: string): Promise<Student> {
    return request<Student>(`/students/${id}`, 'GET');
  },
  getPendingMakeup(): Promise<any[]> {
    return request<any[]>('/students/makeup/pending', 'GET');
  },
  processMakeup(id: string, data: MakeupRequest): Promise<MakeupResponse> {
    return request<MakeupResponse>(`/students/makeup/${id}`, 'POST', data);
  },
  addFollowUp(studentId: string, data: {
    followUpDate: string;
    method: string;
    content: string;
    nextAction?: string;
    parentResponse?: string;
  }): Promise<FollowUpRecord> {
    return request<FollowUpRecord>(`/students/${studentId}/followup`, 'POST', data);
  },
};

export const versions = {
  getList(): Promise<WarningVersion[]> {
    return request<WarningVersion[]>('/versions', 'GET');
  },
  getDetail(id: string): Promise<WarningVersion> {
    return request<WarningVersion>(`/versions/${id}`, 'GET');
  },
  compare(version1Id: string, version2Id: string): Promise<VersionComparison> {
    return request<VersionComparison>(`/versions/compare`, 'GET', undefined, {
      version1Id,
      version2Id,
    });
  },
};

export const corrections = {
  getList(params?: { studentId?: string; versionId?: string }): Promise<ManualCorrection[]> {
    return request<ManualCorrection[]>('/corrections', 'GET', undefined, params);
  },
  create(data: CreateCorrectionRequest): Promise<ManualCorrection> {
    return request<ManualCorrection>('/corrections', 'POST', data);
  },
  getEffectiveness(): Promise<CorrectionEffectiveness> {
    return request<CorrectionEffectiveness>('/corrections/effectiveness', 'GET');
  },
};

export const groups = {
  getStats(params?: { groupBy?: string }): Promise<GroupStats[]> {
    return request<GroupStats[]>('/groups/stats', 'GET', undefined, params);
  },
};

export const importApi = {
  uploadFile(file: File, dataType: string): Promise<ImportPreview> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataType', dataType);
    return request<ImportPreview>('/import/upload', 'POST', formData, undefined);
  },
  confirmImport(data: ImportConfirm): Promise<ImportResult> {
    return request<ImportResult>('/import/confirm', 'POST', data);
  },
};

export default api;
