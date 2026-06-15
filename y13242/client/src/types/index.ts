export interface Booth {
  id: number;
  booth_number: string;
  label_name: string;
  contact_person: string | null;
  phone: string | null;
  song_name: string | null;
  song_alias: string | null;
  rehearsal_info: string | null;
  authorization_note: string | null;
  status: BoothStatus;
  final_conclusion: string | null;
  manual_annotation: string | null;
  delivery_checklist: string | null;
  created_at: string;
  updated_at: string;
  notes?: BoothNote[];
  history?: HistoryRecord[];
}

export type BoothStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';

export interface BoothNote {
  id: number;
  booth_id: number;
  note_type: string;
  content: string;
  author: string;
  created_at: string;
}

export interface HistoryRecord {
  id: number;
  booth_id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  operator: string;
  comment: string | null;
  changed_at: string;
}

export interface Issue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  booth_ids: number[];
  detail?: any;
}

export interface PageSummary {
  total_count: number;
  status_count: {
    pending: number;
    reviewing: number;
    approved: number;
    rejected: number;
  };
  with_conclusion: number;
  with_linked_notes: number;
  issue_count: number;
  duplicate_count: number;
  last_updated: string;
}

export interface AppStateItem<T = any> {
  value: T;
  updated_at: string;
}

export interface AllStates {
  [key: string]: AppStateItem;
}
