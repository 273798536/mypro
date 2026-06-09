import type { FlowNode, FlowEdge, DataIssue, SampleStatus } from '@/types';

export interface CleanResult {
  status: SampleStatus;
  issues: DataIssue[];
  isValid: boolean;
}

function canReach(
  nodes: FlowNode[],
  edges: FlowEdge[],
  startId: string,
  targetId: string
): boolean {
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    adj.get(e.from)?.push(e.to);
  });

  const visited = new Set<string>();
  const stack = [startId];

  while (stack.length > 0) {
    const curr = stack.pop()!;
    if (curr === targetId) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);
    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) stack.push(next);
    }
  }
  return false;
}

function isGraphConnected(nodes: FlowNode[], edges: FlowEdge[]): boolean {
  if (nodes.length <= 1) return true;
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    adj.get(e.from)?.push(e.to);
    adj.get(e.to)?.push(e.from);
  });

  const visited = new Set<string>();
  const startId = nodes[0].id;
  const stack = [startId];

  while (stack.length > 0) {
    const curr = stack.pop()!;
    if (visited.has(curr)) continue;
    visited.add(curr);
    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) stack.push(next);
    }
  }
  return visited.size === nodes.length;
}

export function cleanData(
  nodes: FlowNode[],
  edges: FlowEdge[],
  sourceId: string,
  sinkId: string
): CleanResult {
  const issues: DataIssue[] = [];

  for (const e of edges) {
    if (e.capacity < 0) {
      issues.push({
        type: 'negative_capacity',
        severity: 'error',
        message: `边 ${e.from}→${e.to} 存在负容量 ${e.capacity}`,
        details: '网络流中容量必须为非负数，该数据明显异常。',
      });
    }
    if (e.from === e.to) {
      issues.push({
        type: 'self_loop',
        severity: 'error',
        message: `节点 ${e.from} 存在自环边`,
        details: '自环边对最大流计算没有意义，属于脏数据。',
      });
    }
  }

  const hasMissingCapacity = edges.some((e) => e.capacity === undefined || e.capacity === null || isNaN(e.capacity));
  if (hasMissingCapacity) {
    issues.push({
      type: 'missing_data',
      severity: 'warning',
      message: '部分边缺少容量数据',
      details: '计算结果可能不可靠，建议补录数据后重新分析。',
    });
  }

  const maxCapacity = Math.max(...edges.map((e) => Math.abs(e.capacity)), 1);
  const hasAbnormalValue = edges.some((e) => e.capacity > maxCapacity * 100 || (e.capacity > 0 && e.capacity < maxCapacity * 0.001));
  if (hasAbnormalValue) {
    issues.push({
      type: 'abnormal_value',
      severity: 'warning',
      message: '存在异常高/异常低的容量值',
      details: '部分容量值与平均值偏差超过两个数量级，建议人工复核。',
    });
  }

  if (!isGraphConnected(nodes, edges)) {
    issues.push({
      type: 'disconnected',
      severity: 'error',
      message: '图不连通，存在孤立节点或连通分量',
      details: '部分节点与主网络不相连，无法参与最大流计算。',
    });
  }

  if (!canReach(nodes, edges, sourceId, sinkId)) {
    issues.push({
      type: 'unreachable_sink',
      severity: 'error',
      message: `从源点 ${sourceId} 无法到达汇点 ${sinkId}`,
      details: '源点与汇点之间不存在通路，最大流必然为 0。',
    });
  }

  const hasError = issues.some((i) => i.severity === 'error');
  const hasWarning = issues.some((i) => i.severity === 'warning');

  let status: SampleStatus = 'normal';
  if (hasError) {
    status = 'bad_data';
  } else if (hasWarning) {
    status = 'pending';
  }

  return {
    status,
    issues,
    isValid: !hasError,
  };
}
