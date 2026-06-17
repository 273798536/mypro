export type PointStatus = "processed" | "pending_site" | "conflict";

export interface ReviewPoint {
  id: string;
  name: string;
  address: string;
  gisLng: string;
  gisLat: string;
  designCapacity: number;
  status: PointStatus;
  hasConflict: boolean;
  conclusion: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  district: string;
}

export interface VersionRecord {
  id: string;
  pointId: string;
  versionLabel: string;
  content: string;
  author: string;
  createdAt: string;
  isOverridden: boolean;
  overrideNote?: string;
  nodeType: "processed" | "pending" | "conflict";
}

export interface RemarkRecord {
  id: string;
  pointId: string;
  content: string;
  conclusionImpact: string;
  author: string;
  createdAt: string;
}

export interface EvidenceRecord {
  id: string;
  pointId: string;
  imageUrl: string;
  description: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface FilterState {
  activeStatus: PointStatus | "all";
  searchKeyword: string;
}

export const STATUS_LABEL: Record<PointStatus | "all", string> = {
  all: "全部点位",
  processed: "已处理",
  pending_site: "待现场看",
  conflict: "冲突记录",
};

export const STATUS_COLOR: Record<PointStatus, string> = {
  processed: "moss",
  pending_site: "amber",
  conflict: "clay",
};
