import type {
  ApiResponse,
  CommunityFeedback,
  ConsistencyReport,
  ItemStatus,
  Judgement,
  Location,
  Material,
  NoticeItem,
} from "@/shared/types";

const BASE = import.meta.env.VITE_API_BASE || "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const result = (await response.json()) as ApiResponse<T>;
  if (result.code !== 0) {
    throw new Error(result.msg);
  }
  return result.data;
}

interface GetItemsParams {
  status?: ItemStatus;
  keyword?: string;
  materialComplete?: "all" | "incomplete" | "complete";
}

interface GetMaterialsParams {
  locationId?: string;
}

export function getLocations(): Promise<Location[]> {
  return request<Location[]>("/locations", { method: "GET" });
}

export function createLocation(payload: Partial<Location>): Promise<Location> {
  return request<Location>("/locations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAliases(id: string, aliases: string[]): Promise<Location> {
  return request<Location>(`/locations/${id}/aliases`, {
    method: "PUT",
    body: JSON.stringify({ aliases }),
  });
}

export function checkCoordinate(
  id: string,
  coords: { lng: number; lat: number },
): Promise<{ valid: boolean; reason?: string }> {
  return request<{ valid: boolean; reason?: string }>(`/locations/${id}/check-coordinate`, {
    method: "POST",
    body: JSON.stringify(coords),
  });
}

export function getMaterials(params?: GetMaterialsParams): Promise<Material[]> {
  const query = new URLSearchParams();
  if (params?.locationId) {
    query.set("locationId", params.locationId);
  }
  const queryStr = query.toString();
  return request<Material[]>(`/materials${queryStr ? `?${queryStr}` : ""}`, { method: "GET" });
}

export function uploadMaterial(formData: FormData): Promise<Material> {
  return request<Material>("/materials", {
    method: "POST",
    body: formData,
    headers: {},
  });
}

export function getMaterialVersions(id: string): Promise<Material[]> {
  return request<Material[]>(`/materials/${id}/versions`, { method: "GET" });
}

export function getItems(params?: GetItemsParams): Promise<NoticeItem[]> {
  const query = new URLSearchParams();
  if (params?.status) {
    query.set("status", params.status);
  }
  if (params?.keyword) {
    query.set("keyword", params.keyword);
  }
  if (params?.materialComplete) {
    query.set("materialComplete", params.materialComplete);
  }
  const queryStr = query.toString();
  return request<NoticeItem[]>(`/items${queryStr ? `?${queryStr}` : ""}`, { method: "GET" });
}

export function createItem(payload: Partial<NoticeItem>): Promise<NoticeItem> {
  return request<NoticeItem>("/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateItem(
  id: string,
  patch: Partial<NoticeItem>,
): Promise<NoticeItem> {
  return request<NoticeItem>(`/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function getJudgement(id: string): Promise<Judgement> {
  return request<Judgement>(`/items/${id}/judgement`, { method: "GET" });
}

export function getFeedbacks(itemId: string): Promise<CommunityFeedback[]> {
  const query = new URLSearchParams();
  query.set("itemId", itemId);
  return request<CommunityFeedback[]>(`/feedbacks?${query.toString()}`, { method: "GET" });
}

export function createFeedback(payload: Partial<CommunityFeedback>): Promise<CommunityFeedback> {
  return request<CommunityFeedback>("/feedbacks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function consistencyCheck(): Promise<ConsistencyReport[]> {
  return request<ConsistencyReport[]>("/consistency/check", { method: "POST" });
}

export function consistencyFix(payload: ConsistencyReport): Promise<void> {
  return request<void>("/consistency/fix", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTimelineItems(dateStr: string): Promise<NoticeItem[]> {
  const query = new URLSearchParams();
  query.set("date", dateStr);
  return request<NoticeItem[]>(`/timeline/items?${query.toString()}`, { method: "GET" });
}
