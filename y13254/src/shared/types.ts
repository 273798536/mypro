export type ItemStatus =
  | "pending_review"
  | "need_supplement"
  | "pending_manual"
  | "approved"
  | "rejected"
  | "community_verified";

export type MaterialType = "photo" | "boundary" | "verbal_note";

export type JudgementSuggestion =
  | "approve"
  | "reject"
  | "need_supplement"
  | "pending_manual";

export interface Location {
  id: string;
  canonicalName: string;
  aliases: string[];
  lng: number;
  lat: number;
  boundaryGeoJSON: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  locationId: string;
  type: MaterialType;
  version: number;
  previousVersionId?: string | null;
  payload: unknown;
  hasCaliberChange: 0 | 1;
  changeNote?: string | null;
  capturedAt?: string | null;
  submittedBy?: string | null;
  createdAt: string;
}

export interface Judgement {
  suggestion: JudgementSuggestion;
  confidence: number;
  missingMaterials: MaterialType[];
  crossStreetCheck?: {
    isCross: boolean;
    hitName?: string;
  };
  remark?: string;
  modelVersion?: string;
  judgedAt: string;
  nextActions?: string[];
  reason?: string[];
}

export interface NoticeItem {
  id: string;
  locationId: string;
  status: ItemStatus;
  currentRemark?: string | null;
  remarkHistory: Array<{
    remark: string;
    changedAt: string;
    changedBy?: string;
  }>;
  autoJudgement?: Judgement | null;
  manualJudgement?: Judgement | null;
  apiResponse?: unknown;
  materialIds: string[];
  isCommunityVerified: 0 | 1;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityFeedback {
  id: string;
  itemId: string;
  originalText: string;
  mergedText?: string | null;
  submittedBy?: string | null;
  createdAt: string;
}

export interface ConsistencyDiffIssue {
  field: string;
  history?: unknown;
  current?: unknown;
  api?: unknown;
  expected: unknown;
  actual: unknown;
  level: "warn" | "error";
  fixSuggestion?: string;
}

export interface ConsistencyReport {
  id?: string;
  itemId: string;
  issues: ConsistencyDiffIssue[];
  generatedAt: string;
}

export interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}
