export type PartSystem = 'stirring' | 'heating' | 'sealing' | 'temp' | 'vessel' | 'motor';
export type PartStatus = 'normal' | 'warning' | 'danger';
export interface ReactorPart {
  id: string; name: string; system: PartSystem; spec: string; status: PartStatus;
  position: [number, number, number]; size: [number, number, number]; color: string;
  geometry: 'cylinder' | 'box' | 'sphere' | 'cone'; rotation?: [number, number, number];
  last_inspected_at: number; description: string;
}
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type MisreadReason = 'occlusion' | 'timing_mismatch' | 'other' | null;
export interface RiskNote {
  id: string; part_id: string; content: string; level: RiskLevel; created_at: number;
  created_by: string; clip_x: number; clip_y: number; clip_z: number;
  is_misread: boolean; misread_reason: MisreadReason; conclusion_id: string | null;
  is_duplicate: boolean; duplicate_of: string | null;
}
export type Verdict = 'pass' | 'fail' | 'pending';
export interface FinalConclusion {
  id: string; part_id: string; summary: string; verdict: Verdict; finalized_at: number;
  finalized_by: string; linked_note_ids: string[]; is_supplement: boolean; supplements: string;
}
export interface ClipPlanes { x: number; y: number; z: number; enabled: boolean; }
