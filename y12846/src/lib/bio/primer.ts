import type {
  Primer,
  PrimerPair,
  CoverageRegion,
  ReferenceSequence,
  AnalysisConfig,
  AnomalyRecord,
} from '../utils/types';
import {
  toUpperCase,
  calculateGCContent,
  hasAmbiguousBases,
  getAmbiguityPositions,
  reverseComplement,
  validateSequence,
} from '../utils/sequence';
import {
  generatePrimerFingerprint,
  generatePrimerPairFingerprint,
  generateUniqueId,
  deduplicateByKey,
  DedupResult,
} from '../utils/hash';
import { calculateTm, checkTmRange } from './tm';
import { alignPrimer, detectReversedPrimer } from './alignment';

export interface PrimerBindingSite {
  start: number;
  end: number;
  strand: 'forward' | 'reverse';
  score: number;
  mismatches: number;
}

export function createPrimer(
  sequence: string,
  direction: 'forward' | 'reverse',
  name: string,
  reference?: ReferenceSequence,
  config?: Partial<AnalysisConfig>
): Primer {
  const upperSeq = toUpperCase(sequence);
  if (direction !== 'forward' && direction !== 'reverse') {
    throw new Error('Direction must be "forward" or "reverse"');
  }
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('Primer name must be a non-empty string');
  }
  const length = upperSeq.length;
  const tm = calculateTm(upperSeq);
  const gcContent = calculateGCContent(upperSeq);
  const hasAmbiguity = hasAmbiguousBases(upperSeq);
  const ambiguityPositions = hasAmbiguity ? getAmbiguityPositions(upperSeq) : undefined;
  let bindingStart = -1;
  let bindingEnd = -1;
  let isReversed = false;
  if (reference) {
    let seqToAlign = upperSeq;
    if (direction === 'reverse') {
      seqToAlign = reverseComplement(upperSeq);
    }
    const reverseDetection = detectReversedPrimer(upperSeq, reference.sequence);
    isReversed = reverseDetection.isReversed;
    const alignment = alignPrimer(seqToAlign, reference.sequence);
    if (alignment.score > 0) {
      bindingStart = alignment.start;
      bindingEnd = alignment.end;
    }
  }
  const id = generatePrimerFingerprint({
    name,
    sequence: upperSeq,
    direction,
  });
  return {
    id,
    sequence: upperSeq,
    direction,
    length,
    tm,
    gcContent,
    hasAmbiguity,
    ambiguityPositions,
    isReversed,
    bindingStart,
    bindingEnd,
  };
}

export function createPrimerPair(
  name: string,
  forwardSequence: string,
  reverseSequence: string,
  reference?: ReferenceSequence,
  config?: Partial<AnalysisConfig>,
  batch?: string
): PrimerPair {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('Primer pair name must be a non-empty string');
  }
  const forward = createPrimer(forwardSequence, 'forward', name, reference, config);
  const reverse = createPrimer(reverseSequence, 'reverse', name, reference, config);
  const importHash = generatePrimerPairFingerprint(
    { name, sequence: forwardSequence, direction: 'forward', batch },
    { name, sequence: reverseSequence, direction: 'reverse', batch },
    name,
    batch
  );
  let ampliconStart = -1;
  let ampliconEnd = -1;
  let productSize = -1;
  if (
    forward.bindingStart !== -1 &&
    reverse.bindingStart !== -1 &&
    reference
  ) {
    const fStart = forward.bindingStart;
    const fEnd = forward.bindingEnd;
    const rStart = reverse.bindingStart;
    const rEnd = reverse.bindingEnd;
    if (fStart <= rEnd) {
      ampliconStart = fStart;
      ampliconEnd = rEnd;
      productSize = rEnd - fStart;
    } else {
      ampliconStart = rStart;
      ampliconEnd = fEnd;
      productSize = fEnd - rStart;
    }
  }
  let status: PrimerPair['status'] = 'valid';
  const anomalies = validatePrimerPair(forward, reverse, config);
  if (anomalies.some((a) => a.severity === 'error')) {
    status = 'invalid';
  } else if (anomalies.some((a) => a.severity === 'warning')) {
    status = 'warning';
  } else if (anomalies.length > 0) {
    status = 'needs_review';
  }
  return {
    id: generateUniqueId('pp'),
    name,
    batch,
    forward,
    reverse,
    productSize,
    ampliconStart,
    ampliconEnd,
    status,
    importHash,
  };
}

