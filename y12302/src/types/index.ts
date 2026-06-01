export type DataSource = 'original' | 'processed';
export type FileType = 'obj' | 'stl' | 'dcm' | 'nrrd';
export type IssueType = 'misalignment' | 'overdose' | 'version_conflict';
export type Severity = 'low' | 'medium' | 'high';
export type ActiveTab = 'workspace' | 'data' | 'detection' | 'export' | 'review';

export interface OrganModel {
  id: string;
  name: string;
  version: string;
  source: DataSource;
  importTime: Date;
  importedBy: string;
  fileType: FileType;
  filePath: string;
  color: string;
  visible: boolean;
  opacity: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  shapeType?: 'sphere' | 'box' | 'cylinder' | 'ellipsoid';
  size?: [number, number, number];
}

export interface DoseGrid {
  id: string;
  name: string;
  version: string;
  organId: string;
  source: DataSource;
  importTime: Date;
  importedBy: string;
  fileType: FileType;
  minDose: number;
  maxDose: number;
  meanDose: number;
  threshold: number;
  visible: boolean;
  opacity: number;
}

export interface DoctorNote {
  id: string;
  organId?: string;
  doseId?: string;
  content: string;
  author: string;
  createTime: Date;
  updateTime: Date;
  tags: string[];
}

export interface DetectionIssue {
  id: string;
  type: IssueType;
  severity: Severity;
  organId?: string;
  doseId?: string;
  versionA?: string;
  versionB?: string;
  description: string;
  position?: [number, number, number];
  value?: number;
  threshold?: number;
  detectedTime: Date;
  resolved: boolean;
}

export interface ScreenshotRecord {
  id: string;
  name: string;
  organIds: string[];
  doseIds: string[];
  noteIds: string[];
  imageUrl: string;
  thumbnailUrl: string;
  createTime: Date;
  cameraState: {
    position: [number, number, number];
    target: [number, number, number];
  };
}

export interface VersionComparison {
  id: string;
  organAId: string;
  organBId: string;
  doseAId?: string;
  doseBId?: string;
  differences: {
    positionDiff: [number, number, number];
    rotationDiff: [number, number, number];
    doseDiff: number;
  };
  createTime: Date;
}

export interface OperationLog {
  id: string;
  type: 'import' | 'modify' | 'detect' | 'export' | 'screenshot';
  description: string;
  organIds: string[];
  doseIds: string[];
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface AppState {
  organs: OrganModel[];
  doses: DoseGrid[];
  notes: DoctorNote[];
  issues: DetectionIssue[];
  screenshots: ScreenshotRecord[];
  comparisons: VersionComparison[];
  logs: OperationLog[];
  selectedOrganId: string | null;
  selectedDoseId: string | null;
  activeTab: ActiveTab;
  isComparisonMode: boolean;
  comparisonOrganA: string | null;
  comparisonOrganB: string | null;
}

export interface AppActions {
  setActiveTab: (tab: ActiveTab) => void;
  toggleOrganVisibility: (id: string) => void;
  setOrganOpacity: (id: string, opacity: number) => void;
  toggleDoseVisibility: (id: string) => void;
  setDoseOpacity: (id: string, opacity: number) => void;
  setDoseThreshold: (id: string, threshold: number) => void;
  selectOrgan: (id: string | null) => void;
  selectDose: (id: string | null) => void;
  addOrgan: (organ: Omit<OrganModel, 'id'>) => void;
  addDose: (dose: Omit<DoseGrid, 'id'>) => void;
  addNote: (note: Omit<DoctorNote, 'id'>) => void;
  resolveIssue: (id: string) => void;
  addScreenshot: (screenshot: Omit<ScreenshotRecord, 'id'>) => void;
  setComparisonMode: (enabled: boolean) => void;
  setComparisonOrgans: (organA: string | null, organB: string | null) => void;
  addLog: (log: Omit<OperationLog, 'id'>) => void;
  runDetection: () => void;
}
