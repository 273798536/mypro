import type {
  Mutation,
  MutationImpact,
  Primer,
  PrimerPair,
  SampleResult,
  AnalysisConfig,
} from '../utils/types';
import { toUpperCase, basesMatch, validateSequence } from '../utils/sequence';
import { generateUniqueId } from '../utils/hash';

const PURINES = new Set(['A', 'G']);
const PYRIMIDINES = new Set(['C', 'T', 'U']);

export interface ThreePrimeMismatchResult {
  isThreePrimeMismatch: boolean;
  distanceFromThreePrime: number;
  positionInPrimer: number;
}

export function isThreePrimeMismatch(
  mutationPosition: number,
  primer: Primer,
  criticalBases: number = 5
): ThreePrimeMismatchResult {
  if (!primer || primer.bindingStart === -1 || primer.bindingEnd === -1) {
    return {
      isThreePrimeMismatch: false,
      distanceFromThreePrime: -1,
      positionInPrimer: -1,
    };
  }
  if (typeof mutationPosition !== 'number' || mutationPosition < 0) {
    throw new Error('Mutation position must be a non-negative number');
  }
  if (criticalBases < 1) {
    throw new Error('criticalBases must be at least 1');
  }
  const primerStart = primer.bindingStart;
  const primerEnd = primer.bindingEnd;
  let threePrimePosition: number;
  let positionInPrimer: number;
  if (primer.direction === 'forward') {
    threePrimePosition = primerEnd - 1;
    positionInPrimer = mutationPosition - primerStart;
  } else {
    threePrimePosition = primerStart;
    positionInPrimer = primerEnd - 1 - mutationPosition;
  }
  const distanceFromThreePrime = Math.abs(mutationPosition - threePrimePosition);
  const isThreePrime = distanceFromThreePrime < criticalBases &&
    positionInPrimer >= 0 &&
    positionInPrimer < primer.length;
  return {
    isThreePrimeMismatch: isThreePrime,
    distanceFromThreePrime,
    positionInPrimer,
  };
}

export function isTransition(base1: string, base2: string): boolean {
  const b1 = toUpperCase(base1);
  const b2 = toUpperCase(base2);
  if (b1.length !== 1 || b2.length !== 1) {
    throw new Error('Both bases must be single characters');
  }
  return (PURINES.has(b1) && PURINES.has(b2)) ||
    (PYRIMIDINES.has(b1) && PYRIMIDINES.has(b2));
}

export function isTransversion(base1: string, base2: string): boolean {
  const b1 = toUpperCase(base1);
  const b2 = toUpperCase(base2);
  if (b1.length !== 1 || b2.length !== 1) {
    throw new Error('Both bases must be single characters');
  }
  return (PURINES.has(b1) && PYRIMIDINES.has(b2)) ||
    (PYRIMIDINES.has(b1) && PURINES.has(b2));
}

export function classifyMismatchLevel(
  distanceFromThreePrime: number,
  refBase: string,
  altBase: string,
  criticalBases: number = 5
): MutationImpact['mismatchLevel'] {
  if (distanceFromThreePrime < 0) {
    throw new Error('distanceFromThreePrime must be non-negative');
  }
  const isTransv = isTransversion(refBase, altBase);
  if (distanceFromThreePrime < criticalBases) {
    return 'critical';
  } else if (distanceFromThreePrime < criticalBases + 5) {
    return isTransv ? 'high' : 'medium';
  } else if (distanceFromThreePrime < 15) {
    return 'medium';
  } else {
    return isTransv ? 'medium' : 'low';
  }
}

export function getMutationRecommendation(
  mismatchLevel: MutationImpact['mismatchLevel'],
  isThreePrime: boolean
): MutationImpact['recommendation'] {
  if (isThreePrime && mismatchLevel === 'critical') {
    return 'replace';
  }
  switch (mismatchLevel) {
    case 'critical':
      return 'replace';
    case 'high':
      return 'caution';
    case 'medium':
      return 'caution';
    case 'low':
      return 'use';
    default:
      return 'use';
  }
}

