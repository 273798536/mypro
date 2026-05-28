export interface PartitionConfig {
  targetNumber: number;
  mode: "ordered" | "unordered";
  minAddend: number;
  maxAddend: number;
  minCount: number;
  maxCount: number;
  allowDuplicate: boolean;
  customPredicates: string[];
}

export interface PartitionWarning {
  type: "explosion" | "duplicate_permutation" | "condition_unused";
  message: string;
  detail: string;
  affectedCount: number;
}

export interface RecursionStep {
  depth: number;
  currentSum: number;
  remaining: number;
  chosen: number;
  branch: number[];
  isPruned: boolean;
  pruneReason?: string;
}

export interface RemovedPartition {
  partition: number[];
  reason: string;
}

export interface PartitionResult {
  id: string;
  config: PartitionConfig;
  allPartitions: number[][];
  filteredPartitions: number[][];
  removedPartitions: RemovedPartition[];
  warnings: PartitionWarning[];
  recursionSteps: RecursionStep[];
  timestamp: number;
  source: "manual" | "import";
  importMeta?: ImportMeta;
}

export interface Session {
  id: string;
  results: PartitionResult[];
  corrections: CorrectionRecord[];
  createdAt: number;
  updatedAt: number;
}

export interface CorrectionRecord {
  id: string;
  sessionId: string;
  timestamp: number;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
}

export interface ImportMeta {
  filename: string;
  importTime: number;
  strategy: "ignore" | "overwrite" | "append";
  fieldsImported: string[];
}

export interface MaterialImport {
  targetNumber?: number;
  constraints?: Partial<PartitionConfig>;
  presetSchemes?: number[][];
  studentAnswers?: number[][];
  notes?: string;
  screenshots?: string[];
}

export const DEFAULT_CONFIG: PartitionConfig = {
  targetNumber: 5,
  mode: "unordered",
  minAddend: 1,
  maxAddend: 100,
  minCount: 1,
  maxCount: 100,
  allowDuplicate: true,
  customPredicates: [],
};

export const EXPLOSION_THRESHOLD = 500;