export function validatePrimerPair(
  forward: Primer,
  reverse: Primer,
  config?: Partial<AnalysisConfig>
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  const minTm = config?.minTm ?? 55;
  const maxTm = config?.maxTm ?? 65;
  const forwardTmCheck = checkTmRange(forward.tm, minTm, maxTm);
  const reverseTmCheck = checkTmRange(reverse.tm, minTm, maxTm);
  if (!forwardTmCheck.isInRange) {
    anomalies.push({
      id: generateUniqueId('an'),
      type: 'out_of_range_tm',
      severity: forwardTmCheck.deviation > 5 ? 'error' : 'warning',
      primerId: forward.id,
      message: `Forward primer Tm (${forward.tm.toFixed(1)}°C) outside range [${minTm}-${maxTm}°C]`,
      suggestion: 'Consider redesigning the forward primer to optimize Tm value',
    });
  }
  if (!reverseTmCheck.isInRange) {
    anomalies.push({
      id: generateUniqueId('an'),
      type: 'out_of_range_tm',
      severity: reverseTmCheck.deviation > 5 ? 'error' : 'warning',
      primerId: reverse.id,
      message: `Reverse primer Tm (${reverse.tm.toFixed(1)}°C) outside range [${minTm}-${maxTm}°C]`,
      suggestion: 'Consider redesigning the reverse primer to optimize Tm value',
    });
  }
  if (forward.isReversed || reverse.isReversed) {
    anomalies.push({
      id: generateUniqueId('an'),
      type: 'reversed_primer',
      severity: 'warning',
      primerId: forward.isReversed ? forward.id : reverse.id,
      message: `${forward.isReversed ? 'Forward' : 'Reverse'} primer appears to be reversed`,
      suggestion: 'Check primer orientation and provide reverse complement if needed',
    });
  }
  if (forward.hasAmbiguity) {
    anomalies.push({
      id: generateUniqueId('an'),
      type: 'ambiguity_base',
      severity: 'warning',
      primerId: forward.id,
      message: `Forward primer contains ${forward.ambiguityPositions?.length ?? 0} ambiguous bases`,
      suggestion: 'Consider replacing ambiguous bases with specific nucleotides if possible',
    });
  }
  if (reverse.hasAmbiguity) {
    anomalies.push({
      id: generateUniqueId('an'),
      type: 'ambiguity_base',
      severity: 'warning',
      primerId: reverse.id,
      message: `Reverse primer contains ${reverse.ambiguityPositions?.length ?? 0} ambiguous bases`,
      suggestion: 'Consider replacing ambiguous bases with specific nucleotides if possible',
    });
  }
  return anomalies;
}

export function findPrimerBindingSites(
  primer: string,
  reference: ReferenceSequence,
  direction: 'forward' | 'reverse',
  maxMismatches: number = 3
): PrimerBindingSite[] {
  const upperPrimer = toUpperCase(primer);
  validateSequence(reference.sequence);
  const sites: PrimerBindingSite[] = [];
  let seqToAlign = upperPrimer;
  if (direction === 'reverse') {
    seqToAlign = reverseComplement(upperPrimer);
  }
  const alignment = alignPrimer(seqToAlign, reference.sequence);
  if (alignment.score > 0 && alignment.mismatches <= maxMismatches) {
    sites.push({
      start: alignment.start,
      end: alignment.end,
      strand: direction,
      score: alignment.score,
      mismatches: alignment.mismatches,
    });
  }
  return sites;
}

