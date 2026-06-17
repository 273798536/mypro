export type TrackStatus =
  | 'pending'
  | 'matching'
  | 'matched'
  | 'mismatch'
  | 'reviewing'
  | 'suspended'
  | 'approved'
  | 'rejected';

export type ReviewType = 'timecode' | 'quality' | 'note' | 'final';
export type ReviewDecision = 'approve' | 'reject' | 'suspend' | 'pass';
export type TimecodeCheckStatus = 'pass' | 'warning' | 'suspend';
export type MatchType = 'auto' | 'suggest' | 'manual' | 'none';
export type FileType = 'audio' | 'image' | 'document' | 'other';

export interface Tour {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: string;
  shows?: Show[];
  createdAt: string;
  updatedAt: string;
}

export interface TourStats {
  tourId: string;
  tourName: string;
  totalShows: number;
  totalTracks: number;
  pendingTracks: number;
  processingTracks: number;
  completedTracks: number;
  suspendedTracks: number;
  materialsPending: number;
  totalMaterials: number;
  progressPercentage: number;
}

export interface Show {
  id: string;
  tourId: string;
  tour?: Tour;
  showDate: string;
  city: string;
  venue?: string;
  tracks?: Track[];
  createdAt: string;
}

export interface Track {
  id: string;
  showId: string;
  show?: Show;
  trackNo: number;
  title: string;
  artist: string;
  expectedDuration: number;
  expectedTimecode?: string;
  status: TrackStatus;
  currentFileId?: string;
  currentVersion: number;
  latestNote?: string;
  timecodeDeviation?: number;
  materials?: AudioMaterial[];
  reviews?: ReviewRecord[];
  notes?: TrackNote[];
  auditLogs?: AuditLog[];
  createdAt: string;
  updatedAt: string;
}

export interface AudioMaterial {
  id: string;
  trackId: string;
  track?: Track;
  fileId: string;
  file?: FileRecord;
  fileName: string;
  parsedTrackNo?: number;
  parsedTitle?: string;
  duration: number;
  timecode?: string;
  timecodeDeviation?: number;
  version: number;
  isActive: boolean;
  matchStatus: string;
  matchConfidence: number;
  submittedBy: string;
  submittedAt: string;
  sourceBatch: string;
  versionHistories?: VersionHistory[];
  auditLogs?: AuditLog[];
}

export interface VersionHistory {
  id: string;
  materialId: string;
  material?: AudioMaterial;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changedBy: string;
  changedAt: string;
  changeType: string;
  reason?: string;
}

export interface ReviewRecord {
  id: string;
  trackId: string;
  track?: Track;
  reviewerId: string;
  reviewerName: string;
  reviewType: ReviewType;
  decision: ReviewDecision;
  comment: string;
  evidenceMissing?: string[];
  timecodeCheck?: TimecodeCheckResult;
  auditLogs?: AuditLog[];
  createdAt: string;
}

export interface TrackNote {
  id: string;
  trackId: string;
  track?: Track;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  isActive: boolean;
  previousNoteId?: string;
  previousNote?: TrackNote;
  nextNotes?: TrackNote[];
  auditLogs?: AuditLog[];
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface FileRecord {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  material?: AudioMaterial;
  uploadedAt: string;
}

export interface ParsedFileName {
  trackNo?: number;
  title?: string;
  artist?: string;
  version?: string;
  tags?: string[];
}

export interface MatchCandidate {
  trackId: string;
  trackNo: number;
  title: string;
  artist: string;
  expectedDuration: number;
  score: number;
}

export interface MatchResult {
  materialId: string;
  trackId: string | null;
  confidence: number;
  matchType: MatchType;
  anomalies: string[];
  parsed?: ParsedFileName;
}

export interface BatchMatchResult {
  results: MatchResult[];
  summary: {
    total: number;
    autoMatched: number;
    suggested: number;
    manualRequired: number;
    unmatched: number;
  };
}

export interface TimecodeCheckResult {
  status: TimecodeCheckStatus;
  deviation: number;
  message: string;
}

export interface VersionDiff {
  fieldName: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  changeType: 'create' | 'update' | 'override';
}

export interface VersionComparison {
  materialId: string;
  versions: Array<{
    version: number;
    material: AudioMaterial;
    submittedAt: string;
    submittedBy: string;
  }>;
  diffs: VersionDiff[];
}

export interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  format: 'csv' | 'excel' | 'json';
  fields: string[];
  filters?: Record<string, unknown>;
  createdAt: string;
}

export interface ExportRequest {
  templateId?: string;
  format: 'csv' | 'excel' | 'json';
  showId?: string;
  tourId?: string;
  status?: TrackStatus[];
  fields?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateTourDto {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface UpdateTourDto {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetToursQueryDto {
  page?: number;
  limit?: number;
  keyword?: string;
}

export interface CreateTrackDto {
  showId: string;
  trackNo: number;
  title: string;
  artist: string;
  expectedDuration: number;
  expectedTimecode?: string;
}

export interface UpdateTrackDto {
  trackNo?: number;
  title?: string;
  artist?: string;
  expectedDuration?: number;
  expectedTimecode?: string;
}

export interface UpdateTrackStatusDto {
  status: TrackStatus;
  reason?: string;
  operator?: string;
}

export interface GetTracksQueryDto {
  page?: number;
  limit?: number;
  showId?: string;
  status?: TrackStatus;
  keyword?: string;
}

export interface CreateMaterialDto {
  trackId: string;
  fileId: string;
  fileName: string;
  parsedTrackNo?: number;
  parsedTitle?: string;
  duration: number;
  timecode?: string;
  timecodeDeviation?: number;
  submittedBy: string;
  sourceBatch: string;
  overrideReason?: string;
}

export interface ActivateMaterialDto {
  changedBy: string;
  reason: string;
}

export interface CreateReviewDto {
  trackId: string;
  reviewerId: string;
  reviewerName: string;
  reviewType: ReviewType;
  decision: ReviewDecision;
  comment: string;
  evidenceMissing?: string[];
}

export interface ResolveSuspendDto {
  trackId: string;
  reviewerId: string;
  reviewerName: string;
  decision: Exclude<ReviewDecision, 'pass'>;
  comment: string;
  overrideReason?: string;
}

export interface BatchMatchingItemDto {
  materialId: string;
  fileName: string;
  actualDuration: number;
}

export interface BatchMatchingDto {
  items: BatchMatchingItemDto[];
  candidates: MatchCandidate[];
}

export interface ConfirmMatchingDto {
  materialId: string;
  trackId: string;
  matchType: 'auto' | 'manual';
  confidence: number;
  confirmedBy: string;
}

export interface FileDto {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileType: FileType;
  extension: string;
  trackId?: string;
  version: number;
  sourceBatch?: string;
  submittedBy?: string;
  duration?: number;
  parsedTrackNo?: number;
  parsedTitle?: string;
  timecode?: string;
  timecodeDeviation?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadFileDto {
  trackId?: string;
  sourceBatch?: string;
  submittedBy?: string;
  version?: number;
}

export interface FileUploadResponseDto {
  files: FileDto[];
  total: number;
  success: number;
  failed: number;
  errors?: Array<{ fileName: string; error: string }>;
}

export interface GetFilesQueryDto {
  page?: number;
  limit?: number;
  trackId?: string;
  fileType?: FileType;
  sourceBatch?: string;
  keyword?: string;
}

export interface UploadResponse {
  fileId: string;
  fileName: string;
  originalName: string;
  size: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
