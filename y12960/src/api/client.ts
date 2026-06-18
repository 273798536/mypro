import type {
  ChangeRecord,
  ChangeRecordListItem,
  FilterParams,
  ImportResult,
  SchemaCompareResult,
  SchemaVersion,
  User,
  Role,
  AuditLog,
  RecordStatus,
} from '../../shared/types';

const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  details?: unknown;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': localStorage.getItem('userId') || 'user_2',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  return response.json();
}

export const changeApi = {
  getChanges: (filters: FilterParams & { page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });
    return request<ChangeRecordListItem[]>(`/changes?${params.toString()}`);
  },

  getChange: (id: string) => {
    return request<ChangeRecord & { migrationStatus: unknown }>(`/changes/${id}`);
  },

  importChanges: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<ImportResult>('/changes/import', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },

  downloadTemplate: () => {
    window.open(`${API_BASE}/changes/template`, '_blank');
  },

  updateChange: (id: string, data: { status?: RecordStatus; handlingOpinion?: string }) => {
    return request<ChangeRecord>(`/changes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  bulkUpdate: (ids: string[], status: RecordStatus) => {
    return request<{ updated: number; errors: string[] }>('/changes/bulk-update', {
      method: 'POST',
      body: JSON.stringify({ ids, status }),
    });
  },

  exportChanges: (data: { ids?: string[]; format?: 'excel' | 'pdf'; filters?: FilterParams }) => {
    return fetch(`${API_BASE}/changes/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': localStorage.getItem('userId') || 'user_2',
      },
      body: JSON.stringify(data),
    }).then((res) => {
      const filename = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'export.xlsx';
      return res.blob().then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      });
    });
  },

  endOfMonthTransfer: () => {
    return request<{
      transferred: number;
      unavailable: number;
      pendingReview: number;
      details: Array<{ recordNo: string; tableName: string; fieldName: string; status: string }>;
    }>('/changes/end-of-month-transfer', {
      method: 'POST',
    });
  },

  syncToSource: (id: string, writeBackContent: string) => {
    return request<unknown>(`/changes/${id}/sync`, {
      method: 'POST',
      body: JSON.stringify({ writeBackContent }),
    });
  },
};

export const schemaApi = {
  getVersions: (tableName?: string) => {
    const params = tableName ? `?tableName=${tableName}` : '';
    return request<SchemaVersion[]>(`/schema/versions${params}`);
  },

  getVersion: (id: string) => {
    return request<SchemaVersion>(`/schema/versions/${id}`);
  },

  getTables: () => {
    return request<string[]>('/schema/tables');
  },

  getVersionsForTable: (tableName: string) => {
    return request<Array<{ id: string; version: string; createdAt: string }>>(
      `/schema/tables/${tableName}/versions`
    );
  },

  createVersion: (data: { version: string; tableName: string; fields: unknown[] }) => {
    return request<SchemaVersion>('/schema/versions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  compare: (version1Id: string, version2Id: string) => {
    return request<SchemaCompareResult & { riskAssessment: unknown; summary: string }>(
      '/schema/compare',
      {
        method: 'POST',
        body: JSON.stringify({ version1Id, version2Id }),
      }
    );
  },

  exportReport: (version1Id: string, version2Id: string, format: 'excel' | 'pdf' = 'excel') => {
    return fetch(`${API_BASE}/schema/export-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': localStorage.getItem('userId') || 'user_2',
      },
      body: JSON.stringify({ version1Id, version2Id, format }),
    }).then((res) => {
      const filename = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'report.xlsx';
      return res.blob().then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      });
    });
  },
};

export const permissionApi = {
  getCurrentUser: () => {
    return request<User & { roleDisplay: unknown; permissions: unknown[] }>('/permissions/me');
  },

  getRoles: () => {
    return request<Array<Role & { displayInfo: unknown }>>('/permissions/roles');
  },

  getUsers: () => {
    return request<Array<User & { roleDisplay: unknown }>>('/permissions/users');
  },

  getPermissionList: () => {
    return request<Array<{ resource: string; action: string; name: string; description: string }>>(
      '/permissions/list'
    );
  },

  getAuditLog: (page?: number, pageSize?: number) => {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (pageSize) params.append('pageSize', String(pageSize));
    return request<AuditLog[]>(`/permissions/audit-log?${params.toString()}`);
  },

  updateUserRole: (userId: string, role: string) => {
    return request<User & { roleDisplay: unknown }>(`/permissions/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  updateRolePermissions: (roleId: string, permissions: string[]) => {
    return request<Role & { displayInfo: unknown }>(`/permissions/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
  },
};
