import type { AlignmentResult } from '../utils/types';
import { toUpperCase, basesMatch, reverseComplement } from '../utils/sequence';

interface SmithWatermanConfig {
  matchScore: number;
  mismatchScore: number;
  gapScore: number;
  ambiguityPenalty: number;
}

const DEFAULT_SW_CONFIG: SmithWatermanConfig = {
  matchScore: 2,
  mismatchScore: -1,
  gapScore: -2,
  ambiguityPenalty: 0.5,
};

function validateAlignmentInput(query: string, target: string): void {
  if (typeof query !== 'string' || query.length === 0) {
    throw new Error('Query sequence must be a non-empty string');
  }
  if (typeof target !== 'string' || target.length === 0) {
    throw new Error('Target sequence must be a non-empty string');
  }
  if (query.length > 10000) {
    throw new Error('Query sequence too long for alignment (max 10000 bases)');
  }
  if (target.length > 100000) {
    throw new Error('Target sequence too long for alignment (max 100000 bases)');
  }
}

export function smithWaterman(
  query: string,
  target: string,
  config: Partial<SmithWatermanConfig> = {}
): AlignmentResult {
  const q = toUpperCase(query);
  const t = toUpperCase(target);
  validateAlignmentInput(q, t);
  const fullConfig = { ...DEFAULT_SW_CONFIG, ...config };
  const m = q.length;
  const n = t.length;
  const matrix: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  const traceback: ('stop' | 'match' | 'gap_q' | 'gap_t')[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill('stop' as const)
  );
  let maxScore = 0;
  let maxI = 0;
  let maxJ = 0;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const qBase = q[i - 1];
      const tBase = t[j - 1];
      let matchScore: number;
      if (qBase === 'N' || tBase === 'N') {
        matchScore = fullConfig.matchScore - fullConfig.ambiguityPenalty;
        traceback[i][j] = 'match';
      } else if (basesMatch(qBase, tBase, true)) {
        matchScore = fullConfig.matchScore;
        traceback[i][j] = 'match';
      } else {
        matchScore = fullConfig.mismatchScore;
        traceback[i][j] = 'match';
      }
      const diagonal = matrix[i - 1][j - 1] + matchScore;
      const up = matrix[i - 1][j] + fullConfig.gapScore;
      const left = matrix[i][j - 1] + fullConfig.gapScore;
      let score = Math.max(0, diagonal, up, left);
      if (score === up && up > diagonal) {
        traceback[i][j] = 'gap_q';
      } else if (score === left && left > diagonal) {
        traceback[i][j] = 'gap_t';
      }
      matrix[i][j] = score;
      if (score > maxScore) {
        maxScore = score;
        maxI = i;
        maxJ = j;
      }
    }
  }
  let alignedQuery = '';
  let alignedTarget = '';
  let matches = 0;
  let mismatches = 0;
  let gaps = 0;
  let i = maxI;
  let j = maxJ;
  while (i > 0 && j > 0 && matrix[i][j] > 0) {
    const dir = traceback[i][j];
    if (dir === 'match') {
      const qBase = q[i - 1];
      const tBase = t[j - 1];
      alignedQuery = qBase + alignedQuery;
      alignedTarget = tBase + alignedTarget;
      if (basesMatch(qBase, tBase, true)) {
        matches++;
      } else {
        mismatches++;
      }
      i--;
      j--;
    } else if (dir === 'gap_q') {
      alignedQuery = q[i - 1] + alignedQuery;
      alignedTarget = '-' + alignedTarget;
      gaps++;
      i--;
    } else if (dir === 'gap_t') {
      alignedQuery = '-' + alignedQuery;
      alignedTarget = t[j - 1] + alignedTarget;
      gaps++;
      j--;
    } else {
      break;
    }
  }
  const start = j;
  const end = maxJ;
  return {
    score: maxScore,
    start,
    end,
    matches,
    mismatches,
    gaps,
    alignedQuery,
    alignedTarget,
  };
}

export interface SeedExtensionResult extends AlignmentResult {
  seedStart: number;
  seedEnd: number;
  seedLength: number;
}

