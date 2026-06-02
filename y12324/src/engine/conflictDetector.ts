import {
  CellPosition,
  ConstraintNode,
  ErrorDetection,
  ErrorType,
  Severity,
  SolutionStep,
  SudokuPuzzle,
} from '../types';
import { getRelatedCells, hasUniqueSolution } from './sudokuCore';

export interface ConflictInfo {
  cell: CellPosition;
  conflicts: {
    value: number;
    relatedCells: CellPosition[];
  }[];
  severity: Severity;
}

export function detectCandidateConflicts(
  board: (number | null)[][],
  candidates: Set<number>[][]
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== null) continue;
      
      const cellCandidates = candidates[row][col];
      const cellConflicts: { value: number; relatedCells: CellPosition[] }[] = [];
      
      const relatedCells = getRelatedCells(row, col);
      
      for (const candidate of cellCandidates) {
        const conflictingCells: CellPosition[] = [];
        
        for (const related of relatedCells) {
          if (board[related.row][related.col] === candidate) {
            conflictingCells.push(related);
          }
          
          if (
            board[related.row][related.col] === null &&
            candidates[related.row][related.col].has(candidate)
          ) {
            const isOnlyCandidateInHouse = checkIfOnlyCandidate(
              board,
              candidates,
              related.row,
              related.col,
              candidate
            );
            if (isOnlyCandidateInHouse) {
              conflictingCells.push(related);
            }
          }
        }
        
        if (conflictingCells.length > 0) {
          cellConflicts.push({ value: candidate, relatedCells: conflictingCells });
        }
      }
      
      if (cellConflicts.length > 0) {
        let severity: Severity = 'low';
        if (cellConflicts.length >= 3) severity = 'high';
        else if (cellConflicts.length >= 2) severity = 'medium';
        
        if (cellCandidates.size === 0) severity = 'critical';
        
        conflicts.push({
          cell: { row, col },
          conflicts: cellConflicts,
          severity,
        });
      }
      
      if (cellCandidates.size === 0 && !conflicts.find(c => c.cell.row === row && c.cell.col === col)) {
        conflicts.push({
          cell: { row, col },
          conflicts: [],
          severity: 'critical',
        });
      }
    }
  }
  
  return conflicts;
}

function checkIfOnlyCandidate(
  board: (number | null)[][],
  candidates: Set<number>[][],
  row: number,
  col: number,
  value: number
): boolean {
  let rowCount = 0;
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === null && candidates[row][c].has(value)) {
      rowCount++;
    }
  }
  if (rowCount === 1) return true;
  
  let colCount = 0;
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === null && candidates[r][col].has(value)) {
      colCount++;
    }
  }
  if (colCount === 1) return true;
  
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  let boxCount = 0;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === null && candidates[r][c].has(value)) {
        boxCount++;
      }
    }
  }
  if (boxCount === 1) return true;
  
  return false;
}

export function buildConstraintChain(
  board: (number | null)[][],
  candidates: Set<number>[][],
  startCell: CellPosition,
  conflictingValue: number
): ConstraintNode[] {
  const chain: ConstraintNode[] = [];
  const visited = new Set<string>();
  
  function buildNode(
    cell: CellPosition,
    candidate: number,
    type: 'source' | 'propagation' | 'conflict',
    reason: string,
    parentIds: string[]
  ): ConstraintNode {
    const id = `node-${cell.row}-${cell.col}-${candidate}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    return { id, cell, candidate, type, reason, parentIds };
  }
  
  const queue: { cell: CellPosition; value: number; parentIds: string[]; depth: number }[] = [
    { cell: startCell, value: conflictingValue, parentIds: [], depth: 0 },
  ];
  
  while (queue.length > 0 && chain.length < 20) {
    const current = queue.shift()!;
    const key = `${current.cell.row}-${current.cell.col}-${current.value}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    const relatedCells = getRelatedCells(current.cell.row, current.cell.col);
    const isConflict = board[current.cell.row][current.cell.col] === current.value;
    
    const nodeType = current.depth === 0 ? 'source' : isConflict ? 'conflict' : 'propagation';
    const reason = current.depth === 0 
      ? '触发冲突的初始单元格'
      : isConflict 
        ? `与已填数字${current.value}冲突`
        : `候选数${current.value}受约束影响`;
    
    const node = buildNode(current.cell, current.value, nodeType, reason, current.parentIds);
    chain.push(node);
    
    if (nodeType === 'conflict') continue;
    if (current.depth >= 3) continue;
    
    for (const related of relatedCells) {
      const relatedKey = `${related.row}-${related.col}-${current.value}`;
      if (visited.has(relatedKey)) continue;
      
      if (
        board[related.row][related.col] === null &&
        candidates[related.row][related.col].has(current.value)
      ) {
        queue.push({
          cell: related,
          value: current.value,
          parentIds: [node.id],
          depth: current.depth + 1,
        });
      }
      
      if (board[related.row][related.col] === current.value) {
        queue.push({
          cell: related,
          value: current.value,
          parentIds: [node.id],
          depth: current.depth + 1,
        });
      }
    }
  }
  
  return chain;
}

