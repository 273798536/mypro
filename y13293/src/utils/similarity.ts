export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const cleanA = a.replace(/\s+/g, '').toLowerCase();
  const cleanB = b.replace(/\s+/g, '').toLowerCase();
  if (cleanA === cleanB) return 1;
  const maxLen = Math.max(cleanA.length, cleanB.length);
  if (maxLen === 0) return 0;
  const distance = levenshteinDistance(cleanA, cleanB);
  return 1 - distance / maxLen;
}
