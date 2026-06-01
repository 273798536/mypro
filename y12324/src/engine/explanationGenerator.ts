import {
  CorrectionReport,
  ErrorDetection,
  HumanReadableExplanation,
  SudokuPuzzle,
} from '../types';
import { findNakedSingle, findHiddenSingle } from './sudokuCore';

const errorTypeNames: Record<string, string> = {
  candidate_conflict: '候选数冲突',
  step_jump: '步骤跳跃',
  unique_solution_violation: '唯一解破坏',
};

const severityNames: Record<string, string> = {
  low: '轻微',
  medium: '中等',
  high: '严重',
  critical: '致命',
};

export function generateHumanReadableExplanation(
  errors: ErrorDetection[],
  puzzle: SudokuPuzzle
): HumanReadableExplanation {
  if (errors.length === 0) {
    return {
      summary: '太棒了！当前没有检测到错误。',
      whatWentWrong: '数独的填写过程看起来非常规范，候选数排列合理，步骤也符合逻辑。',
      whyItMatters: '正确的数独解题过程能培养严谨的逻辑思维能力，每一步都有依据是学好数独的关键。',
      howToFix: '继续保持！你可以尝试寻找下一个可以确定的数字，或者检查哪些格子的候选数可以进一步删减。',
    };
  }

  const mainError = errors[0];
  const errorCount = errors.length;
  const criticalErrors = errors.filter(e => e.severity === 'critical').length;
  const cellPos = `第${mainError.triggerCell.row + 1}行第${mainError.triggerCell.col + 1}列`;

  const summary = generateSummary(errors, puzzle, errorCount, criticalErrors);
  const whatWentWrong = generateWhatWentWrong(mainError, cellPos, errors);
  const whyItMatters = generateWhyItMatters(mainError);
  const howToFix = generateHowToFix(mainError, puzzle, cellPos);

  return {
    summary,
    whatWentWrong,
    whyItMatters,
    howToFix,
  };
}

function generateSummary(
  errors: ErrorDetection[],
  puzzle: SudokuPuzzle,
  errorCount: number,
  criticalErrors: number
): string {
  const errorTypes = [...new Set(errors.map(e => errorTypeNames[e.errorType]))];
  const typeText = errorTypes.join('、');
  
  if (criticalErrors > 0) {
    return `检测到 ${errorCount} 个问题，其中 ${criticalErrors} 个是致命错误，主要是${typeText}。需要立即关注！`;
  }
  
  return `发现 ${errorCount} 个需要注意的地方，主要涉及${typeText}。这些问题会影响解题的顺利进行。`;
}

function generateWhatWentWrong(
  mainError: ErrorDetection,
  cellPos: string,
  errors: ErrorDetection[]
): string {
  switch (mainError.errorType) {
    case 'candidate_conflict':
      const conflictCount = errors.filter(e => e.errorType === 'candidate_conflict').length;
      if (mainError.constraintChain.length > 0) {
        const conflictValue = mainError.constraintChain[0]?.candidate || '某个数字';
        return `在${cellPos}这个格子里，候选数${conflictValue}出现了矛盾。往前追溯会发现：在填写前面的数字时，这个候选数本来就应该被排除掉，但因为某一步没有仔细检查，导致它"溜"了进来。现在一共有${conflictCount}个格子存在这样的候选数冲突。`;
      }
      return `${cellPos}的候选数出现了问题，要么是某个数字和同行/同列/同宫的已填数字重复了，要么是这个格子已经没有任何可以填的数字了（俗称"卡死了"）。这说明前面的步骤中可能有填错的地方。`;
      
    case 'step_jump':
      const jumpCount = mainError.affectedCells.length + 1;
      return `在${cellPos}这一步，你一下子确定了${jumpCount}个数字。虽然这些数字可能都是对的，但学习数独讲究"一步一个脚印"——每次只填一个能确定的数字，这样能确保每一步都经得起推敲，也更容易发现错误。`;
      
    case 'unique_solution_violation':
      return `${cellPos}填写的数字破坏了题目的唯一解性。一道好的数独题应该只有一个正确答案，但你现在填的这个数字导致题目出现了多种可能的解法，说明这个数字填得有问题。`;
      
    default:
      return `${cellPos}出现了需要注意的问题，请仔细检查。`;
  }
}

function generateWhyItMatters(mainError: ErrorDetection): string {
  switch (mainError.errorType) {
    case 'candidate_conflict':
      return '候选数就像是数独的"侦查线索"——它们告诉我们每个格子可能填什么。如果候选数出错了，就像侦探追踪了错误的线索，后面的推理都会跑偏。严重的候选冲突会导致你卡在某个地方，甚至把正确的数字改错。';
      
    case 'step_jump':
      return '跳步填写看似提高了速度，但实际上增加了出错的风险。更重要的是，数独的精髓在于逻辑推理——每一步都要能说出"为什么这个格子一定填这个数"。跳步会让你跳过这个思考过程，不利于真正掌握解题技巧。';
      
    case 'unique_solution_violation':
      return '唯一解是数独的基本原则——就像每道数学题应该只有一个标准答案。如果破坏了唯一性，说明你填的数字并不是"推理出来的"，而是"猜的"。猜对了是运气，猜错了就会导致后面全盘皆错。';
      
    default:
      return '及时发现并纠正这些问题，能帮助你养成良好的解题习惯，提高数独水平。';
  }
}

