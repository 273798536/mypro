export type SectionType = 'orchestra' | 'mezzanine' | 'balcony';
export type SeatStatus = 'available' | 'sold' | 'reserved';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type IssueType = 'railing_block' | 'duplicate_seat' | 'view_error' | 'other';
export type IssueStatus = 'pending' | 'confirmed' | 'resolved';
export type ObstacleType = 'railing' | 'screen' | 'pillar' | 'other';
export type ViewMode = 'perspective' | 'top' | 'front' | 'side';
export type TargetType = 'stage' | 'leftScreen' | 'rightScreen';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Dimensions3D {
  width: number;
  height: number;
  depth: number;
}

export interface VisibilityResult {
  visible: boolean;
  blockedBy?: string;
  confidence: ConfidenceLevel;
  rayHits: number;
  totalRays: number;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  section: SectionType;
  position: Position3D;
  status: SeatStatus;
  price: number;
  visibility?: {
    stage: VisibilityResult;
    leftScreen: VisibilityResult;
    rightScreen: VisibilityResult;
  };
  isSelected?: boolean;
  comparisonStatus?: 'unchanged' | 'improved' | 'worsened' | 'new' | 'removed';
}

export interface Obstacle {
  id: string;
  type: ObstacleType;
  name: string;
  position: Position3D;
  dimensions: Dimensions3D;
  visible: boolean;
}

export interface HistoryVersion {
  id: string;
  name: string;
  timestamp: number;
  configHash: string;
  seats: Seat[];
  obstacles: Obstacle[];
  results: Record<string, any>;
  description?: string;
}

export interface PendingIssue {
  id: string;
  seatId: string;
  type: IssueType;
  description: string;
  status: IssueStatus;
  suggestedAction: string;
  createdAt: number;
  notes?: string;
}

export interface FilterOptions {
  section: SectionType | 'all';
  visibility: 'all' | 'visible' | 'blocked' | 'partial';
  priceRange: [number, number];
  status: SeatStatus | 'all';
  searchText: string;
}

export interface TheaterState {
  seats: Seat[];
  obstacles: Obstacle[];
  selectedSeat: Seat | null;
  viewMode: ViewMode;
  filters: FilterOptions;
  showRays: boolean;
  detectionRunning: boolean;
  history: HistoryVersion[];
  currentVersionId: string | null;
  compareVersionId: string | null;
  pendingIssues: PendingIssue[];
  showComparison: boolean;
}
