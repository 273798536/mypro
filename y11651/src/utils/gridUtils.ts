import type { Cell, Point } from '../types/game';

export function createEmptyGrid(size: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let y = 0; y < size; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < size; x++) {
      row.push({
        x,
        y,
        scanned: false,
        echoStrength: 0,
        hasNoise: false,
        noiseLevel: 0,
        isTarget: false,
        marked: false
      });
    }
    grid.push(row);
  }
  return grid;
}

export function manhattanDistance(p1: Point, p2: Point): number {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

export function getCellsInRange(center: Point, range: number, gridSize: number): Point[] {
  const cells: Point[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (manhattanDistance(center, { x, y }) <= range) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

export function getAdjacentCells(point: Point, gridSize: number): Point[] {
  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 }
  ];
  
  return directions
    .map(d => ({ x: point.x + d.x, y: point.y + d.y }))
    .filter(p => p.x >= 0 && p.x < gridSize && p.y >= 0 && p.y < gridSize);
}

export function isValidPosition(point: Point, gridSize: number): boolean {
  return point.x >= 0 && point.x < gridSize && point.y >= 0 && point.y < gridSize;
}

export function getRandomPosition(gridSize: number, excludePositions: Point[] = []): Point {
  let position: Point;
  let attempts = 0;
  const maxAttempts = 100;
  
  do {
    position = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize)
    };
    attempts++;
  } while (
    excludePositions.some(p => p.x === position.x && p.y === position.y) &&
    attempts < maxAttempts
  );
  
  return position;
}

export function getScannedCount(grid: Cell[][]): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.scanned) count++;
    }
  }
  return count;
}

export function getMarkedCells(grid: Cell[][]): Point[] {
  const marked: Point[] = [];
  for (const row of grid) {
    for (const cell of row) {
      if (cell.marked) {
        marked.push({ x: cell.x, y: cell.y });
      }
    }
  }
  return marked;
}
