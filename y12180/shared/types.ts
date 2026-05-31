export interface Song {
  id: string;
  name: string;
  artist: string;
  duration: number;
  source: 'playlist' | 'library';
  createdAt: string;
  updatedAt: string;
}

export interface Copyright {
  id: string;
  songName: string;
  artist: string;
  authorizedRegions: string[];
  licenseType: 'exclusive' | 'non-exclusive' | 'cover';
  validFrom: string;
  validTo: string;
  isCover: boolean;
  originalArtist?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchResult {
  id: string;
  playlistSongId: string;
  copyrightId: string | null;
  matchStatus: 'full' | 'partial' | 'none' | 'conflict';
  matchConfidence: number;
  riskLevel: 'high' | 'medium' | 'low' | 'none';
  riskReasons: string[];
  isCoverDetected: boolean;
  regionRestrictions: string[];
  song?: Song;
  copyright?: Copyright;
  createdAt: string;
  updatedAt: string;
}

export interface Conflict {
  id: string;
  matchResultId: string;
  type: 'name_mismatch' | 'artist_mismatch' | 'region_conflict' | 'license_expired' | 'cover_version';
  playlistData: Partial<Song>;
  copyrightData: Partial<Copyright>;
  status: 'pending' | 'resolved_playlist' | 'resolved_copyright' | 'resolved_custom';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  matchResult?: MatchResult;
  createdAt: string;
}

export interface Review {
  id: string;
  matchResultId: string;
  reviewer: string;
  status: 'approved' | 'rejected' | 'pending';
  comments?: string;
  riskLevelOverride?: 'high' | 'medium' | 'low' | 'none';
  matchResult?: MatchResult;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  details: string;
  timestamp: string;
}

export type RiskLevel = 'high' | 'medium' | 'low' | 'none';
export type MatchStatus = 'full' | 'partial' | 'none' | 'conflict';
export type ConflictStatus = 'pending' | 'resolved_playlist' | 'resolved_copyright' | 'resolved_custom';
export type ReviewStatus = 'approved' | 'rejected' | 'pending';

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
  none: '无风险',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  high: '#dc2626',
  medium: '#f59e0b',
  low: '#eab308',
  none: '#10b981',
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  full: '完全匹配',
  partial: '部分匹配',
  none: '无匹配',
  conflict: '冲突待处理',
};

export const CONFLICT_TYPE_LABELS: Record<Conflict['type'], string> = {
  name_mismatch: '歌曲名称不一致',
  artist_mismatch: '歌手不一致',
  region_conflict: '授权地区冲突',
  license_expired: '授权已过期',
  cover_version: '翻唱版本识别',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  approved: '已通过',
  rejected: '已驳回',
  pending: '待审核',
};

export const LICENSE_TYPE_LABELS: Record<Copyright['licenseType'], string> = {
  exclusive: '独家授权',
  'non-exclusive': '非独家授权',
  cover: '翻唱授权',
};

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface FilterParams {
  riskLevel?: RiskLevel;
  matchStatus?: MatchStatus;
  search?: string;
  artist?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
