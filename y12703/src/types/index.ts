export type DataGrade = "available" | "pending" | "recollect";
export type ProblemStatus = "pending" | "approved" | "suspended" | "recollect";
export type OperationType = "import" | "correct" | "status_change" | "merge";

export interface SequenceProblem {
  id: string;
  title: string;
  recurrenceFormula: string;
  initialTerms: number[];
  computedValues: number[];
  historicalAnswers: number[];
  correctedValues?: number[];
  status: ProblemStatus;
  isExtrapolationOutlier: boolean;
  outlierIndices: number[];
  dataGrade: DataGrade;
  note: string;
  createdAt: string;
  updatedAt: string;
  derivationSteps?: DerivationStep[];
}

export interface DerivationStep {
  step: number;
  description: string;
  formula: string;
  result?: number;
}

export interface OperationLog {
  id: string;
  problemId: string;
  operationType: OperationType;
  operator: string;
  beforeValue: string;
  afterValue: string;
  reason?: string;
  timestamp: string;
}

export interface StoreState {
  problems: SequenceProblem[];
  logs: OperationLog[];
  selectedProblemId: string | null;
  filters: {
    status?: ProblemStatus;
    onlyOutliers: boolean;
    search?: string;
  };
}

export interface StoreActions {
  selectProblem: (id: string | null) => void;
  setFilters: (filters: Partial<StoreState["filters"]>) => void;
  correctProblem: (
    id: string,
    correctedValues: number[],
    reason: string,
    operator: string
  ) => void;
  updateStatus: (
    id: string,
    status: ProblemStatus,
    operator: string,
    reason?: string
  ) => void;
  importProblems: (
    incoming: SequenceProblem[],
    operator: string
  ) => { added: number; updated: number; skipped: number; conflicts: number };
  getFilteredProblems: () => SequenceProblem[];
  getStats: () => {
    total: number;
    available: number;
    pending: number;
    recollect: number;
    outliers: number;
  };
  getLogsByProblem: (problemId: string) => OperationLog[];
}

export type AppStore = StoreState & StoreActions;