export function calculateCoverage(
  primerPairs: PrimerPair[],
  reference: ReferenceSequence,
  windowSize: number = 100
): CoverageRegion[] {
  if (!Array.isArray(primerPairs)) {
    throw new Error('primerPairs must be an array');
  }
  if (!reference || typeof reference.sequence !== 'string') {
    throw new Error('Invalid reference sequence');
  }
  if (windowSize < 10) {
    throw new Error('Window size must be at least 10 bases');
  }
  const refLength = reference.sequence.length;
  const coverage = new Array(refLength).fill(0);
  const primerPairCoverage: string[][] = Array.from({ length: refLength }, () => []);
  for (const pair of primerPairs) {
    if (pair.ampliconStart === -1 || pair.ampliconEnd === -1) {
      continue;
    }
    const start = Math.max(0, pair.ampliconStart);
    const end = Math.min(refLength, pair.ampliconEnd);
    for (let i = start; i < end; i++) {
      coverage[i]++;
      if (!primerPairCoverage[i].includes(pair.id)) {
        primerPairCoverage[i].push(pair.id);
      }
    }
  }
  const regions: CoverageRegion[] = [];
  let regionStart = 0;
  let currentDepth = coverage[0];
  let currentPairs = [...primerPairCoverage[0]];
  for (let i = 1; i <= refLength; i++) {
    const depth = i < refLength ? coverage[i] : -1;
    const pairs = i < refLength ? primerPairCoverage[i] : [];
    const depthChanged = depth !== currentDepth;
    const pairsChanged = JSON.stringify([...pairs].sort()) !== JSON.stringify([...currentPairs].sort());
    if (depthChanged || pairsChanged || i === refLength) {
      const isGap = currentDepth === 0;
      regions.push({
        start: regionStart,
        end: i,
        primerPairIds: [...new Set(currentPairs)],
        coverageDepth: currentDepth,
        isGap,
      });
      if (i < refLength) {
        regionStart = i;
        currentDepth = depth;
        currentPairs = [...pairs];
      }
    }
  }
  const mergedRegions: CoverageRegion[] = [];
  let currentRegion: CoverageRegion | null = null;
  for (const region of regions) {
    if (
      currentRegion &&
      currentRegion.isGap === region.isGap &&
      currentRegion.coverageDepth === region.coverageDepth
    ) {
      currentRegion.end = region.end;
      currentRegion.primerPairIds = [
        ...new Set([...currentRegion.primerPairIds, ...region.primerPairIds]),
      ];
    } else {
      if (currentRegion) {
        mergedRegions.push(currentRegion);
      }
      currentRegion = { ...region };
    }
  }
  if (currentRegion) {
    mergedRegions.push(currentRegion);
  }
  return mergedRegions;
}

export function calculateCoveragePercent(
  coverage: CoverageRegion[],
  referenceLength: number
): number {
  if (referenceLength <= 0) {
    return 0;
  }
  let coveredBases = 0;
  for (const region of coverage) {
    if (!region.isGap) {
      coveredBases += region.end - region.start;
    }
  }
  return coveredBases / referenceLength;
}

export function deduplicatePrimerPairs(primerPairs: PrimerPair[]): DedupResult<PrimerPair> {
  return deduplicateByKey(primerPairs, (pair) => pair.importHash);
}

export function validatePrimerSequence(sequence: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  try {
    if (typeof sequence !== 'string' || sequence.trim() === '') {
      errors.push('Sequence is empty');
      return { valid: false, errors };
    }
    const upperSeq = toUpperCase(sequence);
    if (upperSeq.length < 10) {
      errors.push('Sequence is too short (minimum 10 bases recommended)');
    }
    if (upperSeq.length > 50) {
      errors.push('Sequence is too long (maximum 50 bases recommended)');
    }
    const gcContent = calculateGCContent(upperSeq);
    if (gcContent < 0.3) {
      errors.push('GC content is too low (< 30%)');
    }
    if (gcContent > 0.7) {
      errors.push('GC content is too high (> 70%)');
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getPrimerPairProductSize(
  forward: Primer,
  reverse: Primer,
  reference: ReferenceSequence
): number {
  if (forward.bindingStart === -1 || reverse.bindingStart === -1) {
    return -1;
  }
  const fEnd = forward.bindingEnd;
  const rStart = reverse.bindingStart;
  if (fEnd <= rStart) {
    return rStart - fEnd;
  }
  const rEnd = reverse.bindingEnd;
  const fStart = forward.bindingStart;
  if (rEnd <= fStart) {
    return fStart - rEnd;
  }
  return Math.abs(forward.bindingStart - reverse.bindingStart);
}
