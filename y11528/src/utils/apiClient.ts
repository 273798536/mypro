import * as http from 'http';

export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: any;
  token?: string;
  host?: string;
  port?: number;
}

export interface ApiResponse<T = any> {
  status: number;
  data: T;
  headers: any;
}

export class ApiClient {
  private host: string;
  private port: number;
  private token: string | null = null;

  constructor(host = 'localhost', port = 3000) {
    this.host = host;
    this.port = port;
  }

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
  }

  async request<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    return new Promise((resolve, reject) => {
      const postData = options.body ? JSON.stringify(options.body) : null;
      
      const headers: any = {
        'Content-Type': 'application/json'
      };
      
      if (postData) {
        headers['Content-Length'] = Buffer.byteLength(postData);
      }
      
      const token = options.token || this.token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request({
        hostname: this.host,
        port: this.port,
        path: options.path,
        method: options.method,
        headers
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({
              status: res.statusCode || 500,
              data: parsed,
              headers: res.headers
            });
          } catch (e) {
            resolve({
              status: res.statusCode || 500,
              data: data as any,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', reject);

      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  async get<T>(path: string, token?: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', path, token });
  }

  async post<T>(path: string, body?: any, token?: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', path, body, token });
  }

  async put<T>(path: string, body?: any, token?: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', path, body, token });
  }

  async delete<T>(path: string, token?: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', path, token });
  }
}

export const apiClient = new ApiClient();