export function seedExtension(
  query: string,
  target: string,
  seedLength: number = 10,
  config: Partial<SmithWatermanConfig> = {}
): SeedExtensionResult | null {
  const q = toUpperCase(query);
  const t = toUpperCase(target);
  validateAlignmentInput(q, t);
  if (seedLength < 4) {
    throw new Error('Seed length must be at least 4 bases');
  }
  if (seedLength > q.length) {
    throw new Error('Seed length cannot exceed query sequence length');
  }
  let bestSeedStart = -1;
  let bestSeedTargetStart = -1;
  let bestScore = -1;
  for (let qs = 0; qs <= q.length - seedLength; qs++) {
    const seed = q.substring(qs, qs + seedLength);
    for (let ts = 0; ts <= t.length - seedLength; ts++) {
      let seedScore = 0;
      let exactMatch = true;
      for (let k = 0; k < seedLength; k++) {
        const qBase = seed[k];
        const tBase = t[ts + k];
        if (qBase === 'N' || tBase === 'N') {
          seedScore += 1;
          exactMatch = false;
        } else if (basesMatch(qBase, tBase, true)) {
          seedScore += 2;
        } else {
          exactMatch = false;
          break;
        }
      }
      if (exactMatch && seedScore > bestScore) {
        bestScore = seedScore;
        bestSeedStart = qs;
        bestSeedTargetStart = ts;
      }
    }
  }
  if (bestSeedStart === -1) {
    return null;
  }
  const fullConfig = { ...DEFAULT_SW_CONFIG, ...config };
  const leftQuery = q.substring(0, bestSeedStart);
  const leftTarget = t.substring(0, bestSeedTargetStart);
  const rightQuery = q.substring(bestSeedStart + seedLength);
  const rightTarget = t.substring(bestSeedTargetStart + seedLength);
  let leftExtension = 0;
  let leftMatches = 0;
  let leftMismatches = 0;
  let leftScore = 0;
  for (let k = 1; k <= Math.min(leftQuery.length, leftTarget.length); k++) {
    const qBase = leftQuery[leftQuery.length - k];
    const tBase = leftTarget[leftTarget.length - k];
    let baseScore: number;
    if (qBase === 'N' || tBase === 'N') {
      baseScore = fullConfig.matchScore - fullConfig.ambiguityPenalty;
      leftMatches++;
    } else if (basesMatch(qBase, tBase, true)) {
      baseScore = fullConfig.matchScore;
      leftMatches++;
    } else {
      baseScore = fullConfig.mismatchScore;
      leftMismatches++;
    }
    if (leftScore + baseScore < 0) {
      break;
    }
    leftScore += baseScore;
    leftExtension = k;
  }
  let rightExtension = 0;
  let rightMatches = 0;
  let rightMismatches = 0;
  let rightScore = 0;
  for (let k = 0; k < Math.min(rightQuery.length, rightTarget.length); k++) {
    const qBase = rightQuery[k];
    const tBase = rightTarget[k];
    let baseScore: number;
    if (qBase === 'N' || tBase === 'N') {
      baseScore = fullConfig.matchScore - fullConfig.ambiguityPenalty;
      rightMatches++;
    } else if (basesMatch(qBase, tBase, true)) {
      baseScore = fullConfig.matchScore;
      rightMatches++;
    } else {
      baseScore = fullConfig.mismatchScore;
      rightMismatches++;
    }
    if (rightScore + baseScore < 0) {
      break;
    }
    rightScore += baseScore;
    rightExtension = k + 1;
  }
  const alignedQuery =
    (leftExtension > 0 ? leftQuery.substring(leftQuery.length - leftExtension) : '') +
    q.substring(bestSeedStart, bestSeedStart + seedLength) +
    (rightExtension > 0 ? rightQuery.substring(0, rightExtension) : '');
  const alignedTarget =
    (leftExtension > 0 ? leftTarget.substring(leftTarget.length - leftExtension) : '') +
    t.substring(bestSeedTargetStart, bestSeedTargetStart + seedLength) +
    (rightExtension > 0 ? rightTarget.substring(0, rightExtension) : '');
  const totalMatches = leftMatches + seedLength + rightMatches;
  const totalMismatches = leftMismatches + rightMismatches;
  const totalScore = bestScore + leftScore + rightScore;
  const start = bestSeedTargetStart - leftExtension;
  const end = bestSeedTargetStart + seedLength + rightExtension;
  return {
    score: totalScore,
    start,
    end,
    matches: totalMatches,
    mismatches: totalMismatches,
    gaps: 0,
    alignedQuery,
    alignedTarget,
    seedStart: bestSeedStart,
    seedEnd: bestSeedStart + seedLength,
    seedLength,
  };
}

export interface ReversePrimerDetectionResult {
  isReversed: boolean;
  forwardAlignment: AlignmentResult | null;
  reverseAlignment: AlignmentResult | null;
  confidence: number;
}

export function detectReversedPrimer(
  primer: string,
  target: string,
  config: Partial<SmithWatermanConfig> = {}
): ReversePrimerDetectionResult {
  const p = toUpperCase(primer);
  const t = toUpperCase(target);
  validateAlignmentInput(p, t);
  const forwardAlignment = smithWaterman(p, t, config);
  let reversePrimer: string;
  try {
    reversePrimer = reverseComplement(p);
  } catch {
    return {
      isReversed: false,
      forwardAlignment,
      reverseAlignment: null,
      confidence: 0,
    };
  }
  const reverseAlignment = smithWaterman(reversePrimer, t, config);
  const forwardScore = forwardAlignment.score;
  const reverseScore = reverseAlignment.score;
  const scoreRatio = Math.max(forwardScore, reverseScore) === 0
    ? 0
    : Math.abs(forwardScore - reverseScore) / Math.max(forwardScore, reverseScore);
  let isReversed = false;
  let confidence = 0;
  if (reverseScore > forwardScore && scoreRatio > 0.2) {
    isReversed = true;
    confidence = Math.min(1, scoreRatio);
  } else if (forwardScore > reverseScore && scoreRatio > 0.2) {
    isReversed = false;
    confidence = Math.min(1, scoreRatio);
  } else {
    confidence = 0;
  }
  return {
    isReversed,
    forwardAlignment,
    reverseAlignment,
    confidence,
  };
}

export function alignPrimer(
  primer: string,
  target: string,
  useSeedExtension: boolean = true
): AlignmentResult {
  const p = toUpperCase(primer);
  const t = toUpperCase(target);
  validateAlignmentInput(p, t);
  if (useSeedExtension && p.length >= 10) {
    const seedResult = seedExtension(p, t);
    if (seedResult !== null && seedResult.score > 0) {
      return seedResult;
    }
  }
  return smithWaterman(p, t);
}

export function calculateAlignmentIdentity(result: AlignmentResult): number {
  const total = result.matches + result.mismatches + result.gaps;
  if (total === 0) {
    return 0;
  }
  return result.matches / total;
}
