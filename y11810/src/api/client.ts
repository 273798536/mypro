import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../../shared/types';

export function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

export interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
}

export interface OperatorInfo {
  operatorId: string;
  operatorName: string;
}

let operatorInfo: OperatorInfo | null = null;
let currentTraceId: string | null = null;

export function setOperatorInfo(info: OperatorInfo | null): void {
  operatorInfo = info;
}

export function getOperatorInfo(): OperatorInfo | null {
  return operatorInfo;
}

export function setTraceId(traceId: string | null): void {
  currentTraceId = traceId;
}

export function getTraceId(): string | null {
  return currentTraceId;
}

function requestInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const traceId = currentTraceId || generateTraceId();
  config.headers['x-trace-id'] = traceId;

  if (operatorInfo) {
    config.headers['x-operator-id'] = operatorInfo.operatorId;
    config.headers['x-operator-name'] = encodeURIComponent(operatorInfo.operatorName);
  }

  return config;
}

function responseInterceptor(response: AxiosResponse): AxiosResponse {
  return response;
}

function errorInterceptor(error: any): Promise<never> {
  if (error.response) {
    const { data, status } = error.response;
    const message = data?.message || data?.error || `HTTP Error ${status}`;
    const traceId = data?.traceId || error.config?.headers?.['x-trace-id'];
    error.message = message;
    error.traceId = traceId;
    error.status = status;
  } else if (error.request) {
    error.message = '网络请求失败，请检查网络连接';
    error.status = 0;
  }
  return Promise.reject(error);
}

const client: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(requestInterceptor, Promise.reject);
client.interceptors.response.use(responseInterceptor, errorInterceptor);

export async function request<T = unknown>(config: RequestConfig): Promise<T> {
  const response = await client.request<ApiResponse<T>>(config);
  const { data } = response;
  
  if (!data.success) {
    const error = new Error(data.message || data.error || '请求失败');
    (error as any).traceId = data.traceId;
    throw error;
  }
  
  return data.data as T;
}

export default client;
