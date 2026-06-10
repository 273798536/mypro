export interface DifferentialAnalysis {
  id: string;
  name: string;
  controlGroupId: string;
  experimentalGroupId: string;
  method: string;
  pValueThreshold: number;
  foldChangeThreshold: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  errorMessage?: string;
  actionableHints?: {
    missingRecords: Array<{
      sampleId: string;
      sampleName: string;
      missingField: string;
      suggestion: string;
      contactPerson?: string;
    }>;
    nextSteps: string[];
  };
  createdAt: Date;
  createdBy: string;
  completedAt?: Date;
}

export interface AnalysisResult {
  id: string;
  analysisId: string;
  sampleId: string;
  log2FoldChange: number;
  pValue: number;
  adjustedPValue: number;
  isSignificant: boolean;
  regulation: 'up' | 'down' | 'none';
}

export interface VolcanoPoint {
  sampleId: string;
  sampleName: string;
  x: number;
  y: number;
  color: string;
  regulation: 'up' | 'down' | 'none';
  isSignificant: boolean;
}

export interface HeatmapData {
  sampleNames: string[];
  groupNames: string[];
  values: number[][];
}

export interface BoxplotData {
  groupName: string;
  values: number[];
}
