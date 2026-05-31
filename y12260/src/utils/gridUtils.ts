import { Position } from '@/types';
import { DEVICES } from '@/data/devices';

export const isSamePosition = (a: Position, b: Position): boolean => {
  return a.x === b.x && a.y === b.y;
};

export const positionToKey = (pos: Position): string => `${pos.x},${pos.y}`;

export const keyToPosition = (key: string): Position => {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
};

export const getDeviceOccupiedCells = (
  position: Position,
  deviceType: string
): Position[] => {
  const device = DEVICES[deviceType as keyof typeof DEVICES];
  if (!device) return [position];
  
  const cells: Position[] = [];
  for (let dx = 0; dx < device.size.width; dx++) {
    for (let dy = 0; dy < device.size.height; dy++) {
      cells.push({ x: position.x + dx, y: position.y + dy });
    }
  }
  return cells;
};

export const isPositionInGrid = (
  pos: Position,
  gridSize: { width: number; height: number }
): boolean => {
  return pos.x >= 0 && pos.x < gridSize.width && pos.y >= 0 && pos.y < gridSize.height;
};

export const isPositionBlocked = (
  pos: Position,
  blockedAreas: Position[]
): boolean => {
  return blockedAreas.some(blocked => isSamePosition(blocked, pos));
};

export const getManhattanDistance = (a: Position, b: Position): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

export const getGridPath = (from: Position, to: Position): Position[] => {
  const path: Position[] = [];
  let current = { ...from };
  
  while (current.x !== to.x) {
    path.push({ ...current });
    current.x += to.x > current.x ? 1 : -1;
  }
  
  while (current.y !== to.y) {
    path.push({ ...current });
    current.y += to.y > current.y ? 1 : -1;
  }
  
  path.push({ ...to });
  return path;
};
