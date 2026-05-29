import type { Partition, DedupStep } from '../types';

export function deduplicateAndSort(
  partitions: Partition[]
): { partitions: Partition[]; steps: DedupStep[] } {
  const steps: DedupStep[] = [];
  let current = partitions.map(p => ({ ...p, numbers: [...p.numbers] }));

  const sortedPartitions = current.map(p => ({
    ...p,
    numbers: [...p.numbers].sort((a, b) => a - b)
  }));
  steps.push({
    stepIndex: 1,
    description: '对每个拆分内部进行非降序排序，消除顺序差异',
    before: current.map(p => [...p.numbers]),
    after: sortedPartitions.map(p => [...p.numbers]),
    removedPartitions: []
  });
  current = sortedPartitions;

  const seen = new Map<string, string>();
  const deduplicated: Partition[] = [];
  const removedIds: string[] = [];

  for (const p of current) {
    const key = p.numbers.join(',');
    if (seen.has(key)) {
      p.isDuplicate = true;
      p.duplicateOf = seen.get(key);
      removedIds.push(p.id);
    } else {
      seen.set(key, p.id);
      deduplicated.push(p);
    }
  }
  steps.push({
    stepIndex: 2,
    description: '去除重复的拆分（数字完全相同的视为同一种拆分）',
    before: current.map(p => [...p.numbers]),
    after: deduplicated.map(p => [...p.numbers]),
    removedPartitions: removedIds
  });
  current = deduplicated;

  current.sort((a, b) => {
    if (a.numbers.length !== b.numbers.length) {
      return a.numbers.length - b.numbers.length;
    }
    for (let i = 0; i < a.numbers.length; i++) {
      if (a.numbers[i] !== b.numbers[i]) {
        return a.numbers[i] - b.numbers[i];
      }
    }
    return 0;
  });
  steps.push({
    stepIndex: 3,
    description: '按拆分数量升序排列，数量相同则按字典序排列',
    before: steps[1].after,
    after: current.map(p => [...p.numbers]),
    removedPartitions: []
  });

  current.forEach((p, i) => {
    p.orderIndex = i;
  });

  return { partitions: current, steps };
}

export function normalizePartitionString(answer: string): string {
  const numbers = answer
    .split(/[+＋]/)
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);
  return numbers.join(',');
}
