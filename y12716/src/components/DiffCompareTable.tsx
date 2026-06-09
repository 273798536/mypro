import { useMemo } from 'react';
import { GitCompare, ArrowUp, ArrowDown, Minus, AlertTriangle } from 'lucide-react';
import type { Question, ScheduleResult } from '@/types';
import { useAppStore } from '@/store/useAppStore';

export function DiffCompareTable() {
  const { schedules, baselineSchedules, questions } = useAppStore();

  const rows = useMemo(() => {
    if (!baselineSchedules || baselineSchedules.length === 0) return [];
    const baselineMap = new Map(baselineSchedules.map((s) => [s.questionId, s]));
    const result: {
      qid: string;
      qname: string;
      before: ScheduleResult | undefined;
      after: ScheduleResult | undefined;
      rankDelta: number;
      batchDelta: number;
      changed: boolean;
    }[] = [];

    const allIds = new Set<string>();
    schedules.forEach((s) => allIds.add(s.questionId));
    baselineSchedules.forEach((s) => allIds.add(s.questionId));

    for (const qid of allIds) {
      const before = baselineMap.get(qid);
      const after = schedules.find((s) => s.questionId === qid);
      const q = questions.find((qq) => qq.id === qid);
      const rankDelta = (before?.rank ?? 0) - (after?.rank ?? 0);
      const batchDelta = (before?.batch ?? 0) - (after?.batch ?? 0);
      const changed =
        (before?.rank ?? -1) !== (after?.rank ?? -1) ||
        (before?.batch ?? -1) !== (after?.batch ?? -1) ||
        (before?.skipped ?? false) !== (after?.skipped ?? false);
      result.push({
        qid,
        qname: q?.name || qid,
        before,
        after,
        rankDelta,
        batchDelta,
        changed,
      });
    }

    return result.sort((a, b) => {
      if (a.changed !== b.changed) return a.changed ? -1 : 1;
      return Math.abs(b.rankDelta) - Math.abs(a.rankDelta);
    });
  }, [schedules, baselineSchedules, questions]);

  const changedCount = rows.filter((r) => r.changed).length;

  if (!baselineSchedules || baselineSchedules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#2a4a73] bg-[#0f2138] text-white p-8 text-center">
        <GitCompare className="mx-auto mb-3 h-10 w-10 text-gray-500" />
        <p className="text-sm text-gray-400">尚未捕获基准排期</p>
        <p className="mt-1 text-xs text-gray-500">
          在上方调整参数前先点击"捕获基准"按钮，即可对比参数调整前后的排期差异
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] text-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#2a4a73] bg-[#173252] px-4 py-3">
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-[#4a8ec2]" />
          <h3 className="font-serif text-lg font-semibold">前后排期差异对比</h3>
        </div>
        <div className="text-xs text-gray-400">
          <span className="text-[#4a8ec2] font-semibold">{changedCount}</span> 条记录发生变化
          <span className="mx-2 text-gray-600">·</span>
          共 {rows.length} 条
        </div>
      </div>

      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#173252] text-xs text-gray-400 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-medium w-16">ID</th>
              <th className="px-3 py-2 text-left font-medium">题目</th>
              <th className="px-3 py-2 text-center font-medium bg-[#1a2f4d]/50" colSpan={3}>
                调整前（基准）
              </th>
              <th className="px-3 py-2 text-center font-medium" colSpan={3}>
                调整后
              </th>
              <th className="px-3 py-2 text-center font-medium w-20">变化</th>
            </tr>
            <tr className="text-[10px] bg-[#12283f]">
              <th className="px-3 py-1"></th>
              <th className="px-3 py-1"></th>
              <th className="px-3 py-1 text-center text-[#7bc9a7]">位次</th>
              <th className="px-3 py-1 text-center text-[#7bc9a7]">批次</th>
              <th className="px-3 py-1 text-center text-[#7bc9a7]">评分</th>
              <th className="px-3 py-1 text-center text-[#d4a24c]">位次</th>
              <th className="px-3 py-1 text-center text-[#d4a24c]">批次</th>
              <th className="px-3 py-1 text-center text-[#d4a24c]">评分</th>
              <th className="px-3 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={r.qid}
                className={`border-t border-[#1a2f4d] transition-colors ${
                  r.changed ? 'bg-[#4a8ec2]/8 hover:bg-[#4a8ec2]/15' : idx % 2 === 0 ? 'bg-[#0f2138]' : 'bg-[#12283f]/50'
                } ${!r.changed ? 'opacity-50' : ''}`}
              >
                <td className="px-3 py-2 font-mono text-xs text-[#d4a24c]">{r.qid}</td>
                <td className="px-3 py-2 text-xs text-gray-200 max-w-[180px] truncate">{r.qname}</td>

                <td className="px-3 py-2 text-center font-mono text-xs text-[#7bc9a7]">
                  {r.before?.skipped ? <span className="text-[#e99090]">跳过</span> : `#${r.before?.rank ?? '-'}`}
                </td>
                <td className="px-3 py-2 text-center font-mono text-xs text-[#7bc9a7]">
                  {r.before?.skipped ? '-' : `第${r.before?.batch}批`}
                </td>
                <td className="px-3 py-2 text-center font-mono text-xs text-[#7bc9a7]">
                  {r.before?.skipped ? '-' : r.before?.score.toFixed(3)}
                </td>

                <td className="px-3 py-2 text-center font-mono text-xs text-[#d4a24c]">
                  {r.after?.skipped ? <span className="text-[#e99090]">跳过</span> : `#${r.after?.rank ?? '-'}`}
                </td>
                <td className="px-3 py-2 text-center font-mono text-xs text-[#d4a24c]">
                  {r.after?.skipped ? '-' : `第${r.after?.batch}批`}
                </td>
                <td className="px-3 py-2 text-center font-mono text-xs text-[#d4a24c]">
                  {r.after?.skipped ? '-' : r.after?.score.toFixed(3)}
                </td>

                <td className="px-3 py-2 text-center">
                  {!r.changed ? (
                    <Minus className="mx-auto h-3.5 w-3.5 text-gray-500" />
                  ) : r.rankDelta === 0 && r.batchDelta !== 0 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#4a8ec2]">
                      <AlertTriangle className="h-3 w-3" />
                      批次{r.batchDelta > 0 ? `↑${r.batchDelta}` : `↓${-r.batchDelta}`}
                    </span>
                  ) : r.rankDelta > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-[#2d936c]">
                      <ArrowUp className="h-3 w-3" />
                      {r.rankDelta}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-[#e99090]">
                      <ArrowDown className="h-3 w-3" />
                      {-r.rankDelta}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
