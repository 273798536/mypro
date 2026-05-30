export interface Musician {
  id: string;
  name: string;
  sectionId: string;
  instrument: string;
  position: { x: number; y: number; z: number } | null;
  remark?: string;
}

export interface Section {
  id: string;
  name: string;
  color: string;
  instrumentTypes: string[];
}

export interface InstrumentSPL {
  musicianId: string;
  spl: number | null;
  frequency: number;
  isEstimated: boolean;
}

export interface Seat {
  id: string;
  row: number;
  col: number;
  position: { x: number; y: number; z: number };
}

export interface SeatPressureContribution {
  musicianId: string;
  spl: number;
  distance: number;
  occlusionFactor: number;
}

export interface SeatPressure {
  seatId: string;
  totalSPL: number;
  contributions: SeatPressureContribution[];
}

export interface Viewpoint {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  createdAt: number;
}

export interface SoundPressureChange {
  id: string;
  musicianId: string;
  musicianName: string;
  instrument: string;
  oldValue: number | null;
  newValue: number;
  timestamp: number;
  affectedSeatIds: string[];
}

export interface CorrectionSuggestion {
  id: string;
  type: 'missing_spl' | 'missing_position' | 'missing_hall' | 'missing_material' | 'filter_error';
  severity: 'warning' | 'error';
  targetId: string;
  message: string;
  detail: string;
  actionLabel: string;
  dismissed: boolean;
  applied: boolean;
}

export interface OcclusionResult {
  sourceSectionId: string;
  blockedSectionId: string;
  blockedSeatIds: string[];
  blockedRatio: number;
  avgOcclusionLoss: number;
}
