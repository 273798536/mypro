import type {
  Exercise,
  ExerciseListQuery,
  PaginatedResult,
  ImportResult,
  ExerciseVersion,
  Screenshot,
  ExportJob,
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const json = await response.json();
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data as T;
    }
    return json as T;
  }
  return response as unknown as T;
}

export function getExercises(params?: ExerciseListQuery) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
  }
  const queryString = searchParams.toString();
  return request<PaginatedResult<Exercise>>(
    `/exercises${queryString ? `?${queryString}` : ''}`,
  );
}

export function getExercise(id: string) {
  return request<Exercise>(`/exercises/${id}`);
}

export function createExercise(data: Partial<Exercise>) {
  return request<Exercise>('/exercises', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateExercise(id: string, data: Partial<Exercise>) {
  return request<Exercise>(`/exercises/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteExercise(id: string) {
  return request<void>(`/exercises/${id}`, {
    method: 'DELETE',
  });
}

export function importExercises(formData: FormData, _strategy?: 'skip' | 'overwrite' | 'merge') {
  return fetch(`${API_BASE}/exercises/import`, {
    method: 'POST',
    body: formData,
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const json = await response.json();
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data as ImportResult;
    }
    return json as ImportResult;
  });
}

export function getVersions(exerciseId: string) {
  return request<ExerciseVersion[]>(`/exercises/${exerciseId}/versions`);
}

export function getVersion(exerciseId: string, versionId: string) {
  return request<ExerciseVersion>(`/exercises/${exerciseId}/versions/${versionId}`);
}

export function rollbackVersion(exerciseId: string, versionId: string) {
  return request<Exercise>(`/exercises/${exerciseId}/versions/${versionId}/rollback`, {
    method: 'POST',
  });
}

export function markScreenshot(
  id: string,
  status: Screenshot['reviewStatus'],
  note?: string,
) {
  return request<Screenshot>(`/screenshots/${id}/mark`, {
    method: 'PUT',
    body: JSON.stringify({ status, note }),
  });
}

export function createExport(data: { format: string; filter?: Record<string, unknown> }) {
  return request<ExportJob>('/export', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getExportList() {
  return request<ExportJob[]>('/export/list');
}

export function getExportJob(id: string) {
  return request<ExportJob>(`/export/${id}`);
}

export function downloadExportUrl(id: string) {
  return `${API_BASE}/export/${id}/download`;
}

export function downloadExport(id: string) {
  return fetch(`${API_BASE}/export/${id}/download`).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
  });
}

export function runRepeatImportTestApi() {
  return request<{
    firstImport: ImportResult;
    secondImport: ImportResult;
    duplicateDetectionWorks: boolean;
    message: string;
  }>('/test/repeat-import', {
    method: 'POST',
  });
}

export const exerciseApi = {
  list: getExercises,
  detail: getExercise,
  create: createExercise,
  update: updateExercise,
  remove: deleteExercise,
  importFile: importExercises,
};

export const versionApi = {
  list: getVersions,
  detail: getVersion,
  rollback: rollbackVersion,
};

export const screenshotApi = {
  mark: markScreenshot,
};

export const exportApi = {
  create: createExport,
  list: getExportList,
  detail: getExportJob,
  download: downloadExport,
  downloadUrl: downloadExportUrl,
};

export const testApi = {
  runRepeatImport: runRepeatImportTestApi,
};
