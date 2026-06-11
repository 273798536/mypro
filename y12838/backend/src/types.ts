export interface Sample {
  id: string;
  reagent_batch: string;
  sample_no: string;
  strain_name: string;
  original_row: number;
  source_file: string;
  source_note?: string;
  sequencing_result?: string;
  activity_level?: 'high' | 'medium' | 'low' | 'inactive';
  conclusion?: string;
  reviewer?: string;
  review_status: 'pending' | 'reviewed' | 'conflict';
  import_batch: string;
  created_at: string;
  updated_at: string;
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
