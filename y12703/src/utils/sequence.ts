export function detectOutliers(
  values: number[],
  baselineCount: number = 5,
  sigmaThreshold: number = 3
): { indices: number[]; mean: number; std: number } {
  if (values.length <= baselineCount) {
    return { indices: [], mean: 0, std: 0 };
  }
  const baseline = values.slice(0, baselineCount);
  const mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const variance =
    baseline.reduce((a, b) => a + (b - mean) ** 2, 0) / baseline.length;
  const std = Math.sqrt(variance);
  const indices: number[] = [];
  for (let i = baselineCount; i < values.length; i++) {
    if (std > 0 && Math.abs(values[i] - mean) > sigmaThreshold * std) {
      indices.push(i);
    }
  }
  return { indices, mean, std };
}

export function formatNumber(n: number, digits: number = 2): string {
  if (!isFinite(n)) return "∞";
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.01 && n !== 0)) {
    return n.toExponential(digits);
  }
  return Number(n.toFixed(digits)).toString();
}

export function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > 1e-9) return false;
  }
  return true;
}

export function generateDedupKey(id: string, formula: string): string {
  return `${id}::${formula.trim()}`;
}
