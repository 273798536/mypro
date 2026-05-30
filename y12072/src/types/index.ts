export type QualityType = 'good' | 'overlapped' | 'missing_band' | 'misaligned';

export type IssueType = 'misalignment' | 'overlap' | 'missing_band';
export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueStatus = 'pending' | 'confirmed' | 'resolved';

export type ChangeType = 'create' | 'update' | 'verify' | 'reject';

export interface RecordingSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  audioUrl: string;
  waveformData: number[];
  quality: QualityType;
  issues: string[];
  name: string;
  description: string;
}

export interface FingerAnnotation {
  id: string;
  segmentId: string;
  time: number;
  fingerType: string;
  fingerPosition: number;
  rightHand: string;
  leftHand: string;
  confidence: number;
  isMisaligned: boolean;
  verified: boolean;
}

export interface SpectrumFeature {
  id: string;
  segmentId: string;
  time: number;
  frequencyBins: number[];
  centroid: number;
  bandwidth: number;
  rolloff: number;
  mfcc: number[];
  missingBands: number[];
}

export interface SpacePoint3D {
  id: string;
  segmentId: string;
  annotationId: string;
  spectrumId: string;
  x: number;
  y: number;
  z: number;
  value: number;
  color: string;
  label: string;
  fingerType: string;
}

export interface Issue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  assignee: string;
  status: IssueStatus;
  createdAt: string;
  relatedSegmentIds: string[];
}

export interface ChangeRecord {
  id: string;
  timestamp: string;
  author: string;
  changeType: ChangeType;
  description: string;
  dataBefore?: any;
  dataAfter?: any;
}

export interface ResearchConclusion {
  id: string;
  title: string;
  content: string;
  dataVersion: string;
  segmentIds: string[];
  annotationVersions: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  changeHistory: ChangeRecord[];
}

export interface SavedView {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  filters: FilterState;
  createdAt: string;
  thumbnail?: string;
}

export interface FilterState {
  timeRange: [number, number];
  fingerTypes: string[];
  frequencyRange: [number, number];
  quality: QualityType[];
  searchKeyword: string;
}

export interface AppState {
  segments: RecordingSegment[];
  annotations: FingerAnnotation[];
  spectrums: SpectrumFeature[];
  spacePoints: SpacePoint3D[];
  filteredPoints: SpacePoint3D[];
  issues: Issue[];
  conclusions: ResearchConclusion[];
  selectedSegmentId: string | null;
  selectedPointIds: string[];
  currentTime: number;
  isPlaying: boolean;
  sidebarCollapsed: boolean;
  filters: FilterState;
  savedViews: SavedView[];
  totalDuration: number;

  loadData: () => void;
  selectSegment: (id: string | null) => void;
  selectPoints: (ids: string[]) => void;
  setTime: (time: number) => void;
  togglePlay: () => void;
  setFilters: (filters: Partial<FilterState>) => void;
  saveView: (name: string) => void;
  loadView: (id: string) => void;
  deleteView: (id: string) => void;
  markIssue: (issue: Omit<Issue, 'id' | 'createdAt'>) => void;
  resolveIssue: (issueId: string) => void;
  addConclusion: (conclusion: Omit<ResearchConclusion, 'id' | 'createdAt' | 'updatedAt' | 'changeHistory'>) => void;
  updateConclusion: (id: string, changes: Partial<ResearchConclusion>) => void;
  toggleSidebar: () => void;
}

export const FINGER_TYPES = ['散音', '按音', '泛音', '走音', '带音', '掐起', '掩', '虚掩'];

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  misalignment: '指法错位',
  overlap: '片段重叠',
  missing_band: '频段缺失'
};

export const QUALITY_LABELS: Record<QualityType, string> = {
  good: '良好',
  overlapped: '片段重叠',
  missing_band: '频段缺失',
  misaligned: '指法错位'
};
