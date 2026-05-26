import type { Submarine, Point } from '../types/game';
import { isValidPosition } from './gridUtils';

export function createSubmarine(
  startPosition: Point,
  speed: number = 1
): Submarine {
  const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
  const initialDirection = directions[Math.floor(Math.random() * directions.length)];
  
  return {
    id: `submarine-${Date.now()}`,
    position: { ...startPosition },
    direction: initialDirection,
    speed,
    trajectory: [{ ...startPosition }],
    isTurning: false
  };
}

export function moveSubmarine(
  submarine: Submarine,
  gridSize: number,
  turnProbability: number
): Submarine {
  const newTrajectory = [...submarine.trajectory, submarine.position];
  
  const shouldTurn = Math.random() < turnProbability;
  let newDirection = submarine.direction;
  
  if (shouldTurn) {
    const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
    const otherDirections = directions.filter(d => d !== submarine.direction);
    newDirection = otherDirections[Math.floor(Math.random() * otherDirections.length)];
  }
  
  let newX = submarine.position.x;
  let newY = submarine.position.y;
  
  for (let i = 0; i < submarine.speed; i++) {
    const testX = newX;
    const testY = newY;
    
    switch (newDirection) {
      case 'up': newY = Math.max(0, newY - 1); break;
      case 'down': newY = Math.min(gridSize - 1, newY + 1); break;
      case 'left': newX = Math.max(0, newX - 1); break;
      case 'right': newX = Math.min(gridSize - 1, newX + 1); break;
    }
    
    if (!isValidPosition({ x: newX, y: newY }, gridSize)) {
      newX = testX;
      newY = testY;
      const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
      newDirection = directions[Math.floor(Math.random() * directions.length)];
    }
  }
  
  return {
    ...submarine,
    position: { x: newX, y: newY },
    direction: newDirection,
    trajectory: newTrajectory,
    isTurning: shouldTurn
  };
}

export function getDirectionArrow(direction: string): string {
  switch (direction) {
    case 'up': return '↑';
    case 'down': return '↓';
    case 'left': return '←';
    case 'right': return '→';
    default: return '•';
  }
}

export function getDirectionName(direction: string): string {
  switch (direction) {
    case 'up': return '北';
    case 'down': return '南';
    case 'left': return '西';
    case 'right': return '东';
    default: return '未知';
  }
}

export function predictNextPosition(
  submarine: Submarine,
  gridSize: number
): Point {
  let newX = submarine.position.x;
  let newY = submarine.position.y;
  
  for (let i = 0; i < submarine.speed; i++) {
    switch (submarine.direction) {
      case 'up': newY = Math.max(0, newY - 1); break;
      case 'down': newY = Math.min(gridSize - 1, newY + 1); break;
      case 'left': newX = Math.max(0, newX - 1); break;
      case 'right': newX = Math.min(gridSize - 1, newX + 1); break;
    }
  }
  
  return { x: newX, y: newY };
}

export function analyzeTrajectoryPattern(trajectory: Point[]): {
  directionChanges: number;
  avgSpeed: number;
  pattern: 'linear' | 'zigzag' | 'circular' | 'random';
} {
  if (trajectory.length < 3) {
    return { directionChanges: 0, avgSpeed: 1, pattern: 'linear' };
  }
  
  let directionChanges = 0;
  let totalDistance = 0;
  const directions: string[] = [];
  
  for (let i = 1; i < trajectory.length; i++) {
    const prev = trajectory[i - 1];
    const curr = trajectory[i];
    
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    
    totalDistance += Math.abs(dx) + Math.abs(dy);
    
    let direction = '';
    if (dy < 0) direction = 'up';
    else if (dy > 0) direction = 'down';
    else if (dx < 0) direction = 'left';
    else if (dx > 0) direction = 'right';
    
    if (direction) {
      directions.push(direction);
    }
  }
  
  for (let i = 1; i < directions.length; i++) {
    if (directions[i] !== directions[i - 1]) {
      directionChanges++;
    }
  }
  
  const avgSpeed = totalDistance / (trajectory.length - 1);
  
  let pattern: 'linear' | 'zigzag' | 'circular' | 'random' = 'linear';
  const changeRate = directionChanges / directions.length;
  
  if (changeRate === 0) pattern = 'linear';
  else if (changeRate < 0.2) pattern = 'linear';
  else if (changeRate < 0.5) pattern = 'zigzag';
  else pattern = 'random';
  
  return { directionChanges, avgSpeed, pattern };
}
