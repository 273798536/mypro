export type ParseStatus = 'normal' | 'supplemented' | 'missing' | 'error';

export type WarningType =
  | 'missing_unit'
  | 'late_reaction_condition'
  | 'old_format_header'
  | 'remark_detected'
  | 'reaction_time_missing'
  | 'blank_control_missing';

export type SeverityLevel = 'info' | 'warning' | 'error';

export interface SpectrumRow {
  rowIndex: number;
  wavenumber: number | null;
  absorbance: number | null;
  rawUnit: string;
  remark: string;
  parseStatus: ParseStatus;
  originalText: string;
}

export interface ParseWarning {
  type: WarningType;
  rowIndex: number;
  message: string;
  suggestedFix?: string;
}

export interface ParseResult {
  success: boolean;
  data: SpectrumRow[];
  warnings: ParseWarning[];
  errors: string[];
  fileName?: string;
}

export interface FunctionalGroup {
  id: string;
  name: string;
  nameCn: string;
  wavenumberStart: number;
  wavenumberEnd: number;
  peakWavenumber: number;
  confidence: number;
  confirmed: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  remark?: string;
  isManualAdd: boolean;
}

export interface ConcentrationPoint {
  label: string;
  before: {
    value: number | null;
    unit: string;
    judgment: string;
  };
  after: {
    value: number | null;
    unit: string;
    judgment: string;
  };
  changed: boolean;
}

export interface RunRecord {
  runId: number;
  runAt: string;
  parameters: string;
  status: 'success' | 'warning' | 'failed';
  triggeredBy: string;
  note?: string;
}

export interface SupplementaryInfo {
  reactionConditions: string;
  reactionTime: number | null;
  reactionTimeUnit: string;
  blankControlNote: string;
  operator: string;
  sampleSource: string;
}

export interface DataQualityIssue {
  code: WarningType;
  friendlyMessage: string;
  severity: SeverityLevel;
  impact: string;
  suggestion: string;
}

export interface ExportRecord {
  id: string;
  exportedAt: string;
  format: 'pdf' | 'html' | 'csv';
  fileName: string;
  batchName: string;
}

export interface BatchReport {
  id: string;
  batchName: string;
  createdAt: string;
  updatedAt: string;
  spectrumData: SpectrumRow[];
  annotations: FunctionalGroup[];
  concentrationComparisons: ConcentrationPoint[];
  runHistory: RunRecord[];
  supplementaryInfo: SupplementaryInfo;
  dataQuality: DataQualityIssue[];
  parseWarnings: ParseWarning[];
  exportHistory: ExportRecord[];
}

export const FUNCTIONAL_GROUP_REFERENCE: Omit<FunctionalGroup, 'id' | 'confirmed' | 'isManualAdd' | 'peakWavenumber' | 'confidence'>[] = [
  { name: 'O-H stretch', nameCn: '羟基伸缩振动', wavenumberStart: 3200, wavenumberEnd: 3600 },
  { name: 'N-H stretch', nameCn: '氨基伸缩振动', wavenumberStart: 3300, wavenumberEnd: 3500 },
  { name: 'sp2 C-H stretch', nameCn: '不饱和碳氢伸缩振动', wavenumberStart: 3000, wavenumberEnd: 3100 },
  { name: 'sp3 C-H stretch', nameCn: '饱和碳氢伸缩振动', wavenumberStart: 2800, wavenumberEnd: 3000 },
  { name: 'C≡N stretch', nameCn: '氰基伸缩振动', wavenumberStart: 2200, wavenumberEnd: 2300 },
  { name: 'C≡C stretch', nameCn: '炔基伸缩振动', wavenumberStart: 2100, wavenumberEnd: 2250 },
  { name: 'C=O stretch (ester)', nameCn: '酯羰基伸缩振动', wavenumberStart: 1730, wavenumberEnd: 1750 },
  { name: 'C=O stretch (ketone)', nameCn: '酮羰基伸缩振动', wavenumberStart: 1705, wavenumberEnd: 1725 },
  { name: 'C=O stretch (amide)', nameCn: '酰胺羰基伸缩振动', wavenumberStart: 1640, wavenumberEnd: 1690 },
  { name: 'C=C stretch (aromatic)', nameCn: '芳环碳碳伸缩振动', wavenumberStart: 1450, wavenumberEnd: 1600 },
  { name: 'C-O stretch (alcohol)', nameCn: '醇碳氧伸缩振动', wavenumberStart: 1050, wavenumberEnd: 1150 },
  { name: 'C-O stretch (ether)', nameCn: '醚碳氧伸缩振动', wavenumberStart: 1070, wavenumberEnd: 1150 },
];
