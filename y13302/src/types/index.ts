export type SourceType = "online_ticket" | "anomaly" | "supplement";

export type OrderStatus = "pending" | "confirmed" | "revoked";

export type ActionType = "confirm" | "revoke" | "modify";

export interface WorkOrder {
  id: string;
  title: string;
  content: string;
  model_summary: string;
  source_type: SourceType;
  status: OrderStatus;
  confidence: number;
  threshold_affected: boolean;
  material_name: string | null;
  impact_weight: number;
  created_at: string;
  updated_at: string;
  confirmed_summary?: string;
}

export interface ReviewRecord {
  id: string;
  order_id: string;
  action_type: ActionType;
  operator: string;
  before_summary: string;
  after_summary: string;
  note: string;
  created_at: string;
}

export interface Screenshot {
  id: string;
  order_id: string;
  url: string;
  description: string;
  uploaded_at: string;
}

export interface SupplementNote {
  id: string;
  order_id: string;
  content: string;
  operator: string;
  created_at: string;
}

export interface AppDataSet {
  work_orders: WorkOrder[];
  review_records: ReviewRecord[];
  screenshots: Screenshot[];
  supplement_notes: SupplementNote[];
}

export interface DashboardMetrics {
  today_judgement_count: number;
  confirm_rate: number;
  revoke_rate: number;
  threshold_health: number;
  pending_count: number;
  affected_by_threshold: number;
}

export interface ImpactAnalysis {
  order_id: string;
  order_title: string;
  impact_weight: number;
  contribution: number;
  description: string;
}
