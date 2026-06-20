export interface FunnelStage {
  id: string
  run_id: string
  stage_name: string
  order: number
  data: Record<string, unknown>
  has_param_change: boolean
  recorded_at: string
}

export interface Note {
  id: string
  run_id: string
  stage_id: string | null
  content: string
  is_supplementary: boolean
  linked_conclusion_id: string | null
  created_at: string
}

export interface Conclusion {
  id: string
  run_id: string
  content: string
  linked_note_ids: string[]
  created_at: string
  updated_at: string
}

export interface Screenshot {
  id: string
  run_id: string
  note_id: string | null
  image_data: string
  description: string
  created_at: string
}

export interface GrayscaleResult {
  id: string
  run_id: string
  dimension: 'sample_change' | 'threshold_change' | 'manual_override'
  before: Record<string, unknown>
  after: Record<string, unknown>
  change_desc: string
}

export interface ConfirmationRecord {
  id: string
  run_id: string
  reason: string
  next_step: string
  action_taken: 'merge' | 'overwrite' | 'cancel' | null
  created_at: string
}

export interface Run {
  run_id: string
  status: 'in_progress' | 'pending_confirmation' | 'completed'
  scenario_type: 'smooth' | 'supplementary' | 'exception'
  created_at: string
  updated_at: string
  stages: FunnelStage[]
  notes: Note[]
  conclusion: Conclusion | null
  screenshots: Screenshot[]
  grayscale_results: GrayscaleResult[]
  confirmation_records: ConfirmationRecord[]
}
