import type {
  Device,
  BorrowRecord,
  Anomaly,
  InventoryCheck,
  ExportData,
  ApiResponse
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '请求失败'
    };
  }
}

export const api = {
  devices: {
    getAll: () => request<Device[]>('/devices'),
    getById: (id: string) => request<Device>(`/devices/${id}`),
    create: (data: { name: string; category: string; imageUrl?: string }) =>
      request<Device>('/devices', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<Device>) =>
      request<Device>(`/devices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    addNote: (id: string, data: { content: string; author: string }) =>
      request<Device>(`/devices/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  records: {
    getAll: () => request<BorrowRecord[]>('/records'),
    getById: (id: string) => request<BorrowRecord>(`/records/${id}`),
    borrow: (data: {
      deviceId: string;
      deviceName: string;
      borrower: string;
      expectedReturnDate: string;
    }) =>
      request<BorrowRecord>('/records/borrow', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    return: (id: string, data?: { damageNote?: string; damagePhotoUrl?: string }) =>
      request<BorrowRecord>(`/records/${id}/return`, {
        method: 'POST',
        body: JSON.stringify(data || {})
      }),
    extend: (id: string, data: {
      newExpectedReturnDate: string;
      reason: string;
      author: string;
    }) =>
      request<BorrowRecord>(`/records/${id}/extend`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
  },

  anomalies: {
    getAll: () => request<Anomaly[]>('/anomalies'),
    getById: (id: string) => request<Anomaly>(`/anomalies/${id}`),
    detect: () =>
      request<Anomaly[]>('/anomalies/detect', {
        method: 'POST'
      }),
    resolve: (id: string, data: { resolutionNote: string; newDeviceStatus?: string }) =>
      request<Anomaly>(`/anomalies/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  inventory: {
    getAll: () => request<InventoryCheck[]>('/inventory'),
    getById: (id: string) => request<InventoryCheck>(`/inventory/${id}`),
    create: () =>
      request<InventoryCheck>('/inventory', {
        method: 'POST'
      }),
    updateItems: (id: string, items: InventoryCheck['items']) =>
      request<InventoryCheck>(`/inventory/${id}/items`, {
        method: 'PUT',
        body: JSON.stringify({ items })
      }),
    complete: (id: string) =>
      request<InventoryCheck>(`/inventory/${id}/complete`, {
        method: 'POST'
      })
  },

  importExport: {
    loadSample: () => request('/sample', { method: 'GET' }),
    exportData: () => request<ExportData>('/export'),
    exportExcel: () => fetch(`${API_BASE}/export/excel`),
    importData: (data: { fileType: string; data: unknown }) =>
      request('/import', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  }
};
