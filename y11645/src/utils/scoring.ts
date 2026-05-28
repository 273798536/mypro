import { Baggage, ExitType, ErrorType, ActionRecord, SourceType } from '../types';
import { determineCorrectExit } from './baggageGenerator';
import { ERROR_MESSAGES } from '../types';

export interface GateTraffic {
  exit: ExitType;
  timestamps: number[];
}

const CONGESTION_THRESHOLD = 3;
const CONGESTION_WINDOW_MS = 10000;

export function checkGateCongestion(
  selectedExit: ExitType,
  gateTraffic: GateTraffic[]
): boolean {
  const now = Date.now();
  const traffic = gateTraffic.find(t => t.exit === selectedExit);
  if (!traffic) return false;
  
  const recentCount = traffic.timestamps.filter(
    t => now - t <= CONGESTION_WINDOW_MS
  ).length;
  
  return recentCount >= CONGESTION_THRESHOLD;
}

export function updateGateTraffic(
  selectedExit: ExitType,
  gateTraffic: GateTraffic[]
): GateTraffic[] {
  const now = Date.now();
  const existing = gateTraffic.find(t => t.exit === selectedExit);
  
  if (existing) {
    return gateTraffic.map(t => 
      t.exit === selectedExit 
        ? { ...t, timestamps: [...t.timestamps.filter(ts => now - ts <= CONGESTION_WINDOW_MS), now] }
        : t
    );
  }
  
  return [...gateTraffic, { exit: selectedExit, timestamps: [now] }];
}

export function determineSource(baggage: Baggage, selectedExit: ExitType): SourceType {
  if (baggage.isOversized) return 'oversized_label';
  if (baggage.isTransfer && baggage.transferTime && baggage.transferTime < 30) return 'transfer_timer';
  if (baggage.isTransfer) return 'transfer_timer';
  if (baggage.isDelayed) return 'sorting_report';
  if (selectedExit.startsWith('gate_')) return 'gate_info';
  return 'baggage_tag';
}

export function calculateScore(
  baggage: Baggage,
  selectedExit: ExitType,
  responseTime: number,
  currentCombo: number,
  gateTraffic: GateTraffic[]
): { score: number; errorType: ErrorType; correctExit: ExitType; isCongested: boolean } {
  const correctExit = determineCorrectExit(baggage);
  const isCongested = checkGateCongestion(selectedExit, gateTraffic);
  
  if (isCongested) {
    return { score: -ERROR_MESSAGES.gate_congested.penalty, errorType: 'gate_congested', correctExit, isCongested: true };
  }
  
  if (selectedExit === correctExit) {
    let score = 10;
    if (responseTime < 3000) score += 2;
    if (currentCombo >= 5) score += 5;
    if (currentCombo >= 10) score += 15;
    if (currentCombo >= 20) score += 30;
    return { score, errorType: 'none', correctExit, isCongested: false };
  } else {
    const errorType = determineErrorType(baggage, selectedExit, correctExit);
    const penalty = errorType !== 'none' ? ERROR_MESSAGES[errorType].penalty : 10;
    return { score: -penalty, errorType, correctExit, isCongested: false };
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
  startTime: number,
  source: SourceType = 'baggage_tag',
  correctionTrail: CorrectionEntry[] = []
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
    source,
    correctionTrail,
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

export interface CorrectionEntry {
  timestamp: number;
  field: string;
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
  reason: string;
  source: SourceType;
}

export function addCorrection(
  record: ActionRecord,
  field: string,
  oldValue: string | number | boolean,
  newValue: string | number | boolean,
  reason: string,
  source: SourceType
): ActionRecord {
  return {
    ...record,
    correctionTrail: [
      ...record.correctionTrail,
      {
        timestamp: Date.now(),
        field,
        oldValue,
        newValue,
        reason,
        source,
      },
    ],
  };
}
