import {
  IDENTITY_MATRIX,
  multiplyMatrixList,
  matricesEqual,
  isSingular,
  roundMatrix
} from './matrixUtils';
import { getLevelById } from '../data/levels';
import type {
  GameState,
  PuzzleCell,
  TransformBlock,
  Matrix2x2,
  StepLog,
  FailurePath,
  GameResult,
  ReviewAnalysis
} from '../types/matrix';

export function initializeGame(levelId: string): GameState | null {
  const level = getLevelById(levelId);
  if (!level) return null;

  const grid: PuzzleCell[][] = [];
  for (let y = 0; y < level.gridSize.rows; y++) {
    const row: PuzzleCell[] = [];
    for (let x = 0; x < level.gridSize.cols; x++) {
      row.push({
        id: `cell-${x}-${y}`,
        x,
        y,
        blockId: null
      });
    }
    grid.push(row);
  }

  return {
    levelId,
    grid,
    availableBlocks: [...level.availableBlocks],
    currentMatrix: IDENTITY_MATRIX,
    targetMatrix: level.targetMatrix,
    steps: [],
    isComplete: false,
    isFailed: false,
    errorMessage: null,
    startTime: Date.now(),
    endTime: null
  };
}

export function getPlacedBlocks(
  grid: PuzzleCell[][],
  allBlocks: TransformBlock[]
): TransformBlock[] {
  const blocks: TransformBlock[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = grid[y][x];
      if (cell.blockId) {
        const block = allBlocks.find(b => b.id === cell.blockId);
        if (block) {
          blocks.push(block);
        }
      }
    }
  }
  return blocks;
}

export function calculateCurrentMatrix(
  grid: PuzzleCell[][],
  allBlocks: TransformBlock[]
): Matrix2x2 {
  const matrices: Matrix2x2[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = grid[y][x];
      if (cell.blockId) {
        const block = allBlocks.find(b => b.id === cell.blockId);
        if (block) {
          matrices.push(block.matrix);
        }
      }
    }
  }
  return matrices.length > 0 ? roundMatrix(multiplyMatrixList(matrices)) : IDENTITY_MATRIX;
}

export function placeBlock(
  state: GameState,
  blockId: string,
  position: { x: number; y: number }
): GameState {
  const { grid, availableBlocks, steps } = state;
  const block = availableBlocks.find(b => b.id === blockId);
  
  if (!block) {
    return {
      ...state,
      errorMessage: '找不到该变换块'
    };
  }

  if (position.y < 0 || position.y >= grid.length ||
      position.x < 0 || position.x >= grid[0].length) {
    return {
      ...state,
      errorMessage: '网格坐标越界：请在拼图区域内放置块'
    };
  }

  const cell = grid[position.y][position.x];
  if (cell.blockId) {
    return {
      ...state,
      errorMessage: '该位置已有变换块'
    };
  }

  const newGrid = grid.map(row => row.map(c => ({ ...c })));
  newGrid[position.y][position.x].blockId = blockId;

  const allBlocks = [...availableBlocks];
  const matrixBefore = state.currentMatrix;
  const matrixAfter = calculateCurrentMatrix(newGrid, allBlocks);

  const stepLog: StepLog = {
    stepNumber: steps.length + 1,
    timestamp: Date.now(),
    action: 'place',
    blockId,
    position,
    previousPosition: null,
    matrixBefore,
    matrixAfter,
    success: true,
    error: null
  };

  const isComplete = matricesEqual(matrixAfter, state.targetMatrix);
  const isSingularMatrix = isSingular(matrixAfter);

  let errorMessage: string | null = null;
  let isFailed = false;

  if (isSingularMatrix && !isComplete) {
    errorMessage = '警告：当前矩阵不可逆（行列式为0），图形可能被压缩成线或点';
  }

  return {
    ...state,
    grid: newGrid,
    currentMatrix: matrixAfter,
    steps: [...steps, stepLog],
    isComplete,
    isFailed,
    errorMessage,
    endTime: isComplete ? Date.now() : null
  };
}

export function removeBlock(
  state: GameState,
  position: { x: number; y: number }
): GameState {
  const { grid, availableBlocks, steps } = state;

  if (position.y < 0 || position.y >= grid.length ||
      position.x < 0 || position.x >= grid[0].length) {
    return {
      ...state,
      errorMessage: '网格坐标越界'
    };
  }

  const cell = grid[position.y][position.x];
  if (!cell.blockId) {
    return state;
  }

  const blockId = cell.blockId;
  const newGrid = grid.map(row => row.map(c => ({ ...c })));
  newGrid[position.y][position.x].blockId = null;

  const allBlocks = [...availableBlocks];
  const matrixBefore = state.currentMatrix;
  const matrixAfter = calculateCurrentMatrix(newGrid, allBlocks);

  const stepLog: StepLog = {
    stepNumber: steps.length + 1,
    timestamp: Date.now(),
    action: 'remove',
    blockId,
    position: null,
    previousPosition: position,
    matrixBefore,
    matrixAfter,
    success: true,
    error: null
  };

  return {
    ...state,
    grid: newGrid,
    currentMatrix: matrixAfter,
    steps: [...steps, stepLog],
    isComplete: false,
    errorMessage: null
  };
}

