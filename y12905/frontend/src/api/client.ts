import axios, { AxiosError } from 'axios';
import type { ActionableErrorResp } from '../types';

export const api = axios.create({
  baseURL: '/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

export function parseError(err: unknown): ActionableErrorResp {
  const axErr = err as AxiosError<ActionableErrorResp>;
  if (axErr?.response?.data && typeof axErr.response.data === 'object' && 'error_code' in axErr.response.data) {
    return axErr.response.data;
  }
  return {
    error_code: axErr?.code || 'UNKNOWN',
    message: axErr?.message || '网络错误或服务不可用',
    action: '请确认后端服务是否启动：cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000',
    request_id: '-',
  };
}
