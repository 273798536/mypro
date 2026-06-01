export type ChordQuality = 'maj' | 'min' | 'dom' | 'dim' | 'aug' | 'maj7' | 'min7' | 'dom7' | 'dim7' | 'min7b5' | 'maj9' | 'min9' | 'dom9';

export interface Chord {
  name: string;
  root: string;
  quality: ChordQuality;
  bar: number;
  beat: number;
}

export interface Motif {
  id: string;
  name: string;
  startBar: number;
  endBar: number;
  startBeat: number;
  endBeat: number;
  type: 'call' | 'response' | 'sequence' | 'embellishment';
  confidence: number;
}

export interface BeatDrift {
  id: string;
  bar: number;
  beat: number;
  driftAmount: number;
  severity: 'minor' | 'moderate' | 'severe';
  detectedAt: string;
  description: string;
}

export interface HarmonyIssue {
  id: string;
  type: 'misalignment' | 'wrong_chord' | 'missing_chord';
  bar: number;
  description: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  action: 'created' | 'analyzed' | 'corrected' | 'noted' | 'exported';
  author: string;
  description: string;
  chordProgression?: Chord[];
}

export interface SoloAnalysis {
  id: string;
  audioFile: string;
  title: string;
  artist?: string;
  dateRecorded?: string;
  dateAnalyzed: string;
  chordProgression: Chord[];
  motifs: Motif[];
  beatDrifts: BeatDrift[];
  harmonyIssues: HarmonyIssue[];
  segments: PlaybackSegment[];
  status: 'draft' | 'analyzed' | 'corrected' | 'reviewed';
  notes?: string;
  history: HistoryEntry[];
  isLateEntry?: boolean;
  hasMissingFields?: boolean;
}

export interface PlaybackSegment {
  id: string;
  name: string;
  startBar: number;
  endBar: number;
  startTime: number;
  endTime: number;
}

export interface AnalysisResult {
  success: boolean;
  analysis?: SoloAnalysis;
  errors: string[];
  warnings: string[];
}

export interface ExportPackage {
  exportId: string;
  exportedAt: string;
  analysisId: string;
  audioFile: string;
  chordProgression: Chord[];
  reportFile: string;
  status: string;
}

export type ListFilter = 'all' | 'drift' | 'normal' | 'draft' | 'corrected';
