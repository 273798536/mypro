import type {
  PartitionConfig,
  PartitionWarning,
  RecursionStep,
  RemovedPartition,
  EXPLOSION_THRESHOLD,
} from "@/types";
import { EXPLOSION_THRESHOLD as THRESHOLD } from "@/types";

function generateUnordered(
  target: number,
  minAddend: number,
  maxAddend: number,
  allowDuplicate: boolean,
  maxCount: number,
  minCount: number
): { partitions: number[][]; steps: RecursionStep[] } {
  const partitions: number[][] = [];
  const steps: RecursionStep[] = [];

  function recurse(remaining: number, start: number, branch: number[], depth: number) {
    if (remaining === 0) {
      if (branch.length >= minCount && branch.length <= maxCount) {
        partitions.push([...branch]);
      } else if (branch.length < minCount) {
        steps.push({
          depth,
          currentSum: target - remaining,
          remaining,
          chosen: 0,
          branch: [...branch],
          isPruned: true,
          pruneReason: `加数个数 ${branch.length} < 最小要求 ${minCount}`,
        });
      }
      return;
    }

    if (branch.length >= maxCount) {
      steps.push({
        depth,
        currentSum: target - remaining,
        remaining,
        chosen: 0,
        branch: [...branch],
        isPruned: true,
        pruneReason: `加数个数已达上限 ${maxCount}`,
      });
      return;
    }

    const upper = Math.min(remaining, maxAddend);
    for (let i = start; i <= upper; i++) {
      if (i < minAddend) continue;

      if (!allowDuplicate && branch.includes(i)) {
        steps.push({
          depth,
          currentSum: target - remaining,
          remaining,
          chosen: i,
          branch: [...branch],
          isPruned: true,
          pruneReason: `不允许重复加数 ${i}`,
        });
        continue;
      }

      steps.push({
        depth,
        currentSum: target - remaining,
        remaining,
        chosen: i,
        branch: [...branch],
        isPruned: false,
      });

      const nextStart = allowDuplicate ? i : i + 1;
      recurse(remaining - i, nextStart, [...branch, i], depth + 1);
    }
  }

  const startVal = minAddend;
  recurse(target, startVal, [], 0);

  return { partitions, steps };
}

function generateOrdered(
  target: number,
  minAddend: number,
  maxAddend: number,
  allowDuplicate: boolean,
  maxCount: number,
  minCount: number
): { partitions: number[][]; steps: RecursionStep[] } {
  const partitions: number[][] = [];
  const steps: RecursionStep[] = [];

  function recurse(remaining: number, branch: number[], depth: number) {
    if (remaining === 0) {
      if (branch.length >= minCount && branch.length <= maxCount) {
        partitions.push([...branch]);
      } else if (branch.length < minCount) {
        steps.push({
          depth,
          currentSum: target - remaining,
          remaining,
          chosen: 0,
          branch: [...branch],
          isPruned: true,
          pruneReason: `加数个数 ${branch.length} < 最小要求 ${minCount}`,
        });
      }
      return;
    }

    if (branch.length >= maxCount) {
      steps.push({
        depth,
        currentSum: target - remaining,
        remaining,
        chosen: 0,
        branch: [...branch],
        isPruned: true,
        pruneReason: `加数个数已达上限 ${maxCount}`,
      });
      return;
    }

    const upper = Math.min(remaining, maxAddend);
    for (let i = minAddend; i <= upper; i++) {
      if (!allowDuplicate && branch.includes(i)) {
        steps.push({
          depth,
          currentSum: target - remaining,
          remaining,
          chosen: i,
          branch: [...branch],
          isPruned: true,
          pruneReason: `不允许重复加数 ${i}`,
        });
        continue;
      }

      steps.push({
        depth,
        currentSum: target - remaining,
        remaining,
        chosen: i,
        branch: [...branch],
        isPruned: false,
      });

      recurse(remaining - i, [...branch, i], depth + 1);
    }
  }

  recurse(target, [], 0);

  return { partitions, steps };
}

