import { CrackPoint } from '../types';

export function calculateDistance(crack1: CrackPoint, crack2: CrackPoint): number {
  const dx = crack1.x - crack2.x;
  const dy = crack1.y - crack2.y;
  const dz = crack1.z - crack2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function calculateFeatureSimilarity(crack1: CrackPoint, crack2: CrackPoint): number {
  let score = 0;
  let total = 0;

  total += 1;
  const lengthDiff = Math.abs(crack1.length - crack2.length) / Math.max(crack1.length, crack2.length);
  score += lengthDiff < 0.1 ? 1 : lengthDiff < 0.3 ? 0.5 : 0;

  total += 1;
  const widthDiff = Math.abs(crack1.width - crack2.width) / Math.max(crack1.width, crack2.width);
  score += widthDiff < 0.1 ? 1 : widthDiff < 0.3 ? 0.5 : 0;

  total += 1;
  score += crack1.riskLevel === crack2.riskLevel ? 1 : 0;

  return total > 0 ? score / total : 0;
}

export function detectDuplicates(cracks: CrackPoint[]): CrackPoint[] {
  const distanceThreshold = 5;
  const similarityThreshold = 0.8;

  return cracks.map((crack, i) => {
    const duplicates = cracks.filter((other, j) => {
      if (i === j) return false;
      const distance = calculateDistance(crack, other);
      const similarity = calculateFeatureSimilarity(crack, other);
      return distance < distanceThreshold && similarity > similarityThreshold;
    });

    return {
      ...crack,
      isDuplicate: duplicates.length > 0,
      status: duplicates.length > 0 ? 'duplicate' : crack.status,
      duplicateOf: duplicates.length > 0 ? duplicates[0].id : crack.duplicateOf,
    };
  });
}
