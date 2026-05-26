import { Baggage, ExitType, ErrorType, ActionRecord } from '../types';
import { determineCorrectExit } from './baggageGenerator';
import { ERROR_MESSAGES } from '../types';

export function calculateScore(
  baggage: Baggage,
  selectedExit: ExitType,
  responseTime: number,
  currentCombo: number
): { score: number; errorType: ErrorType; correctExit: ExitType } {
  const correctExit = determineCorrectExit(baggage);
  
  if (selectedExit === correctExit) {
    let score = 10;
    if (responseTime < 3000) score += 2;
    if (currentCombo >= 5) score += 5;
    if (currentCombo >= 10) score += 15;
    if (currentCombo >= 20) score += 30;
    return { score, errorType: 'none', correctExit };
  } else {
    const errorType = determineErrorType(baggage, selectedExit, correctExit);
    const penalty = errorType !== 'none' ? ERROR_MESSAGES[errorType].penalty : 10;
    return { score: -penalty, errorType, correctExit };
  }
}

export function determineErrorType(
  baggage: Baggage,
  selectedExit: ExitType,
  correctExit: ExitType
): ErrorType {
  if (baggage.isOversized && selectedExit !== 'oversized') {
    return 'oversized_wrong';
  }
  if (baggage.isDelayed && selectedExit !== 'delayed') {
    return 'delayed_wrong';
  }
  if (baggage.isTransfer && baggage.transferTime && baggage.transferTime < 30 && selectedExit !== 'transfer_urgent') {
    return 'transfer_timeout';
  }
  if (baggage.isTransfer && baggage.transferTime && baggage.transferTime >= 30 && selectedExit !== 'transfer_normal') {
    return 'gate_wrong';
  }
  if (!baggage.isOversized && !baggage.isDelayed && !baggage.isTransfer && selectedExit !== correctExit) {
    return 'gate_wrong';
  }
  return 'gate_wrong';
}

export function calculateStarRating(accuracy: number): number {
  if (accuracy >= 95) return 3;
  if (accuracy >= 85) return 2;
  if (accuracy >= 70) return 1;
  return 0;
}

export function calculateAccuracy(correctCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.round((correctCount / totalCount) * 100);
}

export function createActionRecord(
  baggage: Baggage,
  selectedExit: ExitType,
  scoreChange: number,
  errorType: ErrorType,
  correctExit: ExitType,
  startTime: number
): ActionRecord {
  return {
    timestamp: Date.now(),
    baggageId: baggage.id,
    flightNo: baggage.flightNo,
    selectedExit,
    correctExit,
    errorType,
    scoreChange,
    responseTime: Date.now() - startTime,
    baggageInfo: {
      weight: baggage.weight,
      isTransfer: baggage.isTransfer,
      transferTime: baggage.transferTime,
      isDelayed: baggage.isDelayed,
      gate: baggage.gate,
      destination: baggage.destination,
    },
  };
}
