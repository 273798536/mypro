import {
  CorrectionReport,
  createEmptyBoard,
  Difficulty,
  ErrorDetection,
  initializeCandidates,
  SolutionStep,
  SudokuPuzzle,
} from '../types';
import { cloneBoard, cloneCandidates } from '../types';
import { analyzeErrors } from '../engine/conflictDetector';
import { generateCorrectionReport } from '../engine/explanationGenerator';

export interface MockDataSet {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  puzzle: SudokuPuzzle;
  steps: SolutionStep[];
  errors: ErrorDetection[];
  report: CorrectionReport;
}

function createEasyPuzzle(): SudokuPuzzle {
  const board = [
    [5, 3, null, null, 7, null, null, null, null],
    [6, null, null, 1, 9, 5, null, null, null],
    [null, 9, 8, null, null, null, null, 6, null],
    [8, null, null, null, 6, null, null, null, 3],
    [4, null, null, 8, null, 3, null, null, 1],
    [7, null, null, null, 2, null, null, null, 6],
    [null, 6, null, null, null, null, 2, 8, null],
    [null, null, null, 4, 1, 9, null, null, 5],
    [null, null, null, null, 8, null, null, 7, 9],
  ];

  return {
    id: 'puzzle-easy-1',
    name: '入门级练习',
    difficulty: 'easy',
    board: cloneBoard(board),
    initialBoard: cloneBoard(board),
    candidates: initializeCandidates(board),
    source: '数学兴趣班练习册第3页',
    createdAt: new Date('2026-06-01'),
  };
}

function createMediumPuzzle(): SudokuPuzzle {
  const board = [
    [null, null, null, 6, null, null, 4, null, null],
    [7, null, null, null, null, 3, 6, null, null],
    [null, null, null, null, 9, 1, null, 8, null],
    [null, null, null, null, null, null, null, null, null],
    [null, 5, null, 1, 8, null, null, null, 3],
    [null, null, null, 3, null, 6, null, 4, 5],
    [null, 4, null, 2, null, null, null, 6, null],
    [9, null, 3, null, null, null, null, null, null],
    [null, 2, null, null, 7, null, null, null, null],
  ];

  return {
    id: 'puzzle-medium-1',
    name: '中级挑战题',
    difficulty: 'medium',
    board: cloneBoard(board),
    initialBoard: cloneBoard(board),
    candidates: initializeCandidates(board),
    source: '数独进阶训练第17题',
    createdAt: new Date('2026-06-01'),
  };
}

function createHardPuzzleWithConflict(): SudokuPuzzle {
  const board = [
    [8, null, null, null, null, null, null, null, null],
    [null, null, 3, 6, null, null, null, null, null],
    [null, 7, null, null, 9, null, 2, null, null],
    [null, 5, null, null, null, 7, null, null, null],
    [null, null, null, null, 4, 5, 7, null, null],
    [null, null, null, 1, null, null, null, 3, null],
    [null, null, 1, null, null, null, null, 6, 8],
    [null, null, 8, 5, null, null, null, 1, null],
    [null, 9, null, null, null, null, 4, null, null],
  ];

  const candidates = initializeCandidates(board);
  candidates[0][4].add(3);
  
  return {
    id: 'puzzle-hard-1',
    name: '专家级难题（含错误）',
    difficulty: 'hard',
    board: cloneBoard(board),
    initialBoard: cloneBoard(board),
    candidates,
    source: '世界数独锦标赛模拟题',
    createdAt: new Date('2026-06-01'),
  };
}

