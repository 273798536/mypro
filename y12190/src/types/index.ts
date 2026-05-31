export interface AudioClip {
  id: string;
  name: string;
  url: string;
  duration: number;
  bpm: number;
  timeSignature: string;
}

export type NotePitch = 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F' | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B';

export type AccidentalType = 'passing' | 'neighbor' | 'escape' | 'suspension';

export interface Note {
  id: string;
  pitch: NotePitch;
  octave: number;
  duration: 'quarter' | 'eighth' | 'sixteenth' | 'half' | 'whole';
  startTime: number;
  isAccidental: boolean;
  accidentalType?: AccidentalType;
  accidentalMisjudged?: boolean;
}

export type ProblemType = 'chord-mismatch' | 'wrong-accidental' | 'repetitive' | null;

export interface Measure {
  id: string;
  audioClipId: string;
  measureNumber: number;
  startTime: number;
  endTime: number;
  chord: string;
  expectedChord?: string;
  notes: Note[];
  problemType: ProblemType;
  problemExplanation?: string;
}

export type AnnotationType = 'correction' | 'suggestion' | 'praise' | 'question';

export interface Annotation {
  id: string;
  measureId: string;
  startTime: number;
  endTime: number;
  type: AnnotationType;
  content: string;
  author: string;
  timestamp: number;
}

export type ChangeSource = 'manual' | 'auto-correct' | 'import';

export interface ChangeRecord {
  id: string;
  entityType: 'measure' | 'annotation' | 'chord' | 'note';
  entityId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  source: ChangeSource;
  operator: string;
  timestamp: number;
}

export type TraceNodeType = 'audio' | 'transcription' | 'motif' | 'accidental' | 'conclusion';

export interface TraceNode {
  id: string;
  type: TraceNodeType;
  title: string;
  description: string;
  measureId?: string;
  children: TraceNode[];
}

export interface AppState {
  audioClips: AudioClip[];
  measures: Measure[];
  annotations: Annotation[];
  changeRecords: ChangeRecord[];
  traceNodes: TraceNode[];
  currentAudioClipId: string | null;
  currentMeasureId: string | null;
  playbackTime: number;
  isPlaying: boolean;
  selectedTraceNodeId: string | null;
}
