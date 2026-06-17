import { useMemo, useState } from 'react';
import { AlertTriangle, Merge, ArrowUpDown } from 'lucide-react';
import { useBusinessStore } from '@/stores/useBusinessStore';
import type { ComplaintStatus, StandardComplaint } from '@/shared/types';

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  待确认: 'bg-amber-warn/20 text-amber-warn border-amber-warn/30',
  处理中: 'bg-cyan-glow/20 text-cyan-glow border-cyan-glow/30',
  已结案: 'bg-green-ok/20 text-green-ok border-green-ok/30',
  已归并: 'bg-purple-merge/20 text-purple-merge border-purple-merge/30',
  坐标异常: 'bg-red-reject/20 text-red-reject border-red-reject/30',
};

export default function ComplaintList() {
  const { complaints, filters, selectedId, setSelected, mergeSuggestions } = useBusinessStore();
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    let list = [...complaints];

    if (filters.dateRange?.start || filters.dateRange?.end) {
      list = list.filter((c) => {
        const t = new Date(c.occurredAt.replace(' ', 'T')).getTime();
        if (filters.dateRange?.start && t < new Date(filters.dateRange.start).getTime()) return false;
        if (filters.dateRange?.end && t > new Date(filters.dateRange.end).getTime()) return false;
        return true;
      });
    }
    if (filters.statuses.length > 0) list = list.filter((c) => filters.statuses.includes(c.status));
    if (filters.sources.length > 0) list = list.filter((c) => filters.sources.includes(c.source));
    if (filters.hasCoordIssue === true) list = list.filter((c) => c.coordIssue);
    if (filters.keyword.trim()) {
      const kw = filters.keyword.trim().toLowerCase();
      list = list.filter((c) =>
        `${c.intersection} ${c.content} ${c.source}`.toLowerCase().includes(kw)
      );
    }

    list.sort((a, b) => {
      const ta = new Date(a.occurredAt.replace(' ', 'T')).getTime();
      const tb = new Date(b.occurredAt.replace(' ', 'T')).getTime();
      return sortDesc ? tb - ta : ta - tb;
    });

    return list;
  }, [complaints, filters, sortDesc]);

  const mergeMap = useMemo(() => {
    const m = new Map<string, string>();
    mergeSuggestions.forEach((s) => {
      s.complaintIds.forEach((id) => m.set(id, s.groupId));
    });
    return m;
  }, [mergeSuggestions]);

  const formatTime = (iso: string) => {
    const d = new Date(iso.replace(' ', 'T'));
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-panel-blue border border-white/10 rounded-sm shadow-panel">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <span className="text-sm text-white/70">
          共 <span className="text-amber-warn font-mono">{filtered.length}</span> 条
        </span>
        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          <ArrowUpDown size={14} />
          {sortDesc ? '时间倒序' : '时间正序'}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-space-deep z-10">
            <tr className="text-white/50 text-xs">
              <th className="px-4 py-2.5 text-left font-normal">时间</th>
              <th className="px-4 py-2.5 text-left font-normal">街口</th>
              <th className="px-4 py-2.5 text-left font-normal">来源</th>
              <th className="px-4 py-2.5 text-left font-normal">状态</th>
              <th className="px-4 py-2.5 text-left font-normal">坐标</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: StandardComplaint, idx: number) => {
              const hasMerge = mergeMap.has(c.id);
              const isSelected = c.id === selectedId;
              const hasCoord = !!c.coordIssue;

              return (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`
                    cursor-pointer transition-colors border-l-2
                    ${idx % 2 === 0 ? 'bg-space-deep/40' : 'bg-space-deep/20'}
                    ${isSelected ? 'bg-amber-warn/10 border-l-amber-warn' : 'border-l-transparent hover:bg-white/5'}
                    ${hasMerge ? 'border border-purple-merge/40' : ''}
                  `}
                >
                  <td className="px-4 py-2.5 text-white/70 font-mono text-xs whitespace-nowrap">
                    {formatTime(c.occurredAt)}
                  </td>
                  <td className="px-4 py-2.5 text-white/80">
                    <div className="flex items-center gap-1.5">
                      {hasCoord && <AlertTriangle size={14} className="text-amber-warn shrink-0" />}
                      <span>{c.intersection}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-white/60 text-xs">{c.source}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-sm border ${STATUS_COLORS[c.status]}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-white/40 font-mono text-xs">
                    {c.lng.toFixed(4)}, {c.lat.toFixed(4)}
                  </td>
                  <td className="px-2 py-2.5">
                    {hasMerge && (
                      <div className="flex items-center justify-center">
                        <Merge size={14} className="text-purple-merge animate-pulse" />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-white/30 text-sm">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