export function analyzeErrors(
  puzzle: SudokuPuzzle,
  stepId: string = 'current'
): ErrorDetection[] {
  const errors: ErrorDetection[] = [];
  const conflicts = detectCandidateConflicts(puzzle.board, puzzle.candidates);
  
  for (const conflict of conflicts) {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const mainConflict = conflict.conflicts[0];
    const constraintChain = mainConflict 
      ? buildConstraintChain(puzzle.board, puzzle.candidates, conflict.cell, mainConflict.value)
      : [];
    
    const description = mainConflict
      ? `单元格(${conflict.cell.row + 1}, ${conflict.cell.col + 1})的候选数${mainConflict.value}存在冲突`
      : `单元格(${conflict.cell.row + 1}, ${conflict.cell.col + 1})没有可用候选数`;
    
    errors.push({
      id: errorId,
      puzzleId: puzzle.id,
      stepId,
      errorType: 'candidate_conflict',
      severity: conflict.severity,
      triggerCell: conflict.cell,
      affectedCells: conflict.conflicts.flatMap(c => c.relatedCells),
      constraintChain,
      description,
    });
  }
  
  return errors;
}

export function calculateHeatmapScore(
  board: (number | null)[][],
  candidates: Set<number>[][]
): number[][] {
  const scores: number[][] = Array(9).fill(null).map(() => Array(9).fill(0));
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== null) {
        scores[row][col] = 0;
        continue;
      }
      
      const cellCandidates = candidates[row][col];
      const candidateCount = cellCandidates.size;
      
      if (candidateCount === 0) {
        scores[row][col] = 1;
      } else if (candidateCount <= 2) {
        scores[row][col] = 0.8;
      } else if (candidateCount <= 4) {
        scores[row][col] = 0.5;
      } else {
        scores[row][col] = 0.2;
      }
      
      const relatedCells = getRelatedCells(row, col);
      let conflictCount = 0;
      for (const related of relatedCells) {
        if (board[related.row][related.col] === null) {
          const relatedCandidates = candidates[related.row][related.col];
          const intersection = [...cellCandidates].filter(x => relatedCandidates.has(x));
          if (intersection.length === 1) {
            conflictCount++;
          }
        }
      }
      
      scores[row][col] = Math.min(1, scores[row][col] + conflictCount * 0.05);
    }
  }
  
  return scores;
}

export function detectStepJumps(
  steps: SolutionStep[]
): ErrorDetection[] {
  const errors: ErrorDetection[] = [];
  
  for (let i = 1; i < steps.length; i++) {
    const prevStep = steps[i - 1];
    const currStep = steps[i];
    
    let prevFilled = 0;
    let currFilled = 0;
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (prevStep.board[row][col] !== null) prevFilled++;
        if (currStep.board[row][col] !== null) currFilled++;
      }
    }
    
    const delta = currFilled - prevFilled;
    
    if (delta > 1) {
      const errorId = `error-step-jump-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      errors.push({
        id: errorId,
        puzzleId: steps[0]?.puzzleId || 'unknown',
        stepId: currStep.id,
        errorType: 'step_jump',
        severity: delta > 3 ? 'critical' : delta > 2 ? 'high' : 'medium',
        triggerCell: { row: currStep.row, col: currStep.col },
        affectedCells: [],
        constraintChain: [],
        description: `一步填写了 ${delta} 个数字，建议拆分为 ${delta} 个独立步骤`,
      });
    }
  }
  
  return errors;
}

export function detectUniqueSolutionViolation(
  board: (number | null)[][],
  puzzle: SudokuPuzzle
): ErrorDetection[] {
  const errors: ErrorDetection[] = [];
  
  let filledCount = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== null) filledCount++;
    }
  }
  if (filledCount < 40) return errors;
  
  const hasUnique = hasUniqueSolution(board);
  
  if (!hasUnique) {
    const emptyCell = findFirstEmptyCell(board);
    
    if (emptyCell) {
      const errorId = `error-unique-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      errors.push({
        id: errorId,
        puzzleId: puzzle.id,
        stepId: 'current',
        errorType: 'unique_solution_violation',
        severity: 'critical',
        triggerCell: emptyCell,
        affectedCells: [],
        constraintChain: [],
        description: '当前填法导致题目失去唯一正确解，请检查已填写的数字',
      });
    }
  }
  
  return errors;
}

function findFirstEmptyCell(board: (number | null)[][]): CellPosition | null {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === null) {
        return { row, col };
      }
    }
  }
  return null;
}

export function validateAllSteps(
  puzzle: SudokuPuzzle,
  steps: SolutionStep[]
): ErrorDetection[] {
  const allErrors: ErrorDetection[] = [];
  
  const candidateErrors = analyzeErrors(puzzle, 'current');
  allErrors.push(...candidateErrors);
  
  const stepJumpErrors = detectStepJumps(steps);
  allErrors.push(...stepJumpErrors);
  
  const uniqueSolutionErrors = detectUniqueSolutionViolation(puzzle.board, puzzle);
  allErrors.push(...uniqueSolutionErrors);
  
  return allErrors;
}
