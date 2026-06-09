import type { Question } from '@/types';

export interface TopoSortResult {
  sortedIds: string[];
  skippedIds: string[];
  failureReasons: Record<string, string>;
  dependencyDepths: Record<string, number>;
}

export function topologicalSort(questions: Question[]): TopoSortResult {
  const idToQuestion = new Map(questions.map((q) => [q.id, q]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const skippedIds: string[] = [];
  const failureReasons: Record<string, string> = {};
  const dependencyDepths: Record<string, number> = {};

  for (const q of questions) {
    inDegree.set(q.id, 0);
    adjacency.set(q.id, []);
  }

  for (const q of questions) {
    for (const depId of q.dependencies) {
      if (!idToQuestion.has(depId)) {
        if (!skippedIds.includes(q.id)) {
          skippedIds.push(q.id);
        }
        failureReasons[q.id] = `前置依赖不存在：引用的 ${depId} 在题库中无对应记录`;
        continue;
      }
      const current = inDegree.get(q.id) ?? 0;
      inDegree.set(q.id, current + 1);
      const adj = adjacency.get(depId) ?? [];
      adj.push(q.id);
      adjacency.set(depId, adj);
    }
  }

  for (const skipId of skippedIds) {
    inDegree.delete(skipId);
    adjacency.delete(skipId);
  }

  const queue: { id: string; depth: number }[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push({ id, depth: 0 });
      dependencyDepths[id] = 0;
    }
  }

  const sortedIds: string[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    queue.sort((a, b) => a.id.localeCompare(b.id));
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    sortedIds.push(id);
    dependencyDepths[id] = Math.max(dependencyDepths[id] ?? 0, depth);

    const neighbors = adjacency.get(id) ?? [];
    for (const nextId of neighbors) {
      if (skippedIds.includes(nextId)) continue;
      const nextDeg = (inDegree.get(nextId) ?? 0) - 1;
      inDegree.set(nextId, nextDeg);
      if (nextDeg === 0) {
        queue.push({ id: nextId, depth: depth + 1 });
      }
    }
  }

  for (const [id, deg] of inDegree.entries()) {
    if (deg > 0 && !visited.has(id) && !skippedIds.includes(id)) {
      skippedIds.push(id);
      failureReasons[id] = '检测到循环依赖：该题处于依赖环中，无法确定拓扑顺序';
    }
  }

  let maxDepth = 0;
  for (const d of Object.values(dependencyDepths)) {
    maxDepth = Math.max(maxDepth, d);
  }
  if (maxDepth === 0) maxDepth = 1;
  for (const id of Object.keys(dependencyDepths)) {
    dependencyDepths[id] = dependencyDepths[id] / maxDepth;
  }

  return { sortedIds, skippedIds, failureReasons, dependencyDepths };
}
