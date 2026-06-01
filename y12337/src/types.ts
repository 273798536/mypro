export interface SongTag {
  songId: string;
  tags: string[];
}

export interface ExposureLog {
  songId: string;
  userId: string;
  timestamp: number;
  position: number;
  clicked: boolean;
}

export interface DiagnosisReport {
  reportId: string;
  generatedAt: number;
  entries: DiagnosisEntry[];
}

export interface DiagnosisEntry {
  songId: string;
  tagMissing: TagMissingDetail | null;
  popularCrowding: PopularCrowdingDetail | null;
  similaritySparse: SimilaritySparseDetail | null;
  coldStartScore: number;
  sampleReplay: SampleReplay;
  improvementSuggestions: string[];
}

export interface TagMissingDetail {
  missingTagNames: string[];
  source: "song_tag";
  message: string;
}

export interface PopularCrowdingDetail {
  exposurePosition: number;
  exposureCount: number;
  topKThreshold: number;
  source: "exposure_log";
  message: string;
}

export interface SimilaritySparseDetail {
  neighborCount: number;
  maxSimilarity: number;
  avgSimilarity: number;
  sparseThreshold: number;
  source: "diagnosis_report";
  message: string;
}

export interface SampleReplay {
  neighborIds: string[];
  similarityScores: number[];
  tagIntersection: string[];
}

export interface DiagnosisInput {
  songTags: SongTag[];
  exposureLogs: ExposureLog[];
  diagnosisReports: DiagnosisReport[];
}

export interface DiagnosisResult {
  records: DiagnosisEntry[];
  summary: DiagnosisSummary;
}

export interface DiagnosisSummary {
  totalAnalyzed: number;
  tagMissingCount: number;
  popularCrowdingCount: number;
  similaritySparseCount: number;
  healthyCount: number;
}