export function evaluateMutationImpact(
  mutation: Mutation,
  primerPair: PrimerPair,
  config?: Partial<AnalysisConfig>
): MutationImpact | null {
  if (!mutation || !primerPair) {
    throw new Error('Both mutation and primerPair are required');
  }
  const criticalBases = config?.threePrimeCriticalBases ?? 5;
  const mutationPos = mutation.position - 1;
  const forwardPrimer = primerPair.forward;
  const reversePrimer = primerPair.reverse;
  let affectsForward = false;
  let affectsReverse = false;
  let forwardThreePrime: ThreePrimeMismatchResult | null = null;
  let reverseThreePrime: ThreePrimeMismatchResult | null = null;
  if (
    forwardPrimer.bindingStart !== -1 &&
    forwardPrimer.bindingEnd !== -1 &&
    mutationPos >= forwardPrimer.bindingStart &&
    mutationPos < forwardPrimer.bindingEnd
  ) {
    affectsForward = true;
    forwardThreePrime = isThreePrimeMismatch(mutationPos, forwardPrimer, criticalBases);
  }
  if (
    reversePrimer.bindingStart !== -1 &&
    reversePrimer.bindingEnd !== -1 &&
    mutationPos >= reversePrimer.bindingStart &&
    mutationPos < reversePrimer.bindingEnd
  ) {
    affectsReverse = true;
    reverseThreePrime = isThreePrimeMismatch(mutationPos, reversePrimer, criticalBases);
  }
  if (!affectsForward && !affectsReverse) {
    return null;
  }
  const isThreePrime = (forwardThreePrime?.isThreePrimeMismatch ?? false) ||
    (reverseThreePrime?.isThreePrimeMismatch ?? false);
  let minDistance = Infinity;
  if (forwardThreePrime && forwardThreePrime.distanceFromThreePrime >= 0) {
    minDistance = Math.min(minDistance, forwardThreePrime.distanceFromThreePrime);
  }
  if (reverseThreePrime && reverseThreePrime.distanceFromThreePrime >= 0) {
    minDistance = Math.min(minDistance, reverseThreePrime.distanceFromThreePrime);
  }
  const distanceFromThreePrime = minDistance === Infinity ? -1 : minDistance;
  const mismatchLevel = classifyMismatchLevel(
    distanceFromThreePrime >= 0 ? distanceFromThreePrime : 100,
    mutation.refBase,
    mutation.altBase,
    criticalBases
  );
  let affectedPrimer: MutationImpact['affectedPrimer'];
  if (affectsForward && affectsReverse) {
    affectedPrimer = 'both';
  } else if (affectsForward) {
    affectedPrimer = 'forward';
  } else {
    affectedPrimer = 'reverse';
  }
  const recommendation = getMutationRecommendation(mismatchLevel, isThreePrime);
  return {
    mutationId: mutation.id,
    primerPairId: primerPair.id,
    isThreePrimeMismatch: isThreePrime,
    distanceFromThreePrime,
    mismatchLevel,
    affectedPrimer,
    recommendation,
  };
}

export function evaluateAllMutations(
  mutations: Mutation[],
  primerPairs: PrimerPair[],
  config?: Partial<AnalysisConfig>
): MutationImpact[] {
  if (!Array.isArray(mutations)) {
    throw new Error('mutations must be an array');
  }
  if (!Array.isArray(primerPairs)) {
    throw new Error('primerPairs must be an array');
  }
  const impacts: MutationImpact[] = [];
  for (const mutation of mutations) {
    for (const primerPair of primerPairs) {
      const impact = evaluateMutationImpact(mutation, primerPair, config);
      if (impact !== null) {
        impacts.push(impact);
      }
    }
  }
  return impacts;
}

