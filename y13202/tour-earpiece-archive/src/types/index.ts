export type ItemStatus = 'draft' | 'confirmed' | 'withdrawn';

export type IssueSeverity = 'warning' | 'error' | 'info';

export type IssueType =
  | 'duplicate_song_alias'
  | 'missing_field'
  | 'date_format_unclear'
  | 'hidden_auth_in_note'
  | 'duplicate_record'
  | 'late_note_added'
  | 'format_unrecognized';

export interface DataIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  rawLine?: number;
  rawText?: string;
  relatedField?: keyof EarpieceItem;
}

export interface Annotation {
  id: string;
  createdAt: number;
  content: string;
  author: string;
  isLateNote: boolean;
}

export interface EarpieceItem {
  id: string;
  songName: string;
  songAliases: string[];
  artist: string;
  authDeadline: string | null;
  authDeadlineRaw: string | null;
  authExtractedFromNote: boolean;
  note: string;
  status: ItemStatus;
  createdAt: number;
  updatedAt: number;
  confirmedAt: number | null;
  withdrawnAt: number | null;
  version: number;
  rawInput: string;
  rawLineNumber: number;
  issues: DataIssue[];
  annotations: Annotation[];
  deliveryListRef: string | null;
}

export interface VersionRecord {
  id: string;
  itemId: string;
  version: number;
  timestamp: number;
  snapshot: Partial<EarpieceItem>;
  changeType: 'create' | 'update' | 'confirm' | 'withdraw' | 'annotate' | 'reimport';
  operator: string;
}

export interface ImportResult {
  success: EarpieceItem[];
  failed: Array<{ rawText: string; lineNumber: number; reason: string }>;
  totalLines: number;
  issues: DataIssue[];
}

export interface AppState {
  items: EarpieceItem[];
  versions: VersionRecord[];
  selectedItemId: string | null;
}
