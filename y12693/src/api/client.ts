import type {
  LightRecord,
  HistoryEntry,
  TraceNode,
  RecordFilter,
  ImportResult,
  ApiResponse,
} from "../../shared/types";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "请求失败");
  }
  return data as T;
}

export const api = {
  listRecords(filter: RecordFilter = {}): Promise<ApiResponse<LightRecord[]>> {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v));
    });
    const qs = params.toString();
    return request<ApiResponse<LightRecord[]>>(`/api/records${qs ? `?${qs}` : ""}`);
  },

  getRecord(id: string): Promise<ApiResponse<LightRecord>> {
    return request<ApiResponse<LightRecord>>(`/api/records/${id}`);
  },

  updateRecord(
    id: string,
    updates: Partial<LightRecord>
  ): Promise<ApiResponse<LightRecord>> {
    return request<ApiResponse<LightRecord>>(`/api/records/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...updates, operator: "当前讲解员" }),
    });
  },

  getHistory(id: string): Promise<ApiResponse<HistoryEntry[]>> {
    return request<ApiResponse<HistoryEntry[]>>(`/api/records/${id}/history`);
  },

  getTrace(id: string): Promise<ApiResponse<TraceNode[]>> {
    return request<ApiResponse<TraceNode[]>>(`/api/records/${id}/trace`);
  },

  importRecord(payload: Omit<LightRecord, "id" | "createdAt" | "updatedAt">) {
    return fetch("/api/records/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json()) as Promise<ImportResult>;
  },

  exportUrl(format: "csv" | "json" = "json", ids?: string[]): string {
    const params = new URLSearchParams({ format });
    if (ids?.length) params.set("ids", ids.join(","));
    return `/api/records/export?${params.toString()}`;
  },
};
