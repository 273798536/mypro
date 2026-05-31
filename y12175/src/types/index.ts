export interface TrackVersion {
  id: string;
  name: string;
  duration: number;
  isDefault: boolean;
  note?: string;
}

export interface Track {
  id: string;
  name: string;
  order: number;
  selectedVersionId: string;
  transitionTime: number | null;
  isEncore: boolean;
  versions: TrackVersion[];
}

export interface EncoreRule {
  maxEncoreTracks: number;
  maxEncoreDuration: number;
  requiredTransitionTime: number;
  allowExtraEncore: boolean;
}

export interface RuleSet {
  id: string;
  name: string;
  encore: EncoreRule;
  defaultTransitionTime: number;
  versionErrorThreshold: number;
}

export type ValidationErrorType = 'VERSION_MISMATCH' | 'ENCORE_OVERLIMIT' | 'TRANSITION_MISSING';

export interface ValidationError {
  id: string;
  type: ValidationErrorType;
  severity: 'error' | 'warning';
  trackId?: string;
  message: string;
  details: Record<string, any>;
  suggestion: string;
}

export interface TrackDurationBreakdown {
  trackId: string;
  trackName: string;
  versionName: string;
  duration: number;
  transitionTime: number;
  isEncore: boolean;
}

export interface ValidationResult {
  totalDuration: number;
  mainDuration: number;
  encoreDuration: number;
  transitionDuration: number;
  errors: ValidationError[];
  trackBreakdown: TrackDurationBreakdown[];
}

export interface HistoryVersion {
  id: string;
  timestamp: number;
  name: string;
  ruleSet: RuleSet;
  tracks: Track[];
  validationResult: ValidationResult;
  parentId?: string;
  changeDescription: string;
}

export type ImportPhase = 'INIT' | 'PHASE1' | 'PHASE2';

export interface AppState {
  tracks: Track[];
  ruleSet: RuleSet;
  currentValidation: ValidationResult | null;
  previousValidation: ValidationResult | null;
  history: HistoryVersion[];
  importPhase: ImportPhase;
  selectedHistoryId: string | null;
  compareMode: boolean;
  compareVersionId: string | null;
  highlightTrackId: string | null;
}

export type Action =
  | { type: 'IMPORT_TRACKS'; payload: Track[] }
  | { type: 'IMPORT_VERSIONS'; payload: { trackId: string; versions: TrackVersion[] }[] }
  | { type: 'UPDATE_RULES'; payload: Partial<RuleSet> }
  | { type: 'SELECT_VERSION'; payload: { trackId: string; versionId: string } }
  | { type: 'UPDATE_TRACK'; payload: Partial<Track> & { id: string } }
  | { type: 'CALCULATE'; payload: null }
  | { type: 'SAVE_VERSION'; payload: string }
  | { type: 'LOAD_VERSION'; payload: string }
  | { type: 'TOGGLE_COMPARE'; payload: string | null }
  | { type: 'HIGHLIGHT_TRACK'; payload: string | null }
  | { type: 'SET_PHASE'; payload: ImportPhase }
  | { type: 'RESET'; payload: null };

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDurationLong(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}小时${mins}分${secs}秒`;
  }
  return `${mins}分${secs}秒`;
}
