export type PointStatus = 'pending' | 'processing' | 'evidence_needed' | 'completed' | 'merged';

export type SchemeStatus = 'active' | 'superseded' | 'conflict';

export interface GisPoint {
  id: string;
  name: string;
  address: string;
  lng: number;
  lat: number;
  status: PointStatus;
  source: string;
  raw_data: Record<string, unknown>;
  corrected_fields: string[];
  created_at: string;
  updated_at: string;
}

export interface Scheme {
  id: string;
  point_id: string;
  title: string;
  content: string;
  version: string;
  status: SchemeStatus;
  is_conflict: boolean;
  created_at: string;
  created_by: string;
}

export interface Note {
  id: string;
  point_id: string;
  content: string;
  created_at: string;
  created_by: string;
}

export interface ScreenshotMeta {
  id: string;
  point_id: string;
  data_url: string;
  description: string;
  created_at: string;
}

export interface VersionRecord {
  id: string;
  point_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  changed_at: string;
  changed_by: string;
}

export interface MergeRelation {
  id: string;
  source_point_id: string;
  target_point_id: string;
  name_similarity: number;
  distance_meters: number;
  merged_at: string;
  merged_by: string;
}

export interface FilterState {
  status: PointStatus[];
  source: string[];
  has_notes: boolean | null;
  has_screenshots: boolean | null;
  has_conflict: boolean | null;
  keyword: string;
  date_from: string | null;
  date_to: string | null;
}

export interface MergeCandidate {
  point_a: GisPoint;
  point_b: GisPoint;
  name_similarity: number;
  distance_meters: number;
}

export const STATUS_LABELS: Record<PointStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  evidence_needed: '待补证据',
  completed: '已处理',
  merged: '已归并',
};

export const STATUS_COLORS: Record<PointStatus, string> = {
  pending: 'bg-red-100 text-red-800 border-red-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  evidence_needed: 'bg-amber-100 text-amber-800 border-amber-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  merged: 'bg-slate-100 text-slate-800 border-slate-200',
};