export function checkFailurePath(
  state: GameState,
  failurePaths: FailurePath[]
): FailurePath | null {
  const placedBlockIds = getPlacedBlocks(state.grid, state.availableBlocks)
    .map(b => b.id);

  for (const path of failurePaths) {
    const patternMatch = path.pattern.every(id => placedBlockIds.includes(id));
    if (patternMatch && path.pattern.length === placedBlockIds.length) {
      return path;
    }
  }
  return null;
}

export function generateGameResult(state: GameState): GameResult {
  const level = getLevelById(state.levelId);
  const correctSteps = state.steps.filter(s => s.success).length;
  const totalSteps = state.steps.length;

  return {
    levelId: state.levelId,
    levelName: level?.name || '未知关卡',
    isComplete: state.isComplete,
    isFailed: state.isFailed,
    totalSteps,
    correctSteps,
    duration: (state.endTime || Date.now()) - state.startTime,
    finalMatrix: state.currentMatrix,
    targetMatrix: state.targetMatrix,
    errorRate: totalSteps > 0 ? (totalSteps - correctSteps) / totalSteps : 0,
    failureReason: state.errorMessage,
    steps: state.steps
  };
}

export function generateReviewAnalysis(result: GameResult): ReviewAnalysis {
  const matrixExplanation = generateMatrixExplanation(result.finalMatrix, result.targetMatrix);
  const errorFeedback = generateErrorFeedback(result);
  const humanReadableSummary = generateHumanReadableSummary(result);
  const keyInsights = generateKeyInsights(result);
  const commonMistakes = generateCommonMistakes(result);

  return {
    matrixExplanation,
    errorFeedback,
    humanReadableSummary,
    keyInsights,
    commonMistakes
  };
}

function generateMatrixExplanation(final: Matrix2x2, target: Matrix2x2): string {
  const isCorrect = matricesEqual(final, target);
  
  if (isCorrect) {
    return `太棒了！你的最终矩阵是 [${final[0][0]}, ${final[0][1]}; ${final[1][0]}, ${final[1][1]}]，与目标完全一致。这个矩阵组合完美实现了预期的几何变换效果。`;
  }
  
  return `你的最终矩阵是 [${final[0][0]}, ${final[0][1]}; ${final[1][0]}, ${final[1][1]}]，而目标矩阵是 [${target[0][0]}, ${target[0][1]}; ${target[1][0]}, ${target[1][1]}]。让我们来看看差异在哪里...`;
}

function generateErrorFeedback(result: GameResult): string {
  if (result.isComplete) {
    return '恭喜！你成功找到了正确的变换组合。';
  }
  
  const errorSteps = result.steps.filter(s => !s.success);
  if (errorSteps.length > 0) {
    return `在尝试过程中遇到了 ${errorSteps.length} 次错误。最常见的问题是：${errorSteps[0].error || '未知错误'}。记住：矩阵乘法的顺序很重要，A×B 不等于 B×A！`;
  }
  
  return '虽然还没有完全成功，但你在正确的方向上前进！试着调整变换块的顺序或者更换一些块。';
}

function generateHumanReadableSummary(result: GameResult): string {
  const duration = Math.round(result.duration / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  if (result.isComplete) {
    return `你用了 ${minutes}分${seconds}秒，通过 ${result.correctSteps} 步完成了「${result.levelName}」关卡。做得很好！你已经掌握了这些矩阵变换的组合方法。`;
  }
  
  return `你在「${result.levelName}」关卡上花了 ${minutes}分${seconds}秒，尝试了 ${result.totalSteps} 步。虽然还没完成，但不要气馁——矩阵变换需要时间来理解和掌握。`;
}

function generateKeyInsights(result: GameResult): string[] {
  const insights: string[] = [];
  
  insights.push('矩阵乘法不满足交换律：变换的顺序会影响最终结果');
  
  if (result.totalSteps > 5) {
    insights.push('尝试在动手前先在纸上计算一下，这样可以减少试错次数');
  }
  
  if (!result.isComplete) {
    insights.push('观察目标矩阵的元素特征：旋转矩阵有对称性，缩放矩阵只有对角线元素，错切矩阵有一个轴上的额外元素');
  }
  
  insights.push('单位矩阵就像数字 1，乘了等于没乘');
  
  return insights;
}

function generateCommonMistakes(result: GameResult): string[] {
  const mistakes: string[] = [];
  const blockTypes = result.steps
    .filter(s => s.action === 'place')
    .map(s => s.blockId.split('-')[0]);
  
  if (blockTypes.includes('rotate') && blockTypes.includes('scale')) {
    if (!result.isComplete) {
      mistakes.push('可能搞错了变换顺序：记住矩阵是从右往左读的，先放的块先作用');
    }
  }
  
  if (result.steps.some(s => s.error?.includes('越界'))) {
    mistakes.push('注意网格边界：变换块只能放在拼图区域内');
  }
  
  if (result.steps.filter(s => s.action === 'remove').length > 2) {
    mistakes.push('频繁移除块说明可能需要重新思考策略，而不是盲目尝试');
  }
  
  return mistakes;
}
