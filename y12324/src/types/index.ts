export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type ErrorType = 'candidate_conflict' | 'step_jump' | 'unique_solution_violation';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type ActionType = 'fill' | 'remove_candidate' | 'undo';
export type NodeType = 'source' | 'propagation' | 'conflict';

export interface CellPosition {
  row: number;
  col: number;
}

export interface ConstraintNode {
  id: string;
  cell: CellPosition;
  candidate: number;
  type: NodeType;
  reason: string;
  parentIds: string[];
}

export interface SudokuPuzzle {
  id: string;
  name: string;
  difficulty: Difficulty;
  board: (number | null)[][];
  initialBoard: (number | null)[][];
  candidates: Set<number>[][];
  source: string;
  createdAt: Date;
}

export interface SolutionStep {
  id: string;
  puzzleId: string;
  stepNumber: number;
  board: (number | null)[][];
  candidates: Set<number>[][];
  action: ActionType;
  row: number;
  col: number;
  value?: number;
  removedCandidate?: number;
  reasoning: string;
}

export interface ErrorDetection {
  id: string;
  puzzleId: string;
  stepId: string;
  errorType: ErrorType;
  severity: Severity;
  triggerCell: CellPosition;
  affectedCells: CellPosition[];
  constraintChain: ConstraintNode[];
  description: string;
}

export interface HumanReadableExplanation {
  summary: string;
  whatWentWrong: string;
  whyItMatters: string;
  howToFix: string;
}

export interface CorrectionReport {
  id: string;
  puzzleId: string;
  sourceMaterial: string;
  errors: ErrorDetection[];
  stuckPoint: {
    cell: CellPosition;
    reason: string;
  };
  nextSuggestions: {
    cell: CellPosition;
    value: number;
    reasoning: string;
  }[];
  humanReadableExplanation: HumanReadableExplanation;
  generatedAt: Date;
}

export interface AnalysisResult {
  puzzle: SudokuPuzzle;
  steps: SolutionStep[];
  errors: ErrorDetection[];
  report: CorrectionReport | null;
  currentStepIndex: number;
}

export function createEmptyBoard(): (number | null)[][] {
  return Array(9).fill(null).map(() => Array(9).fill(null));
}

export function createEmptyCandidates(): Set<number>[][] {
  return Array(9).fill(null).map(() => 
    Array(9).fill(null).map(() => new Set<number>())
  );
}

export function initializeCandidates(board: (number | null)[][]): Set<number>[][] {
  const candidates = createEmptyCandidates();
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === null) {
        candidates[row][col] = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      }
    }
  }
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const value = board[row][col];
      if (value !== null) {
        eliminateCandidate(candidates, row, col, value);
      }
    }
  }
  return candidates;
}

export function eliminateCandidate(
  candidates: Set<number>[][],
  row: number,
  col: number,
  value: number
): void {
  for (let c = 0; c < 9; c++) {
    candidates[row][c].delete(value);
  }
  for (let r = 0; r < 9; r++) {
    candidates[r][col].delete(value);
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      candidates[r][c].delete(value);
    }
  }
}

export function cloneCandidates(candidates: Set<number>[][]): Set<number>[][] {
  return candidates.map(row => 
    row.map(cell => new Set(cell))
  );
}

export function cloneBoard(board: (number | null)[][]): (number | null)[][] {
  return board.map(row => [...row]);
}
