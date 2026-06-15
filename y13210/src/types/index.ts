export type ReviewStatus =
  | 'pending'
  | 'calculating'
  | 'awaiting_confirm'
  | 'completed'
  | 'has_exceptions';

export type VoiceType = 'soprano' | 'alto' | 'tenor' | 'bass';

export type ExceptionSeverity = 'low' | 'medium' | 'high' | 'critical';

export type PossibleReason =
  | 'same_song_alias'
  | 'typo'
  | 'different_songs_same_name';

export interface CalcCriteria {
  id: string;
  reviewBatchId: string;
  energyThreshold: number;
  frequencyDeviation: number;
  algorithmVersion: string;
  baselineDate: string;
  diffFromPrevious: string;
}

export interface VoiceTrack {
  id: string;
  songId: string;
  voiceType: VoiceType;
  energyCurve: number[];
  freqCurve: number[];
}

export interface AudioFile {
  id: string;
  songId: string;
  fileName: string;
  filePath: string;
  versionTag: string;
  duration: number;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  audioFileId: string;
  type:
    | 'upload'
    | 'note_added'
    | 'screenshot_added'
    | 'review_marker'
    | 'name_change';
  operator: string;
  timestamp: string;
  description: string;
  noteContent?: string;
  screenshotUrl?: string;
}

export interface ReviewException {
  id: string;
  reviewBatchId: string;
  voiceTrackId: string;
  songId: string;
  severity: ExceptionSeverity;
  humanReason: string;
  timePosition: number;
  metric: string;
  deviation: string;
  possibleCause: string;
  referenceVersion: string;
  relatedFilePath: string;
  calcCriteriaId: string;
  resolved: boolean;
}

export interface Song {
  id: string;
  reviewBatchId: string;
  name: string;
  aliases: string[];
  durationSec: number;
  voiceTracks: VoiceTrack[];
  audioFiles: AudioFile[];
  history: HistoryEntry[];
}

export interface AliasConflict {
  id: string;
  duplicateNames: string[];
  possibleReasons: PossibleReason[];
  affectedVoiceCount: number;
  affectedFileIds: string[];
  affectedSongNames: string[];
  confirmed: boolean;
  resolution?: 'merge' | 'separate';
}

export interface ReviewBatch {
  id: string;
  name: string;
  folderPath: string;
  status: ReviewStatus;
  createdAt: string;
  createdBy: string;
  songs: Song[];
  exceptions: ReviewException[];
  calcCriteria: CalcCriteria;
  aliasConflicts: AliasConflict[];
}

export interface ConsistencyMismatch {
  field: string;
  displayValue: string;
  fileValue: string;
}

export interface ConsistencyCheck {
  passed: boolean;
  mismatches: ConsistencyMismatch[];
  checkedAt: string;
}

export const VOICE_LABELS: Record<VoiceType, string> = {
  soprano: '女高音',
  alto: '女低音',
  tenor: '男高音',
  bass: '男低音',
};

export const VOICE_COLORS: Record<VoiceType, string> = {
  soprano: '#9B5DE5',
  alto: '#00BBF9',
  tenor: '#4CAF50',
  bass: '#8D6E63',
};

export const SEVERITY_LABELS: Record<ExceptionSeverity, string> = {
  low: '轻微',
  medium: '中等',
  high: '较严重',
  critical: '严重',
};

export const SEVERITY_COLORS: Record<ExceptionSeverity, string> = {
  low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  medium: 'bg-copper-50 text-copper-700 border-copper-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: '待处理',
  calculating: '计算中',
  awaiting_confirm: '待确认',
  completed: '已完成',
  has_exceptions: '有异常',
};

export const STATUS_COLORS: Record<ReviewStatus, string> = {
  pending: 'bg-ink-100 text-ink-700 border-ink-200',
  calculating: 'bg-blue-50 text-blue-700 border-blue-200',
  awaiting_confirm: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  completed: 'bg-forest-50 text-forest-700 border-forest-200',
  has_exceptions: 'bg-copper-50 text-copper-700 border-copper-300',
};

export const REASON_LABELS: Record<PossibleReason, string> = {
  same_song_alias: '同一首歌的不同别名',
  typo: '录入时手误打错字',
  different_songs_same_name: '不同曲目恰好同名',
};
