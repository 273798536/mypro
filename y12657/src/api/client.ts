import type {
  Inspection,
  InspectionDetail,
  SectionParams,
  MeasurePoint,
  ChangeHistory,
  BatchCompareResult,
  InspectionStatus,
  ApiResponse,
} from '@shared/types';

const BASE_URL = '/api';

export interface InspectionListItem extends Inspection {
  abnormalCount: number;
  totalPoints: number;
}

export interface ListParams {
  keyword?: string;
  status?: InspectionStatus;
}

export interface CreateInspectionData {
  projectName: string;
  garageCode: string;
  scope?: string;
  baseUnit?: 'm' | 'cm' | 'mm';
  minClearanceRequired?: number;
}

export interface ImportInspectionData extends CreateInspectionData {
  points: Array<{
    sectionLineId?: string;
    code?: string;
    coordinate?: { x: number; y: number; z: number };
    measuredValue?: number;
    screenshotUrl?: string;
    remark?: string;
    handlingOpinion?: string;
  }>;
}

export interface UpdateParamsData {
  beamHeight?: number;
  pipeDiameter?: number;
  ceilingThickness?: number;
  slabThickness?: number;
  floorElevation?: number;
  reason?: string;
  operator?: string;
}

export interface UpdatePointData {
  measuredValue?: number;
  status?: 'normal' | 'abnormal' | 'revised' | 'confirmed';
  remark?: string;
  handlingOpinion?: string;
  isAbnormal?: boolean;
  reason?: string;
  operator?: string;
}

export interface ReviewData {
  pass: boolean;
  reason?: string;
  operator?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const defaultHeaders: Record<string, string> = {};

  if (options?.body && !(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `请求失败: ${res.status} ${res.statusText}`;
    try {
      const errData = (await res.json()) as ApiResponse<unknown>;
      if (errData.error || errData.message) {
        errorMsg = errData.error || errData.message || errorMsg;
      }
    } catch {
      // 忽略 JSON 解析错误
    }
    throw new Error(errorMsg);
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = (await res.json()) as ApiResponse<T>;
    if (!data.success) {
      throw new Error(data.error || data.message || '请求失败');
    }
    return data.data as T;
  }

  return (await res.blob()) as unknown as T;
}

export async function listInspections(params?: ListParams): Promise<InspectionListItem[]> {
  const query = new URLSearchParams();
  if (params?.keyword) query.set('keyword', params.keyword);
  if (params?.status) query.set('status', params.status);
  const queryStr = query.toString();
  return request<InspectionListItem[]>(`/inspections${queryStr ? `?${queryStr}` : ''}`);
}

export async function getInspection(id: string): Promise<InspectionDetail> {
  return request<InspectionDetail>(`/inspections/${id}`);
}

export async function createInspection(data: CreateInspectionData): Promise<Inspection> {
  return request<Inspection>('/inspections', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function importInspection(data: ImportInspectionData): Promise<{ id: string }> {
  return request<{ id: string }>('/inspections/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getParams(id: string): Promise<SectionParams> {
  return request<SectionParams>(`/inspections/${id}/params`);
}

export async function updateParams(
  id: string,
  data: UpdateParamsData
): Promise<{ params: SectionParams; points: MeasurePoint[]; batchId: string }> {
  return request<{ params: SectionParams; points: MeasurePoint[]; batchId: string }>(`/inspections/${id}/params`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getPoints(id: string): Promise<MeasurePoint[]> {
  return request<MeasurePoint[]>(`/inspections/${id}/points`);
}

export async function updatePoint(
  id: string,
  pointId: string,
  data: UpdatePointData
): Promise<MeasurePoint> {
  return request<MeasurePoint>(`/inspections/${id}/points/${pointId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getHistory(id: string): Promise<ChangeHistory[]> {
  return request<ChangeHistory[]>(`/inspections/${id}/history`);
}

export async function getCompare(
  id: string,
  beforeBatch?: string,
  afterBatch?: string
): Promise<BatchCompareResult> {
  const query = new URLSearchParams();
  if (beforeBatch) query.set('beforeBatch', beforeBatch);
  if (afterBatch) query.set('afterBatch', afterBatch);
  const queryStr = query.toString();
  return request<BatchCompareResult>(`/inspections/${id}/compare${queryStr ? `?${queryStr}` : ''}`);
}

export async function reviewInspection(
  id: string,
  data: ReviewData
): Promise<{ status: InspectionStatus }> {
  return request<{ status: InspectionStatus }>(`/inspections/${id}/review`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function exportReport(id: string, format: 'xlsx' | 'pdf' = 'xlsx'): Promise<string> {
  const blob = await request<Blob>(`/inspections/${id}/export?format=${format}`);
  return URL.createObjectURL(blob);
}
