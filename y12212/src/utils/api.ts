const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  const result = await response.json();
  if (result && result.success !== undefined) {
    if (result.success) {
      return result.data as T;
    }
    throw new Error(result.error || 'API Error');
  }
  return result as T;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<T>(response);
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

export async function apiPut<T = unknown>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

export async function apiUpload<T = unknown>(path: string, file: File, type: string): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE_URL}${path}?type=${encodeURIComponent(type)}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return handleResponse<T>(response);
}
