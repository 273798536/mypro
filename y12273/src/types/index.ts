export interface Charge {
  id: string;
  position: [number, number, number];
  charge: number;
  label: string;
}

export interface FieldPoint {
  position: [number, number, number];
  fieldVector: [number, number, number];
  magnitude: number;
}

export type SampleRecordStatus =
  | "normal"
  | "missing_field"
  | "late_supplement"
  | "modified_note"
  | "reversed_arrow";

export interface SampleRecord {
  id: string;
  chargeId: string;
  position?: [number, number, number];
  charge?: number;
  screenshot?: string;
  note?: string;
  status: SampleRecordStatus;
  noteHistory?: string[];
  createdAt: number;
  updatedAt?: number;
}

export interface FieldLineData {
  id: string;
  points: [number, number, number][];
  direction: "normal" | "reversed";
  magnitude: number;
}

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  charges: Charge[];
  fieldLines: FieldLineData[];
  label: string;
  overlapDetected?: boolean;
}

export type TimelineStatus = "playing" | "paused" | "stopped";

export type RecordFilter = "all" | SampleRecordStatus;
