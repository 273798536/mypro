import {
  CellPosition,
  cloneBoard,
  cloneCandidates,
  ErrorDetection,
  SolutionStep,
  SudokuPuzzle,
} from '../types';
import { findNakedSingle, findHiddenSingle, hasUniqueSolution } from './sudokuCore';

export interface StepValidationResult {
  isValid: boolean;
  isJump: boolean;
  missingSteps: string[];
  errors: ErrorDetection[];
}

export function validateStepProgression(
  prevBoard: (number | null)[][],
  prevCandidates: Set<number>[][],
  currentBoard: (number | null)[][],
  puzzleId: string,
  stepId: string
): StepValidationResult {
  const errors: ErrorDetection[] = [];
  const missingSteps: string[] = [];
  
  const prevFilled = countFilledCells(prevBoard);
  const currentFilled = countFilledCells(currentBoard);
  const difference = currentFilled - prevFilled;
  
  if (difference > 1) {
    const newCells = findNewlyFilledCells(prevBoard, currentBoard);
    const nakedSingle = findNakedSingle(prevCandidates);
    const hiddenSingle = findHiddenSingle(prevBoard, prevCandidates);
    
    if (!nakedSingle && !hiddenSingle) {
      errors.push({
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        puzzleId,
        stepId,
        errorType: 'step_jump',
        severity: difference > 2 ? 'high' : 'medium',
        triggerCell: newCells[0] || { row: 0, col: 0 },
        affectedCells: newCells,
        constraintChain: [],
        description: `一次填写了${difference}个数字，建议逐步填写`,
      });
      missingSteps.push(`跳过了${difference - 1}步填写`);
    }
  }
  
  const prevSolutions = hasUniqueSolution(prevBoard);
  const currentSolutions = hasUniqueSolution(currentBoard);
  
  if (prevSolutions && !currentSolutions) {
    const badCells = findCellsBreakingUniqueness(prevBoard, currentBoard);
    errors.push({
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      puzzleId,
      stepId,
      errorType: 'unique_solution_violation',
      severity: 'critical',
      triggerCell: badCells[0] || { row: 0, col: 0 },
      affectedCells: badCells,
      constraintChain: [],
      description: '当前填写导致题目失去唯一解',
    });
  }
  
  return {
    isValid: errors.length === 0,
    isJump: difference > 1,
    missingSteps,
    errors,
  };
}

function countFilledCells(board: (number | null)[][]): number {
  return board.flat().filter(cell => cell !== null).length;
}

function findNewlyFilledCells(
  prevBoard: (number | null)[][],
  currentBoard: (number | null)[][]
): CellPosition[] {
  const cells: CellPosition[] = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (prevBoard[row][col] === null && currentBoard[row][col] !== null) {
        cells.push({ row, col });
      }
    }
  }
  return cells;
}

function findCellsBreakingUniqueness(
  prevBoard: (number | null)[][],
  currentBoard: (number | null)[][]
): CellPosition[] {
  const badCells: CellPosition[] = [];
  const newCells = findNewlyFilledCells(prevBoard, currentBoard);
  
  for (const cell of newCells) {
    const testBoard = cloneBoard(prevBoard);
    testBoard[cell.row][cell.col] = currentBoard[cell.row][cell.col];
    if (!hasUniqueSolution(testBoard)) {
      badCells.push(cell);
    }
  }
  
  return badCells;
}

export function validateAllSteps(
  puzzle: SudokuPuzzle,
  steps: SolutionStep[]
): ErrorDetection[] {
  const allErrors: ErrorDetection[] = [];
  
  for (let i = 1; i < steps.length; i++) {
    const prevStep = steps[i - 1];
    const currentStep = steps[i];
    
    const result = validateStepProgression(
      prevStep.board,
      prevStep.candidates,
      currentStep.board,
      puzzle.id,
      currentStep.id
    );
    
    allErrors.push(...result.errors);
  }
  
  return allErrors;
}
