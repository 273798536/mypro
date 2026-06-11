export type ActivityLevel = 'high' | 'medium' | 'low' | 'inactive';
export type ReviewStatus = 'pending' | 'reviewed' | 'conflict';

export interface Sample {
  id: string;
  reagent_batch: string;
  sample_no: string;
  strain_name: string;
  original_row: number;
  source_file: string;
  source_note?: string;
  sequencing_result?: string;
  activity_level?: ActivityLevel;
  conclusion?: string;
  reviewer?: string;
  review_status: ReviewStatus;
  import_batch: string;
  created_at: string;
  updated_at: string;
  images?: MicroscopeImage[];
  image_count?: number;
}

export interface MicroscopeImage {
  id: string;
  sample_id?: string;
  file_name: string;
  file_path: string;
  source_note?: string;
  original_row?: number;
  import_batch?: string;
  captured_at?: string;
  created_at: string;
  annotations?: Annotation[];
}

export interface Annotation {
  id: string;
  image_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  note?: string;
  created_by: string;
  created_at: string;
}

export interface Report {
  id: string;
  reagent_batch: string;
  title: string;
  generated_by: string;
  summary?: string;
  created_at: string;
  updated_at: string;
}

export interface ImportRecord {
  id: string;
  file_name: string;
  import_type: 'samples' | 'images';
  import_batch: string;
  row_count: number;
  inserted_count: number;
  updated_count: number;
  conflict_count: number;
  created_at: string;
}

export interface BatchInfo {
  reagent_batch: string;
  sample_count: number;
  reviewed_count: number;
  conflict_count: number;
  first_imported: string;
}

export const activityLevelLabels: Record<ActivityLevel, string> = {
  high: '高活性',
  medium: '中活性',
  low: '低活性',
  inactive: '无活性'
};

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  pending: '待复核',
  reviewed: '已复核',
  conflict: '存在冲突'
};

export const activityLevelColors: Record<ActivityLevel, string> = {
  high: '#52c41a',
  medium: '#faad14',
  low: '#fa8c16',
  inactive: '#ff4d4f'
};

export const reviewStatusColors: Record<ReviewStatus, string> = {
  pending: '#faad14',
  reviewed: '#52c41a',
  conflict: '#ff4d4f'
};
