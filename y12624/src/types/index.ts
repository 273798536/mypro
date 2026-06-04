export type RecordStatus = 'normal' | 'flipped' | 'warning' | 'pending';

export interface ArrowRecord {
  id: string;
  x: number;
  y: number;
  direction: number;
  status: RecordStatus;
  timestamp: number;
  remark?: string;
  isManualRemark: boolean;
}

export interface FilterConfig {
  status: RecordStatus[];
  timeRange: [number, number] | null;
}

export interface HistoryState {
  past: ArrowRecord[][];
  future: ArrowRecord[][];
}

export interface ProblemItem {
  id: string;
  type: string;
  description: string;
  remark?: string;
  isUsable: boolean;
}

export interface ExportReport {
  summary: string;
  explanation: string;
  problemList: ProblemItem[];
  exportTime: string;
}

export interface CanvasStore {
  records: ArrowRecord[];
  selectedId: string | null;
  filter: FilterConfig;
  past: ArrowRecord[][];
  future: ArrowRecord[][];
  
  selectRecord: (id: string | null) => void;
  updateRecord: (id: string, updates: Partial<ArrowRecord>) => void;
  addRecord: (record: ArrowRecord) => void;
  deleteRecord: (id: string) => void;
  addRemark: (id: string, remark: string) => void;
  
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  setFilter: (filter: Partial<FilterConfig>) => void;
  filteredRecords: ArrowRecord[];
  
  generateReport: () => ExportReport;
}
