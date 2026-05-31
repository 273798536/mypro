export interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  tags: string[];
  genre: string;
  language: string;
  region: string;
  source: {
    filename: string;
    rowNumber: number;
    importBatchId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  songs: Song[];
  version: number;
  versionName: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface OperationLog {
  id: string;
  playlistId: string;
  songId?: string;
  operationType: 'create' | 'update' | 'delete' | 'import' | 'export' | 'lock' | 'unlock';
  field?: string;
  oldValue?: string;
  newValue?: string;
  remark?: string;
  operator: string;
  timestamp: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  type: 'artist_max_count' | 'decade_range' | 'tag_ratio' | 'genre_balance';
  params: Record<string, unknown>;
  enabled: boolean;
  weight: number;
}

export interface ValidationResult {
  score: number;
  details: {
    artistScore: number;
    decadeScore: number;
    tagScore: number;
    genreScore: number;
  };
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  type: string;
  message: string;
  ruleId: string;
  songIds: string[];
  sourceFiles: string[];
  suggestion: string;
}

export type FieldMapping = {
  sourceField: string;
  targetField: 'title' | 'artist' | 'year' | 'genre' | 'language' | 'region' | 'tags' | null;
};

export type ImportPreview = {
  filename: string;
  headers: string[];
  rows: Record<string, string>[];
  mappings: FieldMapping[];
};
