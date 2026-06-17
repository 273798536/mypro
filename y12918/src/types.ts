export type ReportStatus =
  | 'pending'
  | 'processing'
  | 'pending_review'
  | 'reviewing'
  | 'completed'
  | 'exported';

export interface EvaluationSet {
  id: number;
  name: string;
  description: string | null;
  source: string | null;
  total_questions: number;
  created_at: string;
  updated_at: string;
}

export interface DomainVocabulary {
  id: number;
  name: string;
  domain: string;
  total_terms: number;
  created_at: string;
  updated_at: string;
}

export interface CoverageReport {
  id: number;
  name: string;
  evaluation_set_id: number;
  vocabulary_id: number;
  status: ReportStatus;
  total_questions: number;
  covered_questions: number;
  coverage_rate: number;
  total_terms: number;
  hit_terms: number;
  summary: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  exported_at: string | null;
}

export interface ReportItem {
  id: number;
  report_id: number;
  question_id: string;
  question_text: string;
  is_covered: number;
  hit_terms: string;
  annotation_status: 'none' | 'partial' | 'full';
  annotation_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewRecord {
  id: number;
  report_id: number;
  report_item_id: number;
  reviewer: string;
  action: 'confirm' | 'reject' | 'supplement';
  comment: string | null;
  annotation_data: string | null;
  created_at: string;
}

export interface ImportResult {
  success: boolean;
  totalCount: number;
  newCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  errors?: string[];
}
