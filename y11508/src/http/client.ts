import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class HttpClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  setUserContext(username: string): void {
    this.client.defaults.headers.common['X-User'] = username;
  }

  async request<T = any>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.request(config);
      const contentType = String(response.headers['content-type'] || '');
      
      if (contentType.includes('text/csv') || typeof response.data === 'string') {
        return {
          success: true,
          data: {
            contentType,
            content: response.data,
            filename: String(response.headers['content-disposition'] || '')
          } as any
        };
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const contentType = String(error.response.headers['content-type'] || '');
        if (contentType.includes('text/csv') || typeof error.response.data === 'string') {
          return {
            success: true,
            data: {
              contentType,
              content: error.response.data,
              filename: String(error.response.headers['content-disposition'] || '')
            } as any
          };
        }
        return {
          success: false,
          error: error.response.data?.error || error.response.statusText,
          message: error.response.data?.message
        };
      }
      return {
        success: false,
        error: error.message
      };
    }
  }

  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', url, params });
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', url, data });
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', url, data });
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', url });
  }

  async getDevices() {
    return this.get('/devices');
  }

  async getDevice(deviceCode: string) {
    return this.get(`/devices/${deviceCode}`);
  }

  async createDevice(data: any) {
    return this.post('/devices', data);
  }

  async updateDeviceStatus(deviceCode: string, status: string, reason: string) {
    return this.put(`/devices/${deviceCode}/status`, { status, reason });
  }

  async getInspections(params?: any) {
    return this.get('/inspections', params);
  }

  async createInspection(data: any) {
    return this.post('/inspections', data);
  }

  async updateInspectionStatus(id: string, status: string, reason: string) {
    return this.put(`/inspections/${id}/status`, { status, reason });
  }

  async getCertificates(params?: any) {
    return this.get('/certificates', params);
  }

  async createCertificate(data: any) {
    return this.post('/certificates', data);
  }

  async getQuotes(params?: any) {
    return this.get('/quotes', params);
  }

  async createQuote(data: any) {
    return this.post('/quotes', data);
  }

  async getConfirms(params?: any) {
    return this.get('/confirms', params);
  }

  async createConfirm(data: any) {
    return this.post('/confirms', data);
  }

  async getDashboard() {
    return this.get('/dashboard');
  }

  async getReconciliation() {
    return this.get('/reconciliation');
  }

  async runStatusCheck() {
    return this.post('/status-check');
  }

  async importData(source: string, filePath: string) {
    return this.post('/import', { source, filePath });
  }

  async getImportFailures() {
    return this.get('/import-failures');
  }

  async exportReport(reportType: string) {
    return this.get(`/export/${reportType}`);
  }

  async getStatusLogs(entityType?: string, entityId?: string) {
    const params: any = {};
    if (entityType) params.entityType = entityType;
    if (entityId) params.entityId = entityId;
    return this.get('/status-logs', params);
  }

  async createReplaySession(name: string) {
    return this.post('/replay/sessions', { name });
  }

  async getReplaySessions() {
    return this.get('/replay/sessions');
  }

  async executeReplaySession(sessionId: string) {
    return this.post(`/replay/sessions/${sessionId}/execute`);
  }
}