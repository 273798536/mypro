import type { NearestNeighborParams } from '../utils/types';
import { toUpperCase, calculateGCContent, countN } from '../utils/sequence';

const NEAREST_NEIGHBOR_DH: Record<string, number> = {
  AA: -7.9, TT: -7.9, AT: -7.2, TA: -7.2,
  CA: -8.5, TG: -8.5, GT: -8.4, AC: -8.4,
  CT: -7.8, AG: -7.8, GA: -8.2, TC: -8.2,
  CG: -10.6, GC: -9.8, GG: -8.0, CC: -8.0,
};

const NEAREST_NEIGHBOR_DS: Record<string, number> = {
  AA: -22.2, TT: -22.2, AT: -20.4, TA: -21.3,
  CA: -22.7, TG: -22.7, GT: -22.4, AC: -22.4,
  CT: -21.0, AG: -21.0, GA: -22.2, TC: -22.2,
  CG: -27.2, GC: -24.4, GG: -19.9, CC: -19.9,
};

const GAS_CONSTANT = 1.987;

function validatePrimerSequence(sequence: string): void {
  if (typeof sequence !== 'string') {
    throw new Error('Sequence must be a string');
  }
  if (sequence.length < 2) {
    throw new Error('Sequence must be at least 2 bases long for Tm calculation');
  }
  if (sequence.length > 100) {
    throw new Error('Sequence exceeds maximum recommended length (100 bases) for accurate Tm calculation');
  }
}

function getNearestNeighborKey(base1: string, base2: string): string | null {
  const key = base1 + base2;
  if (NEAREST_NEIGHBOR_DH[key] !== undefined) {
    return key;
  }
  return null;
}

export function calculateTmNearestNeighbor(
  sequence: string,
  params: Partial<NearestNeighborParams> = {}
): number {
  const upperSeq = toUpperCase(sequence);
  validatePrimerSequence(upperSeq);
  const oligoConcentration = params.oligoConcentration ?? 0.25;
  const sodiumConcentration = params.sodiumConcentration ?? 50;
  if (oligoConcentration <= 0) {
    throw new Error('Oligo concentration must be a positive number (μM)');
  }
  if (sodiumConcentration <= 0) {
    throw new Error('Sodium concentration must be a positive number (mM)');
  }
  let totalDH = 0;
  let totalDS = 0;
  let validPairs = 0;
  for (let i = 0; i < upperSeq.length - 1; i++) {
    const base1 = upperSeq[i];
    const base2 = upperSeq[i + 1];
    if (base1 === 'N' || base2 === 'N') {
      continue;
    }
    const key = getNearestNeighborKey(base1, base2);
    if (key !== null) {
      totalDH += NEAREST_NEIGHBOR_DH[key];
      totalDS += NEAREST_NEIGHBOR_DS[key];
      validPairs++;
    }
  }
  if (validPairs === 0) {
    return calculateTmGC(upperSeq, sodiumConcentration);
  }
  const initiationDH = 0.2;
  const initiationDS = -5.7;
  totalDH += initiationDH;
  totalDS += initiationDS;
  const ct = oligoConcentration * 1e-6;
  const logCt = Math.log(ct / 4);
  const tmKelvin = totalDH * 1000 / (totalDS + GAS_CONSTANT * logCt);
  let tmCelsius = tmKelvin - 273.15;
  const saltCorrection = 16.6 * Math.log10(sodiumConcentration / 1000);
  tmCelsius += saltCorrection;
  const nCount = countN(upperSeq);
  if (nCount > 0) {
    const nPenalty = nCount * 0.5;
    tmCelsius -= nPenalty;
  }
  return Math.round(tmCelsius * 100) / 100;
}

export function calculateTmGC(
  sequence: string,
  sodiumConcentration: number = 50
): number {
  const upperSeq = toUpperCase(sequence);
  validatePrimerSequence(upperSeq);
  if (sodiumConcentration <= 0) {
    throw new Error('Sodium concentration must be a positive number (mM)');
  }
  const gcContent = calculateGCContent(upperSeq);
  const length = upperSeq.length;
  const saltCorrection = 16.6 * Math.log10(sodiumConcentration / 1000);
  let tmCelsius: number;
  if (length < 14) {
    tmCelsius = 2 * (length - gcContent * length) + 4 * (gcContent * length);
  } else {
    tmCelsius = 64.9 + 41 * (gcContent * length - 16.4) / length;
  }
  tmCelsius += saltCorrection;
  const nCount = countN(upperSeq);
  if (nCount > 0) {
    const nPenalty = nCount * 0.5;
    tmCelsius -= nPenalty;
  }
  return Math.round(tmCelsius * 100) / 100;
}

export function calculateTm(
  sequence: string,
  params: Partial<NearestNeighborParams> = {},
  method: 'nearest_neighbor' | 'gc' = 'nearest_neighbor'
): number {
  const upperSeq = toUpperCase(sequence);
  validatePrimerSequence(upperSeq);
  const nCount = countN(upperSeq);
  const hasAmbiguity = nCount > 0;
  if (method === 'nearest_neighbor' && !hasAmbiguity) {
    try {
      return calculateTmNearestNeighbor(upperSeq, params);
    } catch {
      return calculateTmGC(upperSeq, params.sodiumConcentration);
    }
  }
  return calculateTmGC(upperSeq, params.sodiumConcentration);
}

export interface TmRangeCheck {
  tm: number;
  isInRange: boolean;
  minTm: number;
  maxTm: number;
  deviation: number;
}

export function checkTmRange(
  tm: number,
  minTm: number = 55,
  maxTm: number = 65
): TmRangeCheck {
  if (typeof tm !== 'number' || isNaN(tm) || !isFinite(tm)) {
    throw new Error('Tm value must be a valid finite number');
  }
  if (typeof minTm !== 'number' || isNaN(minTm)) {
    throw new Error('minTm must be a valid number');
  }
  if (typeof maxTm !== 'number' || isNaN(maxTm)) {
    throw new Error('maxTm must be a valid number');
  }
  if (minTm >= maxTm) {
    throw new Error('minTm must be less than maxTm');
  }
  const isInRange = tm >= minTm && tm <= maxTm;
  let deviation = 0;
  if (tm < minTm) {
    deviation = minTm - tm;
  } else if (tm > maxTm) {
    deviation = tm - maxTm;
  }
  return {
    tm,
    isInRange,
    minTm,
    maxTm,
    deviation: Math.round(deviation * 100) / 100,
  };
}

export function calculatePrimerPairTmDifference(
  forwardTm: number,
  reverseTm: number
): number {
  if (typeof forwardTm !== 'number' || isNaN(forwardTm) || !isFinite(forwardTm)) {
    throw new Error('Forward Tm value must be a valid finite number');
  }
  if (typeof reverseTm !== 'number' || isNaN(reverseTm) || !isFinite(reverseTm)) {
    throw new Error('Reverse Tm value must be a valid finite number');
  }
  return Math.round(Math.abs(forwardTm - reverseTm) * 100) / 100;
}