function dedupAndSort(partitions: number[][]): number[][] {
  const seen = new Set<string>();
  const unique: number[][] = [];

  for (const p of partitions) {
    const key = p.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  unique.sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
  });

  return unique;
}

function detectDuplicatePermutations(
  partitions: number[][],
  mode: "ordered" | "unordered"
): PartitionWarning[] {
  const warnings: PartitionWarning[] = [];
  if (mode !== "unordered") return warnings;

  const sortedKeys = new Map<string, number[][]>();
  for (const p of partitions) {
    const key = [...p].sort((a, b) => a - b).join(",");
    if (!sortedKeys.has(key)) sortedKeys.set(key, []);
    sortedKeys.get(key)!.push(p);
  }

  let dupCount = 0;
  for (const [, group] of sortedKeys) {
    if (group.length > 1) {
      dupCount += group.length - 1;
    }
  }

  if (dupCount > 0) {
    warnings.push({
      type: "duplicate_permutation",
      message: "发现重复排列",
      detail: `在无序模式下存在 ${dupCount} 组重复排列（相同加数的不同顺序），已自动去重`,
      affectedCount: dupCount,
    });
  }

  return warnings;
}

function evaluatePredicate(predicate: string, partition: number[]): boolean {
  try {
    const fn = new Function("p", `"use strict"; return (${predicate})`);
    return fn(partition) === true;
  } catch {
    return false;
  }
}

function applyFilters(
  partitions: number[][],
  config: PartitionConfig
): { filtered: number[][]; removed: RemovedPartition[] } {
  const filtered: number[][] = [];
  const removed: RemovedPartition[] = [];

  for (const p of partitions) {
    let passed = true;
    let reason = "";

    if (config.customPredicates.length > 0) {
      for (const pred of config.customPredicates) {
        if (!evaluatePredicate(pred, p)) {
          passed = false;
          reason = `自定义条件 "${pred}" 不满足`;
          break;
        }
      }
    }

    if (passed) {
      filtered.push(p);
    } else {
      removed.push({ partition: p, reason });
    }
  }

  return { filtered, removed };
}

function detectConditionUnused(
  config: PartitionConfig,
  removed: RemovedPartition[]
): PartitionWarning[] {
  const warnings: PartitionWarning[] = [];

  if (config.customPredicates.length > 0 && removed.length === 0) {
    warnings.push({
      type: "condition_unused",
      message: "条件可能未被使用",
      detail: `${config.customPredicates.length} 个自定义条件未过滤掉任何方案，请检查条件是否有效`,
      affectedCount: 0,
    });
  }

  return warnings;
}

export function generatePartitions(config: PartitionConfig): {
  allPartitions: number[][];
  filteredPartitions: number[][];
  removedPartitions: RemovedPartition[];
  warnings: PartitionWarning[];
  recursionSteps: RecursionStep[];
} {
  const generator = config.mode === "unordered" ? generateUnordered : generateOrdered;

  const { partitions: raw, steps } = generator(
    config.targetNumber,
    config.minAddend,
    Math.min(config.maxAddend, config.targetNumber),
    config.allowDuplicate,
    config.maxCount,
    config.minCount
  );

  const allPartitions = dedupAndSort(raw);

  const warnings: PartitionWarning[] = [];

  if (allPartitions.length > THRESHOLD) {
    warnings.push({
      type: "explosion",
      message: "方案数量爆炸！",
      detail: `共生成 ${allPartitions.length} 个拆分方案，超出阈值 ${THRESHOLD}。建议缩小加数范围或增加限制条件`,
      affectedCount: allPartitions.length,
    });
  }

  warnings.push(...detectDuplicatePermutations(raw, config.mode));

  const { filtered, removed } = applyFilters(allPartitions, config);
  warnings.push(...detectConditionUnused(config, removed));

  return {
    allPartitions,
    filteredPartitions: filtered,
    removedPartitions: removed,
    warnings,
    recursionSteps: steps,
  };
}
