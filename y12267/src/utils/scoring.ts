import { Score, PlacedDefect, Violation } from '../types/game';
import { GAME_CONFIG } from '../data/gameConfig';

export function calculateBaseScore(placedDefects: PlacedDefect[]): number {
  return placedDefects.reduce((total, defect) => {
    const card = GAME_CONFIG;
    const energyMap: Record<string, number> = {
      vacancy: 10,
      interstitial: 15,
      dislocation: 25,
      grain_boundary: 40,
    };
    return total + (energyMap[defect.type] || 0);
  }, 0);
}

export function calculateBonusScore(consecutiveSuccess: number): number {
  let bonus = 0;
  if (consecutiveSuccess >= GAME_CONFIG.comboBonusThreshold) {
    bonus += GAME_CONFIG.comboBonusAmount;
  }
  bonus += Math.floor(consecutiveSuccess / 2) * GAME_CONFIG.bonusPerConsecutive;
  return bonus;
}

export function calculatePenalty(violations: Violation[]): number {
  return violations.length * GAME_CONFIG.penaltyPerViolation;
}

export function calculateTotalScore(
  base: number,
  bonus: number,
  penalty: number
): number {
  return base + bonus - penalty;
}

export function calculateFullScore(
  placedDefects: PlacedDefect[],
  violations: Violation[],
  consecutiveSuccess: number
): Score {
  const base = calculateBaseScore(placedDefects);
  const bonus = calculateBonusScore(consecutiveSuccess);
  const penalty = calculatePenalty(violations);
  const total = calculateTotalScore(base, bonus, penalty);

  return { base, bonus, penalty, total };
}
