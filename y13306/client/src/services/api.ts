import axios from 'axios';
import type {
  EvaluationRecord,
  ListResponse,
  ApiResponse,
  Statistics,
  ModelVersion,
} from '../types';

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

request.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse<any>;
    if (res.code !== 0) {
      return Promise.reject(new Error(res.message || '请求失败'));
    }
    return res.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const api = {
  getEvaluations: (params: {
    batchId?: string;
    status?: string;
    medicalRecordId?: string;
    modelVersionId?: string;
    isDuplicate?: boolean;
    hasWithdrawal?: boolean;
    page?: number;
    pageSize?: number;
  }) => {
    return request.get<any, ListResponse<EvaluationRecord>>(
      '/evaluations',
      { params }
    );
  },

  getEvaluation: (id: string) => {
    return request.get<any, EvaluationRecord>(`/evaluations/${id}`);
  },

  getStatistics: (batchId?: string) => {
    return request.get<any, Statistics>('/evaluations/statistics', {
      params: { batchId },
    });
  },

  createEvaluation: (data: {
    batchId?: string;
    medicalRecordId: string;
    questionId: string;
    questionContent: string;
    modelAnswer: string;
    standardAnswer?: string;
    modelVersionId: string;
    isCorrect?: boolean;
    confidence?: number;
    errorType?: string;
    judgeReason?: string;
  }) => {
    return request.post<any, EvaluationRecord>('/evaluations', data);
  },

  withdraw: (id: string, data: { reason: string; operator: string }) => {
    return request.post<any, EvaluationRecord>(
      `/evaluations/${id}/withdraw`,
      data
    );
  },

  linkConclusion: (
    id: string,
    data: { conclusionId: string; operator: string }
  ) => {
    return request.post<any, EvaluationRecord>(
      `/evaluations/${id}/link-conclusion`,
      data
    );
  },

  confirm: (
    id: string,
    data: { operator: string; confirmReason?: string }
  ) => {
    return request.post<any, EvaluationRecord>(
      `/evaluations/${id}/confirm`,
      data
    );
  },

  revise: (
    id: string,
    data: {
      isCorrect: boolean;
      judgeReason: string;
      revisionReason: string;
      operator: string;
    }
  ) => {
    return request.post<any, EvaluationRecord>(
      `/evaluations/${id}/revise`,
      data
    );
  },

  importCsv: (file: File, modelVersionId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('modelVersionId', modelVersionId);
    return request.post<any, {
      batchId: string;
      total: number;
      success: number;
      failed: number;
      duplicates: number;
      errors: string[];
    }>('/csv/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  exportCsv: (batchId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (batchId) params.append('batchId', batchId);
    if (status) params.append('status', status);
    window.open(`/api/csv/export?${params.toString()}`, '_blank');
  },

  getModelVersions: () => {
    return request.get<any, ModelVersion[]>('/model-versions');
  },
};
