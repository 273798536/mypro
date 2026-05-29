import type { Partition, PartitionConditions, RecursionStep } from '../types';

let idCounter = 0;
const generateId = (): string => `p_${++idCounter}_${Date.now()}`;

export function generatePartitions(
  n: number,
  conditions: PartitionConditions,
  onStep?: (step: RecursionStep) => void
): Partition[] {
  const result: Partition[] = [];

  function backtrack(
    remaining: number,
    current: number[],
    start: number,
    depth: number
  ) {
    if (remaining === 0) {
      if (conditions.minParts && current.length < conditions.minParts) return;
      if (conditions.maxParts && current.length > conditions.maxParts) return;

      if (conditions.includeNumbers) {
        const hasAllRequired = conditions.includeNumbers.every(num => current.includes(num));
        if (!hasAllRequired) return;
      }

      result.push({
        id: generateId(),
        numbers: [...current],
        sum: n,
        isDuplicate: false,
        orderIndex: result.length
      });

      onStep?.({
        depth,
        currentSum: current.reduce((a, b) => a + b, 0),
        currentNumbers: [...current],
        remaining: 0,
        action: 'complete'
      });
      return;
    }

    for (let i = start; i <= remaining; i++) {
      if (conditions.minValue && i < conditions.minValue) continue;
      if (conditions.maxValue && i > conditions.maxValue) continue;
      if (conditions.excludeNumbers?.includes(i)) continue;
      if (!conditions.allowDuplicate && current.includes(i)) continue;

      current.push(i);

      onStep?.({
        depth,
        currentSum: current.reduce((a, b) => a + b, 0),
        currentNumbers: [...current],
        remaining: remaining - i,
        action: 'add'
      });

      const nextStart = conditions.allowDuplicate ? i : i + 1;
      backtrack(remaining - i, current, nextStart, depth + 1);

      current.pop();

      onStep?.({
        depth,
        currentSum: current.reduce((a, b) => a + b, 0),
        currentNumbers: [...current],
        remaining: remaining,
        action: 'backtrack'
      });
    }
  }

  const start = conditions.minValue || 1;
  backtrack(n, [], start, 0);

  return result;
}

export function generateUnrestrictedCount(n: number): number {
  const dp: number[] = new Array(n + 1).fill(0);
  dp[0] = 1;

  for (let i = 1; i <= n; i++) {
    for (let j = i; j <= n; j++) {
      dp[j] += dp[j - i];
    }
  }

  return dp[n];
}