function generateStepsForPuzzle(puzzle: SudokuPuzzle, count: number): SolutionStep[] {
  const steps: SolutionStep[] = [];
  let currentBoard = cloneBoard(puzzle.initialBoard);
  let currentCandidates = cloneCandidates(puzzle.candidates);

  steps.push({
    id: `step-0`,
    puzzleId: puzzle.id,
    stepNumber: 0,
    board: cloneBoard(currentBoard),
    candidates: cloneCandidates(currentCandidates),
    action: 'fill',
    row: 0,
    col: 0,
    reasoning: '初始状态',
  });

  for (let i = 1; i <= count; i++) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (currentBoard[row][col] === null && currentCandidates[row][col].size === 1) {
          const value = currentCandidates[row][col].values().next().value;
          currentBoard[row][col] = value;
          
          for (let c = 0; c < 9; c++) currentCandidates[row][c].delete(value);
          for (let r = 0; r < 9; r++) currentCandidates[r][col].delete(value);
          const boxRow = Math.floor(row / 3) * 3;
          const boxCol = Math.floor(col / 3) * 3;
          for (let r = boxRow; r < boxRow + 3; r++) {
            for (let c = boxCol; c < boxCol + 3; c++) {
              currentCandidates[r][c].delete(value);
            }
          }

          steps.push({
            id: `step-${i}`,
            puzzleId: puzzle.id,
            stepNumber: i,
            board: cloneBoard(currentBoard),
            candidates: cloneCandidates(currentCandidates),
            action: 'fill',
            row,
            col,
            value,
            reasoning: `第${row + 1}行第${col + 1}列唯一候选数`,
          });
          
          if (steps.length > count) break;
        }
      }
      if (steps.length > count) break;
    }
    if (steps.length > count) break;
  }

  return steps;
}

export const mockDataSets: MockDataSet[] = [];

const easyPuzzle = createEasyPuzzle();
const easySteps = generateStepsForPuzzle(easyPuzzle, 6);
const easyPuzzleCurrent = { ...easyPuzzle, board: easySteps[easySteps.length - 1].board, candidates: easySteps[easySteps.length - 1].candidates };
const easyErrors = analyzeErrors(easyPuzzleCurrent);
const easyReport = generateCorrectionReport(easyPuzzleCurrent, easyErrors, easyPuzzle.source);

mockDataSets.push({
  id: 'demo-easy',
  name: '入门级示例 - 基础错误检测',
  description: '简单的候选数冲突演示，适合教学',
  difficulty: 'easy',
  puzzle: easyPuzzleCurrent,
  steps: easySteps,
  errors: easyErrors,
  report: easyReport,
});

const mediumPuzzle = createMediumPuzzle();
const mediumSteps = generateStepsForPuzzle(mediumPuzzle, 8);
const mediumPuzzleCurrent = { ...mediumPuzzle, board: mediumSteps[mediumSteps.length - 1].board, candidates: mediumSteps[mediumSteps.length - 1].candidates };
const mediumErrors = analyzeErrors(mediumPuzzleCurrent);
const mediumReport = generateCorrectionReport(mediumPuzzleCurrent, mediumErrors, mediumPuzzle.source);

mockDataSets.push({
  id: 'demo-medium',
  name: '中级示例 - 约束传播分析',
  description: '展示约束传播链和步骤回溯',
  difficulty: 'medium',
  puzzle: mediumPuzzleCurrent,
  steps: mediumSteps,
  errors: mediumErrors,
  report: mediumReport,
});

const hardPuzzle = createHardPuzzleWithConflict();
const hardSteps = generateStepsForPuzzle(hardPuzzle, 5);
const hardPuzzleCurrent = { ...hardPuzzle, board: hardSteps[hardSteps.length - 1].board, candidates: hardSteps[hardSteps.length - 1].candidates };
const hardErrors = analyzeErrors(hardPuzzleCurrent);
const hardReport = generateCorrectionReport(hardPuzzleCurrent, hardErrors, hardPuzzle.source);

mockDataSets.push({
  id: 'demo-hard',
  name: '高级示例 - 多重错误分析',
  description: '唯一解破坏和候选冲突的复杂场景',
  difficulty: 'expert',
  puzzle: hardPuzzleCurrent,
  steps: hardSteps,
  errors: hardErrors,
  report: hardReport,
});

export function getMockDataSet(id: string): MockDataSet | undefined {
  return mockDataSets.find(d => d.id === id);
}

export function getFirstMockDataSet(): MockDataSet {
  return mockDataSets[0];
}
