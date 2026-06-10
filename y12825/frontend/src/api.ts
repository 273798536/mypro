import type {
  Sample,
  LineageSummary,
  LineageDetail,
  AnomalyItem,
  CorrectionRecord,
  QCSummary,
  CorrectionPayload,
  ImportResult,
} from "./types";

const BASE = "";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function fetchSamples(qcStatus?: string): Promise<Sample[]> {
  const params = qcStatus ? `?qc_status=${qcStatus}` : "";
  return request<Sample[]>(`/api/samples${params}`);
}

export function fetchLineages(): Promise<LineageSummary[]> {
  return request<LineageSummary[]>("/api/lineages");
}

export function fetchLineageDetail(lineageId: string): Promise<LineageDetail> {
  return request<LineageDetail>(`/api/lineages/${lineageId}`);
}

export function fetchAnomalies(): Promise<AnomalyItem[]> {
  return request<AnomalyItem[]>("/api/anomalies");
}

export function postCorrection(payload: CorrectionPayload): Promise<CorrectionRecord> {
  return request<CorrectionRecord>("/api/corrections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchCorrections(): Promise<CorrectionRecord[]> {
  return request<CorrectionRecord[]>("/api/corrections");
}

export function fetchQCSummary(): Promise<QCSummary> {
  return request<QCSummary>("/api/qc-summary");
}

export function postImport(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return request<ImportResult>("/api/import", {
    method: "POST",
    body: formData,
  });
}