export function generateSampleResult(
  sampleId: string,
  sampleName: string,
  mutations: Mutation[],
  primerPairs: PrimerPair[],
  mutationImpacts: MutationImpact[],
  config?: Partial<AnalysisConfig>
): SampleResult {
  if (typeof sampleId !== 'string' || sampleId.trim() === '') {
    throw new Error('sampleId must be a non-empty string');
  }
  if (typeof sampleName !== 'string' || sampleName.trim() === '') {
    throw new Error('sampleName must be a non-empty string');
  }
  if (!Array.isArray(mutations)) {
    throw new Error('mutations must be an array');
  }
  if (!Array.isArray(primerPairs)) {
    throw new Error('primerPairs must be an array');
  }
  if (!Array.isArray(mutationImpacts)) {
    throw new Error('mutationImpacts must be an array');
  }
  const sampleMutations = mutations.filter((m) => m.sampleId === sampleId);
  const sampleImpacts = mutationImpacts.filter((impact) =>
    sampleMutations.some((m) => m.id === impact.mutationId)
  );
  const criticalMismatches = sampleImpacts.filter(
    (impact) => impact.mismatchLevel === 'critical'
  );
  const affectedPrimerPairIds = new Set(
    sampleImpacts
      .filter((impact) => impact.recommendation !== 'use')
      .map((impact) => impact.primerPairId)
  );
  const recommendedPrimerPairs = primerPairs
    .filter(
      (pair) =>
        !affectedPrimerPairIds.has(pair.id) &&
        (pair.status === 'valid' || pair.status === 'warning')
    )
    .map((pair) => pair.id);
  const needsAlternativePrimers = criticalMismatches.length > 0 ||
    recommendedPrimerPairs.length < primerPairs.length * 0.7;
  const notesParts: string[] = [];
  if (criticalMismatches.length > 0) {
    notesParts.push(
      `${criticalMismatches.length} critical 3' end mismatch(es) detected. `
    );
  }
  if (needsAlternativePrimers) {
    notesParts.push('Consider using alternative primer pairs.');
  }
  if (notesParts.length === 0) {
    notesParts.push('No critical issues detected. Primer pairs appear suitable.');
  }
  return {
    sampleId,
    sampleName,
    mutationCount: sampleMutations.length,
    criticalMismatches,
    recommendedPrimerPairs,
    needsAlternativePrimers,
    notes: notesParts.join(' '),
  };
}

export function generateAllSampleResults(
  mutations: Mutation[],
  primerPairs: PrimerPair[],
  mutationImpacts: MutationImpact[],
  config?: Partial<AnalysisConfig>
): SampleResult[] {
  if (!Array.isArray(mutations)) {
    throw new Error('mutations must be an array');
  }
  const sampleMap = new Map<string, string>();
  for (const mutation of mutations) {
    if (!sampleMap.has(mutation.sampleId)) {
      sampleMap.set(mutation.sampleId, mutation.sampleName);
    }
  }
  const results: SampleResult[] = [];
  for (const [sampleId, sampleName] of sampleMap) {
    results.push(
      generateSampleResult(
        sampleId,
        sampleName,
        mutations,
        primerPairs,
        mutationImpacts,
        config
      )
    );
  }
  return results;
}

export function validateMutation(mutation: Partial<Mutation>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (typeof mutation.sampleId !== 'string' || mutation.sampleId.trim() === '') {
    errors.push('sampleId is required');
  }
  if (typeof mutation.sampleName !== 'string' || mutation.sampleName.trim() === '') {
    errors.push('sampleName is required');
  }
  if (typeof mutation.position !== 'number' || mutation.position < 1) {
    errors.push('position must be a positive number (1-based)');
  }
  if (typeof mutation.refBase !== 'string') {
    errors.push('refBase is required');
  } else {
    try {
      validateSequence(mutation.refBase);
    } catch {
      errors.push('refBase contains invalid bases');
    }
  }
  if (typeof mutation.altBase !== 'string') {
    errors.push('altBase is required');
  } else {
    try {
      validateSequence(mutation.altBase);
    } catch {
      errors.push('altBase contains invalid bases');
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getMutationSeverityCount(impacts: MutationImpact[]): {
  critical: number;
  high: number;
  medium: number;
  low: number;
} {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const impact of impacts) {
    counts[impact.mismatchLevel]++;
  }
  return counts;
}
