import { Position } from '@/types';
import { isSamePosition } from './gridUtils';

export const doPathsCross = (
  path1: Position[],
  path2: Position[]
): Position[] => {
  const crossings: Position[] = [];
  
  for (const pos1 of path1) {
    for (const pos2 of path2) {
      if (isSamePosition(pos1, pos2)) {
        const isEndpoint1 = 
          isSamePosition(pos1, path1[0]) || 
          isSamePosition(pos1, path1[path1.length - 1]);
        const isEndpoint2 = 
          isSamePosition(pos2, path2[0]) || 
          isSamePosition(pos2, path2[path2.length - 1]);
        
        if (!isEndpoint1 || !isEndpoint2) {
          if (!crossings.some(c => isSamePosition(c, pos1))) {
            crossings.push(pos1);
          }
        }
      }
    }
  }
  
  return crossings;
};

export const doesPathPassThroughPositions = (
  path: Position[],
  positions: Position[]
): Position[] => {
  const intersections: Position[] = [];
  
  for (const pathPos of path) {
    for (const checkPos of positions) {
      if (isSamePosition(pathPos, checkPos)) {
        if (!intersections.some(p => isSamePosition(p, pathPos))) {
          intersections.push(pathPos);
        }
      }
    }
  }
  
  return intersections;
};

export const getPathLength = (path: Position[]): number => {
  return path.length - 1;
};

export const simplifyPath = (path: Position[]): Position[] => {
  if (path.length <= 2) return path;
  
  const simplified: Position[] = [path[0]];
  
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];
    
    const sameRow = prev.y === curr.y && curr.y === next.y;
    const sameCol = prev.x === curr.x && curr.x === next.x;
    
    if (!sameRow && !sameCol) {
      simplified.push(curr);
    }
  }
  
  simplified.push(path[path.length - 1]);
  return simplified;
};

export const isPathClosed = (path: Position[]): boolean => {
  if (path.length < 3) return false;
  return isSamePosition(path[0], path[path.length - 1]);
};
