import {
  CellPosition,
  cloneBoard,
  cloneCandidates,
  createEmptyBoard,
  SolutionStep,
  SudokuPuzzle,
} from '../types';

export function getRowCells(row: number): CellPosition[] {
  return Array(9).fill(null).map((_, col) => ({ row, col }));
}

export function getColumnCells(col: number): CellPosition[] {
  return Array(9).fill(null).map((_, row) => ({ row, col }));
}

export function getBoxCells(boxRow: number, boxCol: number): CellPosition[] {
  const cells: CellPosition[] = [];
  const startRow = boxRow * 3;
  const startCol = boxCol * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push({ row: startRow + r, col: startCol + c });
    }
  }
  return cells;
}

export function getCellBox(row: number, col: number): { boxRow: number; boxCol: number } {
  return {
    boxRow: Math.floor(row / 3),
    boxCol: Math.floor(col / 3),
  };
}

export function getRelatedCells(row: number, col: number): CellPosition[] {
  const related = new Set<string>();
  const cells: CellPosition[] = [];
  
  getRowCells(row).forEach(cell => {
    const key = `${cell.row},${cell.col}`;
    if (!related.has(key) && !(cell.row === row && cell.col === col)) {
      related.add(key);
      cells.push(cell);
    }
  });
  
  getColumnCells(col).forEach(cell => {
    const key = `${cell.row},${cell.col}`;
    if (!related.has(key) && !(cell.row === row && cell.col === col)) {
      related.add(key);
      cells.push(cell);
    }
  });
  
  const { boxRow, boxCol } = getCellBox(row, col);
  getBoxCells(boxRow, boxCol).forEach(cell => {
    const key = `${cell.row},${cell.col}`;
    if (!related.has(key) && !(cell.row === row && cell.col === col)) {
      related.add(key);
      cells.push(cell);
    }
  });
  
  return cells;
}

export function isValidPlacement(
  board: (number | null)[][],
  row: number,
  col: number,
  value: number
): boolean {
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === value) return false;
  }
  
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === value) return false;
  }
  
  const { boxRow, boxCol } = getCellBox(row, col);
  for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
    for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
      if (board[r][c] === value) return false;
    }
  }
  
  return true;
}

export function countSolutions(
  board: (number | null)[][],
  limit: number = 2
): number {
  let count = 0;
  
  function backtrack(boardCopy: (number | null)[][]): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (boardCopy[row][col] === null) {
          for (let value = 1; value <= 9; value++) {
            if (isValidPlacement(boardCopy, row, col, value)) {
              boardCopy[row][col] = value;
              if (backtrack(boardCopy)) {
                return true;
              }
              boardCopy[row][col] = null;
            }
          }
          return false;
        }
      }
    }
    count++;
    return count >= limit;
  }
  
  backtrack(cloneBoard(board));
  return count;
}

export function hasUniqueSolution(board: (number | null)[][]): boolean {
  return countSolutions(board, 2) === 1;
}

export function findEmptyCell(board: (number | null)[][]): CellPosition | null {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === null) {
        return { row, col };
      }
    }
  }
  return null;
}

export function findNakedSingle(
  candidates: Set<number>[][]
): { cell: CellPosition; value: number } | null {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cellCandidates = candidates[row][col];
      if (cellCandidates.size === 1) {
        return { cell: { row, col }, value: cellCandidates.values().next().value };
      }
    }
  }
  return null;
}

export function findHiddenSingle(
  board: (number | null)[][],
  candidates: Set<number>[][]
): { cell: CellPosition; value: number; reason: string } | null {
  for (let num = 1; num <= 9; num++) {
    for (let row = 0; row < 9; row++) {
      let count = 0;
      let lastCol = -1;
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === null && candidates[row][col].has(num)) {
          count++;
          lastCol = col;
        }
      }
      if (count === 1 && lastCol >= 0) {
        return { cell: { row, col: lastCol }, value: num, reason: `第${row + 1}行唯一候选` };
      }
    }
    
    for (let col = 0; col < 9; col++) {
      let count = 0;
      let lastRow = -1;
      for (let row = 0; row < 9; row++) {
        if (board[row][col] === null && candidates[row][col].has(num)) {
          count++;
          lastRow = row;
        }
      }
      if (count === 1 && lastRow >= 0) {
        return { cell: { row: lastRow, col }, value: num, reason: `第${col + 1}列唯一候选` };
      }
    }
    
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        let count = 0;
        let lastCell: CellPosition | null = null;
        const cells = getBoxCells(boxRow, boxCol);
        for (const cell of cells) {
          if (board[cell.row][cell.col] === null && candidates[cell.row][cell.col].has(num)) {
            count++;
            lastCell = cell;
          }
        }
        if (count === 1 && lastCell) {
          return { cell: lastCell, value: num, reason: `第${boxRow * 3 + 1}-${boxRow * 3 + 3}行${boxCol * 3 + 1}-${boxCol * 3 + 3}列宫格唯一候选` };
        }
      }
    }
  }
  return null;
}

export function applyStep(
  puzzle: SudokuPuzzle,
  row: number,
  col: number,
  value: number,
  reasoning: string = ''
): { puzzle: SudokuPuzzle; step: SolutionStep } {
  const newBoard = cloneBoard(puzzle.board);
  const newCandidates = cloneCandidates(puzzle.candidates);
  
  newBoard[row][col] = value;
  
  for (let c = 0; c < 9; c++) {
    newCandidates[row][c].delete(value);
  }
  for (let r = 0; r < 9; r++) {
    newCandidates[r][col].delete(value);
  }
  const { boxRow, boxCol } = getCellBox(row, col);
  for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
    for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
      newCandidates[r][c].delete(value);
    }
  }
  
  const stepId = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const step: SolutionStep = {
    id: stepId,
    puzzleId: puzzle.id,
    stepNumber: 0,
    board: newBoard,
    candidates: newCandidates,
    action: 'fill',
    row,
    col,
    value,
    reasoning,
  };
  
  const newPuzzle: SudokuPuzzle = {
    ...puzzle,
    board: newBoard,
    candidates: newCandidates,
  };
  
  return { puzzle: newPuzzle, step };
}

export function parseBoardFromString(input: string): (number | null)[][] {
  const board = createEmptyBoard();
  const cleanInput = input.replace(/\s/g, '');
  let index = 0;
  
  for (let row = 0; row < 9 && index < cleanInput.length; row++) {
    for (let col = 0; col < 9 && index < cleanInput.length; col++) {
      const char = cleanInput[index];
      if (char >= '1' && char <= '9') {
        board[row][col] = parseInt(char, 10);
      }
      index++;
    }
  }
  
  return board;
}

export function boardToString(board: (number | null)[][]): string {
  return board.flat().map(cell => cell?.toString() || '.').join('');
}
