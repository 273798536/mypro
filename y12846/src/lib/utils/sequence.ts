import type { BaseComplementMap } from './types';

const COMPLEMENT_MAP: BaseComplementMap = {
  A: 'T',
  T: 'A',
  G: 'C',
  C: 'G',
  U: 'A',
  N: 'N',
  R: 'Y',
  Y: 'R',
  S: 'S',
  W: 'W',
  K: 'M',
  M: 'K',
  B: 'V',
  V: 'B',
  D: 'H',
  H: 'D',
  a: 't',
  t: 'a',
  g: 'c',
  c: 'g',
  u: 'a',
  n: 'n',
  r: 'y',
  y: 'r',
  s: 's',
  w: 'w',
  k: 'm',
  m: 'k',
  b: 'v',
  v: 'b',
  d: 'h',
  h: 'd',
};

const IUPAC_AMBIGUITY_CODES: Set<string> = new Set([
  'N', 'R', 'Y', 'S', 'W', 'K', 'M', 'B', 'V', 'D', 'H',
  'n', 'r', 'y', 's', 'w', 'k', 'm', 'b', 'v', 'd', 'h',
]);

const VALID_BASES: Set<string> = new Set([
  'A', 'T', 'G', 'C', 'U', 'N',
  'R', 'Y', 'S', 'W', 'K', 'M', 'B', 'V', 'D', 'H',
  'a', 't', 'g', 'c', 'u', 'n',
  'r', 'y', 's', 'w', 'k', 'm', 'b', 'v', 'd', 'h',
]);

export function validateSequence(sequence: string): boolean {
  if (typeof sequence !== 'string') {
    return false;
  }
  if (sequence.length === 0) {
    return false;
  }
  for (const base of sequence) {
    if (!VALID_BASES.has(base)) {
      return false;
    }
  }
  return true;
}

export function toUpperCase(sequence: string): string {
  if (!validateSequence(sequence)) {
    throw new Error('Invalid sequence: contains unrecognized bases');
  }
  return sequence.toUpperCase();
}

export function complement(sequence: string): string {
  const upperSeq = toUpperCase(sequence);
  let result = '';
  for (const base of upperSeq) {
    const comp = COMPLEMENT_MAP[base];
    if (comp === undefined) {
      throw new Error(`Cannot find complement for base: ${base}`);
    }
    result += comp;
  }
  return result;
}

export function reverse(sequence: string): string {
  if (!validateSequence(sequence)) {
    throw new Error('Invalid sequence: contains unrecognized bases');
  }
  return sequence.split('').reverse().join('');
}

export function reverseComplement(sequence: string): string {
  return reverse(complement(sequence));
}

export function calculateGCContent(sequence: string): number {
  const upperSeq = toUpperCase(sequence);
  if (upperSeq.length === 0) {
    return 0;
  }
  let gcCount = 0;
  let validCount = 0;
  for (const base of upperSeq) {
    if (base === 'G' || base === 'C') {
      gcCount++;
      validCount++;
    } else if (base === 'A' || base === 'T' || base === 'U') {
      validCount++;
    }
  }
  if (validCount === 0) {
    return 0;
  }
  return gcCount / validCount;
}

export function countAmbiguousBases(sequence: string): number {
  const upperSeq = toUpperCase(sequence);
  let count = 0;
  for (const base of upperSeq) {
    if (IUPAC_AMBIGUITY_CODES.has(base) && base !== 'N') {
      count++;
    }
  }
  return count;
}

export function hasAmbiguousBases(sequence: string): boolean {
  return countAmbiguousBases(sequence) > 0 || countN(sequence) > 0;
}

export function countN(sequence: string): number {
  const upperSeq = toUpperCase(sequence);
  let count = 0;
  for (const base of upperSeq) {
    if (base === 'N') {
      count++;
    }
  }
  return count;
}

export function getAmbiguityPositions(sequence: string): number[] {
  const upperSeq = toUpperCase(sequence);
  const positions: number[] = [];
  for (let i = 0; i < upperSeq.length; i++) {
    const base = upperSeq[i];
    if (IUPAC_AMBIGUITY_CODES.has(base)) {
      positions.push(i);
    }
  }
  return positions;
}

export function basesMatch(base1: string, base2: string, allowAmbiguity: boolean = true): boolean {
  if (base1.length !== 1 || base2.length !== 1) {
    throw new Error('basesMatch requires single character inputs');
  }
  const b1 = base1.toUpperCase();
  const b2 = base2.toUpperCase();
  if (b1 === b2) {
    return true;
  }
  if (!allowAmbiguity) {
    return false;
  }
  if (b1 === 'N' || b2 === 'N') {
    return true;
  }
  const iupacSets: Record<string, Set<string>> = {
    R: new Set(['A', 'G']),
    Y: new Set(['C', 'T']),
    S: new Set(['G', 'C']),
    W: new Set(['A', 'T']),
    K: new Set(['G', 'T']),
    M: new Set(['A', 'C']),
    B: new Set(['C', 'G', 'T']),
    V: new Set(['A', 'C', 'G']),
    D: new Set(['A', 'G', 'T']),
    H: new Set(['A', 'C', 'T']),
  };
  const set1 = iupacSets[b1] || new Set([b1]);
  const set2 = iupacSets[b2] || new Set([b2]);
  for (const base of set1) {
    if (set2.has(base)) {
      return true;
    }
  }
  return false;
}

export function sequenceLength(sequence: string): number {
  if (!validateSequence(sequence)) {
    throw new Error('Invalid sequence: contains unrecognized bases');
  }
  return sequence.length;
}

export function extractSubsequence(
  sequence: string,
  start: number,
  end: number,
  zeroBased: boolean = true
): string {
  if (!validateSequence(sequence)) {
    throw new Error('Invalid sequence: contains unrecognized bases');
  }
  let actualStart: number;
  let actualEnd: number;
  if (zeroBased) {
    actualStart = start;
    actualEnd = end;
  } else {
    actualStart = start - 1;
    actualEnd = end;
  }
  if (actualStart < 0 || actualEnd > sequence.length || actualStart >= actualEnd) {
    throw new Error(`Invalid sequence range: [${start}, ${end}] for sequence length ${sequence.length}`);
  }
  return sequence.substring(actualStart, actualEnd);
}

export function isPalindrome(sequence: string): boolean {
  const upperSeq = toUpperCase(sequence);
  return upperSeq === reverseComplement(upperSeq);
}

export function normalizeSequence(sequence: string): string {
  return toUpperCase(sequence).replace(/\s+/g, '');
}
