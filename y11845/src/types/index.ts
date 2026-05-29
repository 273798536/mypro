export type Difficulty = 'easy' | 'medium' | 'hard';

export type LicenseType = 'COVER' | 'SAMPLE' | 'BGM';

export type ClueCategory = 'COVER' | 'SAMPLE' | 'BGM' | 'EXPIRED' | 'UNDECLARED' | 'NAME_CONFLICT';

export type MainIssue =
  | 'COVER_OK'
  | 'COVER_NO_AUTH'
  | 'SAMPLE_DECLARED'
  | 'SAMPLE_UNDECLARED'
  | 'BGM_AUTHORIZED'
  | 'BGM_EXPIRED'
  | 'NAME_CONFLICT';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SourceType = 'SONG_CLIP' | 'CONTRACT' | 'TAKEDOWN';

export type OperationType = 'MARK_CLUE' | 'CREATE_LINK' | 'SUBMIT_CONCLUSION' | 'VIEW_MATERIAL' | 'UNMARK_CLUE' | 'DELETE_LINK';

export type ErrorFlag = 'SAMPLE_UNDECLARED' | 'BGM_EXPIRED' | 'NAME_CONFLICT';

export interface SongClip {
  id: string;
  title: string;
  artist: string;
  duration: number;
  lyrics: string;
  copyrightNotes: string[];
  hasSample: boolean;
  sampleOrigin?: string;
  isCover: boolean;
  originalTitle?: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  partyA: string;
  partyB: string;
  licenseType: LicenseType;
  effectiveDate: string;
  expiryDate: string;
  territory: string[];
  royaltyRate: number;
  restrictions: string[];
  isExpired: boolean;
  targetSongId?: string;
}

export interface TakedownNotice {
  id: string;
  noticeNumber: string;
  platform: string;
  issuedDate: string;
  reason: string;
  affectedContent: string;
  complainant: string;
  isDisputed: boolean;
  relatedSongId?: string;
}

export interface CaseMaterials {
  songClips: SongClip[];
  contracts: Contract[];
  takedownNotices: TakedownNotice[];
}

export interface Clue {
  id: string;
  sourceId: string;
  sourceType: SourceType;
  content: string;
  category: ClueCategory;
  detail: string;
}

export interface CorrectLink {
  fromClueId: string;
  toClueId: string;
  relationship: string;
}

export interface Conclusion {
  mainIssue: MainIssue;
  severity: Severity;
  recommendedAction: string;
}

export interface CaseData {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimatedTime: number;
  materials: CaseMaterials;
  clues: Clue[];
  correctLinks: CorrectLink[];
  correctConclusion: Conclusion;
  errorFlags: ErrorFlag[];
}

export interface EvidenceLink {
  id: string;
  fromClueId: string;
  toClueId: string;
  relationship: string;
  isValid: boolean;
  scoreImpact: number;
  sourceTrace: string[];
}

export interface OperationRecord {
  id: string;
  timestamp: number;
  type: OperationType;
  detail: string;
  scoreImpact: number;
  clueId?: string;
  linkId?: string;
}

export interface ErrorBreakdown {
  SAMPLE_UNDECLARED: { found: boolean; correct: boolean; detail: string };
  BGM_EXPIRED: { found: boolean; correct: boolean; detail: string };
  NAME_CONFLICT: { found: boolean; correct: boolean; detail: string };
}

export interface Score {
  total: number;
  evidenceChainScore: number;
  conclusionAccuracy: number;
  errorBreakdown: ErrorBreakdown;
  linkDetails: { linkId: string; fromClueId: string; toClueId: string; valid: boolean; impact: number }[];
  conclusionDetails: { mainIssueCorrect: boolean; severityCorrect: boolean; actionCorrect: boolean; impacts: number[] };
}

export interface GameState {
  currentCaseId: string | null;
  clues: Clue[];
  markedClueIds: string[];
  evidenceLinks: EvidenceLink[];
  operationHistory: OperationRecord[];
  userConclusion: Conclusion | null;
  score: Score | null;
  isCompleted: boolean;
  selectedClueId: string | null;
  activeTab: 'songs' | 'contracts' | 'takedowns' | 'board';
  expandedMaterialId: string | null;

  startCase: (caseId: string) => void;
  markClue: (clueId: string) => void;
  unmarkClue: (clueId: string) => void;
  selectClue: (clueId: string | null) => void;
  createLink: (fromClueId: string, toClueId: string, relationship: string) => void;
  deleteLink: (linkId: string) => void;
  submitConclusion: (conclusion: Conclusion) => void;
  setActiveTab: (tab: 'songs' | 'contracts' | 'takedowns' | 'board') => void;
  setExpandedMaterialId: (id: string | null) => void;
  resetGame: () => void;
}
