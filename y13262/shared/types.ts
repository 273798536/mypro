export type ComplaintStatus = "pending" | "merged" | "confirmed";
export type ConfirmationAction = "confirm" | "unconfirm" | "edit_note" | "merge" | "unmerge";
export type ExportFormat = "csv" | "json";

export interface Complaint {
  id: string;
  original_text: string;
  location_raw: string;
  location_normalized: string;
  status: ComplaintStatus;
  source: string;
  reported_at: string;
  note: string;
  merge_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  complaint_id: string;
  url: string;
  original_name: string;
  is_available: boolean;
}

export interface MergeRecord {
  id: string;
  group_id: string;
  merged_location: string;
  merge_basis: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  complaint_ids: string[];
  original_locations: { complaint_id: string; location_raw: string }[];
}

export interface NoteHistory {
  id: string;
  complaint_id: string;
  field: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  changed_at: string;
}

export interface ConfirmationLog {
  id: string;
  merge_group_id: string | null;
  complaint_id?: string | null;
  action: ConfirmationAction;
  before_snapshot: Record<string, unknown>;
  after_snapshot: Record<string, unknown>;
  operator: string;
  operated_at: string;
}

export interface GetComplaintsQuery {
  status?: ComplaintStatus;
  location?: string;
  keyword?: string;
  date_from?: string;
  date_to?: string;
}

export interface GetComplaintsResponse {
  complaints: Complaint[];
  total: number;
}

export interface GetComplaintResponse {
  complaint: Complaint;
  photos: Photo[];
  merge_group: Complaint[] | null;
  merge_record: MergeRecord | null;
  history: NoteHistory[];
}

export interface CreateMergeBody {
  complaint_ids: string[];
  merged_location: string;
  merge_basis: string;
}

export interface GetHistoriesQuery {
  complaint_id?: string;
  merge_group_id?: string;
  action?: ConfirmationAction;
  date_from?: string;
  date_to?: string;
}

export interface GetHistoriesResponse {
  logs: ConfirmationLog[];
  total: number;
}

export interface ExportBody {
  status?: ComplaintStatus;
  date_from?: string;
  date_to?: string;
  location?: string;
  format: ExportFormat;
}
