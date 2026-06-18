export type TicketStatus = 'pending' | 'processing' | 'confirmed' | 'citation_missing' | 'completed';
export type CitationStatus = 'complete' | 'partial' | 'missing';

export interface Ticket {
  id: number;
  ticket_no: string;
  title: string;
  original_cluster: string;
  final_cluster: string | null;
  status: TicketStatus;
  citation_urls: string[];
  citation_status: CitationStatus;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewRecord {
  id: number;
  ticket_id: number;
  reviewer: string;
  before_cluster: string;
  after_cluster: string;
  review_note: string;
  screenshot_descriptions: string;
  created_at: string;
}

export interface HistoryVersion {
  id: number;
  ticket_id: number;
  version: number;
  field_name: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  changed_at: string;
  change_note: string;
  old_screenshot_refs: string[];
}

export interface Screenshot {
  id: number;
  ticket_id: number;
  filename: string;
  filepath: string;
  description: string;
  uploaded_by: string;
  uploaded_at: string;
  is_legacy: boolean;
}

export interface MissingCitationRecord {
  id: number;
  ticket_id: number;
  missing_items: {
    field: string;
    expected: string;
    actual: string | null;
  }[];
  reason: string;
  reason_detail: string;
  impact_scope: {
    affected_reports: string[];
    affected_clusters: string[];
    estimated_count: number;
    severity: 'low' | 'medium' | 'high';
  };
  confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface GrayResult {
  id: number;
  gray_batch: string;
  report_date: string;
  sample_change: {
    before_count: number;
    after_count: number;
    difference: number;
    difference_rate: string;
    details: { added: number; removed: number; modified: number };
  };
  threshold_change: {
    before_threshold: number;
    after_threshold: number;
    impact_count: number;
    impact_details: { upgraded: number; downgraded: number; unchanged: number };
  };
  manual_review: {
    total_reviewed: number;
    total_changed: number;
    change_rate: string;
    details: { cluster_adjusted: number; citation_added: number; note_appended: number };
  };
  created_at: string;
}

export interface StatsData {
  total_tickets: number;
  pending: number;
  processing: number;
  citation_missing: number;
  completed: number;
  total_reviews: number;
  total_history: number;
  unconfirmed_missing: number;
}
