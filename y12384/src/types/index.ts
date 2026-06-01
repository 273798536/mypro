export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  isNew: boolean;
  weight: number;
  genre: string;
  duration: number;
  coverUrl?: string;
}

export type ItemSource = 'library' | 'promotion' | 'advertisement';

export interface PlaylistItem {
  id: string;
  songId: string;
  position: number;
  scheduledTime: string;
  source: ItemSource;
  song?: Song;
}

export interface Playlist {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  createdBy: string;
  items: PlaylistItem[];
}

export type ConflictType = 'artist_repeat' | 'ad_clash' | 'new_song_dense';
export type Severity = 'low' | 'medium' | 'high';

export interface Conflict {
  id: string;
  playlistId: string;
  type: ConflictType;
  severity: Severity;
  position: number;
  relatedItemIds: string[];
  triggeredBy: {
    source: string;
    material: string;
    timestamp: string;
  };
  constraintRule: {
    id: string;
    name: string;
    description: string;
    threshold: number;
  };
  detectionAlgorithm: {
    name: string;
    version: string;
    parameters: Record<string, any>;
  };
  resolved: boolean;
  resolution?: string;
}

export interface Version {
  id: string;
  playlistId: string;
  versionNumber: string;
  parentVersionId?: string;
  createdAt: string;
  modifiedBy: string;
  changes: VersionChange[];
  notes: string;
}

export interface VersionChange {
  type: 'add' | 'remove' | 'modify' | 'resolve';
  itemId?: string;
  conflictId?: string;
  description: string;
  oldValue?: string;
  newValue?: string;
}

export interface Correction {
  id: string;
  conflictId: string;
  type: 'resolve' | 'note' | 'reorder';
  content: string;
  createdAt: string;
  createdBy: string;
}

export interface TraceNode {
  id: string;
  type: 'material' | 'constraint' | 'algorithm' | 'result';
  title: string;
  description: string;
  details: any;
  relatedLink?: string;
  expanded?: boolean;
}

export interface ReportData {
  summary: {
    totalSongs: number;
    totalConflicts: number;
    resolvedConflicts: number;
    artistRepeatCount: number;
    adClashCount: number;
    newSongDenseCount: number;
    constraintSatisfactionRate: number;
  };
  constraints: ConstraintReport[];
  conflicts: ConflictReport[];
  recommendations: string[];
}

export interface ConstraintReport {
  id: string;
  name: string;
  description: string;
  triggeredCount: number;
  threshold: number;
  met: boolean;
}

export interface ConflictReport {
  id: string;
  type: ConflictType;
  severity: Severity;
  position: number;
  description: string;
  triggeredBy: string;
  resolution?: string;
}

export type TabType = 'overview' | 'conflicts' | 'versions' | 'report';
