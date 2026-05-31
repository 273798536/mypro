import {
  GameState,
  DefectCard,
  GridPosition,
  ValidationResult,
  Violation,
  PlacedDefect,
} from '../types/game';
import { VIOLATION_RULES } from '../data/gameConfig';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function getDefectNameCn(type: string): string {
  const names: Record<string, string> = {
    vacancy: '空位',
    interstitial: '间隙原子',
    dislocation: '位错',
    grain_boundary: '晶界',
  };
  return names[type] || type;
}

function isAdjacent(pos1: GridPosition, pos2: GridPosition): boolean {
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

function hasAdjacentDefect(
  position: GridPosition,
  placedDefects: PlacedDefect[]
): boolean {
  return placedDefects.some((defect) => isAdjacent(position, defect.position));
}

export function validateBoundary(
  position: GridPosition,
  gameState: GameState
): ValidationResult {
  const { width, height } = gameState.gridSize;
  if (
    position.x < 0 ||
    position.x >= width ||
    position.y < 0 ||
    position.y >= height
  ) {
    const violation: Violation = {
      id: generateId(),
      type: 'boundary',
      position,
      message: `位置 (${position.x}, ${position.y}) 超出晶格边界，晶格范围为 (0-${width - 1}, 0-${height - 1})`,
      ruleBroken: VIOLATION_RULES.boundary.name,
      timestamp: Date.now(),
    };
    return { valid: false, violation };
  }
  return { valid: true };
}

export function validateEnergy(
  card: DefectCard,
  gameState: GameState
): ValidationResult {
  if (gameState.currentEnergy < card.energyCost) {
    const violation: Violation = {
      id: generateId(),
      type: 'energy',
      defectType: card.type,
      message: `能量不足，${card.material}的${card.nameCn}需要 ${card.energyCost} 能量，当前剩余 ${gameState.currentEnergy}`,
      ruleBroken: VIOLATION_RULES.energy.name,
      timestamp: Date.now(),
    };
    return { valid: false, violation };
  }
  return { valid: true };
}

export function validateOverlap(
  position: GridPosition,
  gameState: GameState,
  card: DefectCard
): ValidationResult {
  const existingDefect = gameState.placedDefects.find(
    (d) => d.position.x === position.x && d.position.y === position.y
  );
  if (existingDefect) {
    const violation: Violation = {
      id: generateId(),
      type: 'overlap',
      position,
      defectType: card.type,
      message: `该位置 (${position.x}, ${position.y}) 已存在${getDefectNameCn(existingDefect.type)}，无法叠加${card.material}的${card.nameCn}`,
      ruleBroken: VIOLATION_RULES.overlap.name,
      timestamp: Date.now(),
    };
    return { valid: false, violation };
  }
  return { valid: true };
}

export function validateAdjacency(
  position: GridPosition,
  card: DefectCard,
  gameState: GameState
): ValidationResult {
  if (card.type === 'dislocation' && gameState.placedDefects.length > 0) {
    if (!hasAdjacentDefect(position, gameState.placedDefects)) {
      const violation: Violation = {
        id: generateId(),
        type: 'adjacency',
        position,
        defectType: card.type,
        message: `${card.material}的位错需要邻接已有缺陷，位置 (${position.x}, ${position.y}) 周围没有其他缺陷`,
        ruleBroken: VIOLATION_RULES.adjacency.name,
        timestamp: Date.now(),
      };
      return { valid: false, violation };
    }
  }
  return { valid: true };
}

export function validateAllRules(
  position: GridPosition,
  card: DefectCard,
  gameState: GameState
): ValidationResult {
  const boundaryResult = validateBoundary(position, gameState);
  if (!boundaryResult.valid) return boundaryResult;

  const energyResult = validateEnergy(card, gameState);
  if (!energyResult.valid) return energyResult;

  const overlapResult = validateOverlap(position, gameState, card);
  if (!overlapResult.valid) return overlapResult;

  const adjacencyResult = validateAdjacency(position, card, gameState);
  if (!adjacencyResult.valid) return adjacencyResult;

  return { valid: true };
}