function generateHowToFix(
  mainError: ErrorDetection,
  puzzle: SudokuPuzzle,
  cellPos: string
): string {
  switch (mainError.errorType) {
    case 'candidate_conflict':
      const nakedSingle = findNakedSingle(puzzle.candidates);
      const hiddenSingle = findHiddenSingle(puzzle.board, puzzle.candidates);
      
      let suggestion = `建议从${cellPos}开始，回溯检查前面几步的填写：`;
      suggestion += '\n\n1. 先看看这个格子所在的行、列、宫里有没有已经填了相同的数字';
      suggestion += '\n2. 如果有，说明前面那个数字填错了，需要撤销那一步';
      suggestion += '\n3. 如果没有，就重新梳理一下这个格子的候选数，把不可能的数字都划掉';
      
      if (nakedSingle) {
        suggestion += `\n\n💡 提示：第${nakedSingle.cell.row + 1}行第${nakedSingle.cell.col + 1}列现在只有一个候选数${nakedSingle.value}，可以先填这个！`;
      } else if (hiddenSingle) {
        suggestion += `\n\n💡 提示：${hiddenSingle.reason}——第${hiddenSingle.cell.row + 1}行第${hiddenSingle.cell.col + 1}列应该填${hiddenSingle.value}！`;
      }
      
      return suggestion;
      
    case 'step_jump':
      return '建议按以下步骤来：\n\n1. 先撤销刚才跳步填写的所有数字\n2. 重新审视题盘，找一个"最确定"的格子（就是候选数最少的那个）\n3. 只填这一个数字，然后更新相关格子的候选数\n4. 重复这个过程，一步一步来\n\n记住：慢就是快！稳扎稳打才能真正提高。';
      
    case 'unique_solution_violation':
      return `建议这样处理：\n\n1. 撤销${cellPos}填写的数字\n2. 回到上一步，仔细检查这个格子的候选数\n3. 问问自己："这个数字真的是唯一可能的吗？"\n4. 如果不确定，就先放一放，找其他能确定的格子\n\n有时候卡住是好事——说明你需要用更高级的技巧来推理了！`;
      
    default:
      return '建议从发生错误的地方开始回溯，一步一步检查，总能找到问题所在的。';
  }
}

export function generateCorrectionReport(
  puzzle: SudokuPuzzle,
  errors: ErrorDetection[],
  sourceMaterial: string = '数独练习册'
): CorrectionReport {
  const explanation = generateHumanReadableExplanation(errors, puzzle);
  
  const stuckPoint = findStuckPoint(puzzle);
  const suggestions = findNextSuggestions(puzzle);

  return {
    id: `report-${Date.now()}`,
    puzzleId: puzzle.id,
    sourceMaterial,
    errors,
    stuckPoint,
    nextSuggestions: suggestions,
    humanReadableExplanation: explanation,
    generatedAt: new Date(),
  };
}

function findStuckPoint(puzzle: SudokuPuzzle): { cell: { row: number; col: number }; reason: string } {
  let minCandidates = 10;
  let stuckCell = { row: 0, col: 0 };
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (puzzle.board[row][col] === null) {
        const count = puzzle.candidates[row][col].size;
        if (count > 0 && count < minCandidates) {
          minCandidates = count;
          stuckCell = { row, col };
        }
      }
    }
  }
  
  return {
    cell: stuckCell,
    reason: `第${stuckCell.row + 1}行第${stuckCell.col + 1}列候选数最少（${minCandidates}个），是关键突破口`,
  };
}

function findNextSuggestions(
  puzzle: SudokuPuzzle
): { cell: { row: number; col: number }; value: number; reasoning: string }[] {
  const suggestions: { cell: { row: number; col: number }; value: number; reasoning: string }[] = [];
  
  const nakedSingle = findNakedSingle(puzzle.candidates);
  if (nakedSingle) {
    suggestions.push({
      cell: nakedSingle.cell,
      value: nakedSingle.value,
      reasoning: '唯一候选数法：这个格子只剩下这一个可能了',
    });
  }
  
  const hiddenSingle = findHiddenSingle(puzzle.board, puzzle.candidates);
  if (hiddenSingle) {
    suggestions.push({
      cell: hiddenSingle.cell,
      value: hiddenSingle.value,
      reasoning: hiddenSingle.reason,
    });
  }
  
  return suggestions;
}

export function getErrorTypeName(type: string): string {
  return errorTypeNames[type] || type;
}

export function getSeverityName(severity: string): string {
  return severityNames[severity] || severity;
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'low': return 'text-gray-500';
    case 'medium': return 'text-amber-500';
    case 'high': return 'text-orange-500';
    case 'critical': return 'text-red-500';
    default: return 'text-gray-500';
  }
}

export function getSeverityBgColor(severity: string): string {
  switch (severity) {
    case 'low': return 'bg-gray-100';
    case 'medium': return 'bg-amber-50';
    case 'high': return 'bg-orange-50';
    case 'critical': return 'bg-red-50';
    default: return 'bg-gray-100';
  }
}
