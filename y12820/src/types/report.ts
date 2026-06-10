export interface Report {
  id: string;
  title: string;
  type: 'standard' | 'student';
  includedSampleIds: string[];
  analysisId?: string;
  status: 'generating' | 'ready' | 'failed';
  format: 'html' | 'pdf';
  content?: string;
  createdAt: Date;
  createdBy: string;
  generatedAt?: Date;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'text' | 'table' | 'chart' | 'summary';
  content: unknown;
}

export interface ReportSummary {
  totalSamples: number;
  availableSamples: number;
  reviewingSamples: number;
  invalidSamples: number;
  significantFindings: number;
  qualityScore: number;
  generatedAt: Date;
  generatedBy: string;
}
