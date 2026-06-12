export interface Annotation {
  id: string;
  photoId: string;
  stepId?: string;
  bbox: [number, number, number, number];
  originalReading: string;
  processedNote: string;
}

export interface Photo {
  id: string;
  url: string;
  caption: string;
  annotations: Annotation[];
  takenAt: string;
}

export interface UnitConvert {
  from: string;
  to: string;
  factor: number;
  intermediate: number;
}

export interface ChainStep {
  id: string;
  index: number;
  title: string;
  formula: string;
  inputValues: { label: string; value: number; unit: string }[];
  unitConverts: UnitConvert[];
  boundaryCheck?: {
    rule: string;
    passed: boolean;
    actual: number;
    limit: number;
  };
  magnitudeDelta?: number;
  result: { value: number; unit: string };
  hasGap: boolean;
  gapReason?: string;
  relatedPhotoIds: string[];
}

export interface ParamGroup {
  id: 'A' | 'B';
  name: string;
  params: Record<string, { value: number; unit: string; label: string }>;
}

export interface HistoryNode {
  id: string;
  timestamp: string;
  summary: string;
  isClean: boolean;
  paramGroups: ParamGroup[];
  chainA: ChainStep[];
  chainB: ChainStep[];
  activeGroup: 'A' | 'B';
}

export type GapType = 'none' | 'missing' | 'out_of_range' | 'unit_mismatch';

export interface GapReport {
  stepId: string;
  type: GapType;
  description: string;
  impact: string;
}
