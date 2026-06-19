import type {
  LedgerRecord,
  ImportBatch,
  MigrationTask,
  MigrationSummary,
  BackupCheck,
  BackupSummary,
  PaginatedResponse,
  GetLedgerParams,
  UpdateLedgerRequest,
  ImportResult,
  ExportRequest,
  ExportResult,
} from '../../shared/types.js';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const ledgerApi = {
  getList: (params: GetLedgerParams = {}): Promise<PaginatedResponse<LedgerRecord>> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    return request<PaginatedResponse<LedgerRecord>>(`/ledger?${query.toString()}`);
  },

  getById: (id: string): Promise<LedgerRecord> => {
    return request<LedgerRecord>(`/ledger/${id}`);
  },

  update: (id: string, updates: UpdateLedgerRequest): Promise<LedgerRecord> => {
    return request<LedgerRecord>(`/ledger/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  getStatusCounts: (): Promise<Record<string, number>> => {
    return request<Record<string, number>>('/ledger/status-counts');
  },

  getGaps: (): Promise<LedgerRecord[]> => {
    return request<LedgerRecord[]>('/ledger/gaps');
  },
};

export const importApi = {
  getBatches: (): Promise<ImportBatch[]> => {
    return request<ImportBatch[]>('/import/batches');
  },

  uploadFile: (file: File, sourceType: string): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceType', sourceType);

    return fetch(`${API_BASE}/import`, {
      method: 'POST',
      body: formData,
    }).then(res => {
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    });
  },

  runDuplicateTest: (): Promise<{ success: boolean; result: ImportResult; message: string }> => {
    return request<{ success: boolean; result: ImportResult; message: string }>('/import/test-duplicate', {
      method: 'POST',
    });
  },
};

export const migrationApi = {
  getSummary: (): Promise<MigrationSummary> => {
    return request<MigrationSummary>('/migration/summary');
  },

  getTasks: (): Promise<MigrationTask[]> => {
    return request<MigrationTask[]>('/migration/tasks');
  },

  startMigration: (tableName: string): Promise<MigrationTask> => {
    return request<MigrationTask>(`/migration/tasks/${tableName}/start`, {
      method: 'POST',
    });
  },
};

export const backupApi = {
  getSummary: (): Promise<BackupSummary> => {
    return request<BackupSummary>('/backup/summary');
  },

  getChecks: (): Promise<BackupCheck[]> => {
    return request<BackupCheck[]>('/backup/checks');
  },

  getGaps: (): Promise<BackupCheck[]> => {
    return request<BackupCheck[]>('/backup/gaps');
  },

  runCheck: (tableName: string): Promise<BackupCheck> => {
    return request<BackupCheck>(`/backup/checks/${tableName}`, {
      method: 'POST',
    });
  },
};

export const exportApi = {
  generate: (exportRequest: ExportRequest): Promise<ExportResult> => {
    return request<ExportResult>('/export', {
      method: 'POST',
      body: JSON.stringify(exportRequest),
    });
  },

  getDownloadUrl: (exportId: string): string => {
    return `${API_BASE}/export/${exportId}/download`;
  },
};
