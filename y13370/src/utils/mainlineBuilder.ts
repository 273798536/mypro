import type { FailureLog, TrainingTask, FailureGroup, CausalLink } from '@/types';

const TIME_WINDOW_MS = 30 * 60 * 1000;

class UnionFind {
  parent: Map<string, string> = new Map();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    if (this.parent.get(x) !== x) this.parent.set(x, this.find(this.parent.get(x)!));
    return this.parent.get(x)!;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export function buildMainlineGroups(
  logs: FailureLog[],
  tasks: TrainingTask[]
): FailureGroup[] {
  const uf = new UnionFind();
  const logMap = new Map(logs.map(l => [l.id, l]));
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  logs.forEach(log => uf.find(log.id));

  for (let i = 0; i < logs.length; i++) {
    for (let j = i + 1; j < logs.length; j++) {
      const a = logs[i];
      const b = logs[j];
      const timeDiff = Math.abs(new Date(a.occurTime).getTime() - new Date(b.occurTime).getTime());
      const shareSamples = a.relatedSampleIds.some(s => b.relatedSampleIds.includes(s));
      const sameTask = a.taskId === b.taskId;
      if ((timeDiff <= TIME_WINDOW_MS && shareSamples) || sameTask) {
        uf.union(a.id, b.id);
      }
    }
  }

  const groups = new Map<string, string[]>();
  logs.forEach(log => {
    const root = uf.find(log.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(log.id);
  });

  const result: FailureGroup[] = [];
  let idx = 0;
  groups.forEach((logIds, _root) => {
    const sortedLogs = logIds
      .map(id => logMap.get(id)!)
      .sort((a, b) => new Date(a.occurTime).getTime() - new Date(b.occurTime).getTime());

    const causalChain: CausalLink[] = [];
    for (let k = 1; k < sortedLogs.length; k++) {
      const prev = sortedLogs[k - 1];
      const curr = sortedLogs[k];
      const shared = prev.relatedSampleIds.filter(s => curr.relatedSampleIds.includes(s));
      causalChain.push({
        from: prev.id,
        to: curr.id,
        description: shared.length > 0
          ? `样本关联: ${shared.slice(0, 2).join(', ')}${shared.length > 2 ? '...' : ''}`
          : `时间窗口内触发: ${Math.abs(new Date(curr.occurTime).getTime() - new Date(prev.occurTime).getTime()) / 60000 | 0}分钟内级联`
      });
    }

    const taskIds = Array.from(new Set(sortedLogs.map(l => l.taskId)));
    const firstLog = sortedLogs[0];
    const taskName = taskMap.get(firstLog.taskId)?.taskName || 'Unknown';

    result.push({
      id: `grp_${idx + 1}`,
      title: `${taskName.split('-')[0]} 异常主线 #${idx + 1}`,
      logIds: sortedLogs.map(l => l.id),
      causalChain,
      status: idx === 0 ? 'analyzing' : idx === 1 ? 'noted' : 'open',
      taskIds
    });
    idx++;
  });

  return result.sort((a, b) => b.logIds.length - a.logIds.length);
}
