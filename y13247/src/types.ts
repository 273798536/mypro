export type Timecode = string;

export type MatchStatus =
  | 'pending'
  | 'matched'
  | 'mismatch_filename'
  | 'mismatch_timecode'
  | 'mismatch_both'
  | 'late_arrival'
  | 'rejudged'
  | 'authorized'
  | 'archived';

export type ChangeSource =
  | 'auto_align'
  | 'manual_rejudge'
  | 'authorization'
  | 'system_detect';

export interface StageChannelRecord {
  id: string;
  channelNo: number;
  originalFilename: string;
  recordedAt: string;
  timecodeStart: Timecode;
  timecodeEnd: Timecode;
  durationSeconds: number;
  engineerNote?: string;
  rawDescription: string;
  isLateArrival: boolean;
  receivedAt: string;
  timecodeDeviationMs?: number;
}

export interface TrackItem {
  id: string;
  trackNo: number;
  expectedTitle: string;
  expectedFilename: string;
  expectedTimecodeStart: Timecode;
  expectedDuration: number;
  segment: 'opening' | 'intro' | 'theme' | 'outro';
}

export interface AuthorizationNote {
  id: string;
  archiveItemId: string;
  authorizer: string;
  note: string;
  createdAt: string;
  alignmentDecision: {
    useStageFile: string;
    useTrackItem: string;
    overrideTimecode?: Timecode;
    overrideTitle?: string;
  };
}

export interface HistoryLogEntry {
  id: string;
  archiveItemId: string;
  timestamp: string;
  source: ChangeSource;
  operator: string;
  previousStatus: MatchStatus;
  newStatus: MatchStatus;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  reason: string;
}

export interface ArchiveItem {
  id: string;
  stageRecordId: string;
  trackItemId: string;
  stageRecord?: StageChannelRecord;
  trackItem?: TrackItem;
  finalTitle: string;
  finalFilename: string;
  finalTimecodeStart: Timecode;
  finalDuration: number;
  status: MatchStatus;
  timecodeDeviationMs: number;
  alignmentIssues: string[];
  originalStageNote?: string;
  authorizationNote?: AuthorizationNote;
  history: HistoryLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface RejudgeRequest {
  archiveItemId: string;
  operator: string;
  reason: string;
  newStageRecordId?: string;
  newTrackItemId?: string;
  overrideTimecode?: Timecode;
  overrideTitle?: string;
}

export interface AuthorizationRequest {
  archiveItemId: string;
  authorizer: string;
  note: string;
  alignmentDecision: AuthorizationNote['alignmentDecision'];
}
