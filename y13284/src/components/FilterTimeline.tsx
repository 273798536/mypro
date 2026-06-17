import { useMemo, useRef, useState, useEffect } from 'react';
import { CheckSquare, Search, AlertTriangle } from 'lucide-react';
import { useBusinessStore } from '@/stores/useBusinessStore';
import type { ComplaintStatus, ComplaintSource } from '@/shared/types';

const ALL_STATUSES: ComplaintStatus[] = ['待确认', '处理中', '已结案', '已归并', '坐标异常'];
const ALL_SOURCES: ComplaintSource[] = ['12345', '社区群', '现场走访', '其他'];

export default function FilterTimeline() {
  const { filters, setFilters, complaints } = useBusinessStore();
  const [statusOpen, setStatusOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const dateRange = useMemo(() => {
    if (complaints.length === 0) return { min: Date.now(), max: Date.now() };
    const times = complaints.map((c) => new Date(c.occurredAt.replace(' ', 'T')).getTime());
    return { min: Math.min(...times), max: Math.max(...times) };
  }, [complaints]);

  const complaintDates = useMemo(() => {
    const set = new Set<string>();
    complaints.forEach((c) => {
      const d = new Date(c.occurredAt.replace(' ', 'T'));
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return set;
  }, [complaints]);

  const startTs = filters.dateRange?.start
    ? new Date(filters.dateRange.start).getTime()
    : dateRange.min;
  const endTs = filters.dateRange?.end
    ? new Date(filters.dateRange.end).getTime()
    : dateRange.max;

  const getPercent = (ts: number) => {
    if (dateRange.max === dateRange.min) return 50;
    return ((ts - dateRange.min) / (dateRange.max - dateRange.min)) * 100;
  };

  const handleMouseDown = (type: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(type);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const ts = dateRange.min + pct * (dateRange.max - dateRange.min);
      const dateStr = new Date(ts).toISOString().slice(0, 10);

      if (dragging === 'start') {
        const endDate = filters.dateRange?.end ?? new Date(dateRange.max).toISOString().slice(0, 10);
        if (ts <= new Date(endDate).getTime()) {
          setFilters({ dateRange: { start: dateStr, end: endDate } });
        }
      } else {
        const startDate = filters.dateRange?.start ?? new Date(dateRange.min).toISOString().slice(0, 10);
        if (ts >= new Date(startDate).getTime()) {
          setFilters({ dateRange: { start: startDate, end: dateStr } });
        }
      }
    };

    const handleUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, dateRange, filters.dateRange, setFilters]);

  const monthTicks = useMemo(() => {
    const ticks: { label: string; percent: number }[] = [];
    const start = new Date(dateRange.min);
    const end = new Date(dateRange.max);
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      const ts = cur.getTime();
      const pct = dateRange.max === dateRange.min ? 50 : ((ts - dateRange.min) / (dateRange.max - dateRange.min)) * 100;
      ticks.push({
        label: `${cur.getMonth() + 1}月`,
        percent: pct,
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return ticks;
  }, [dateRange]);

  const toggleStatus = (s: ComplaintStatus) => {
    const has = filters.statuses.includes(s);
    setFilters({ statuses: has ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s] });
  };

  const toggleSource = (s: ComplaintSource) => {
    const has = filters.sources.includes(s);
    setFilters({ sources: has ? filters.sources.filter((x) => x !== s) : [...filters.sources, s] });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="bg-panel-blue border-b border-white/10 px-6 py-4 shadow-panel">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-space-deep border border-white/10 text-white/80 hover:border-white/20 rounded-sm"
          >
            <CheckSquare size={16} className="text-amber-warn" />
            状态 {filters.statuses.length > 0 && <span className="text-amber-warn">({filters.statuses.length})</span>}
          </button>
          {statusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-space-deep border border-white/10 rounded-sm shadow-panel z-20 min-w-32">
              {ALL_STATUSES.map((s) => (
                <div
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-white/5 ${
                    filters.statuses.includes(s) ? 'text-amber-warn' : 'text-white/70'
                  }`}
                >
                  {filters.statuses.includes(s) ? '✓ ' : '  '}{s}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setSourceOpen(!sourceOpen)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-space-deep border border-white/10 text-white/80 hover:border-white/20 rounded-sm"
          >
            <CheckSquare size={16} className="text-cyan-glow" />
            来源 {filters.sources.length > 0 && <span className="text-cyan-glow">({filters.sources.length})</span>}
          </button>
          {sourceOpen && (
            <div className="absolute top-full left-0 mt-1 bg-space-deep border border-white/10 rounded-sm shadow-panel z-20 min-w-32">
              {ALL_SOURCES.map((s) => (
                <div
                  key={s}
                  onClick={() => toggleSource(s)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-white/5 ${
                    filters.sources.includes(s) ? 'text-cyan-glow' : 'text-white/70'
                  }`}
                >
                  {filters.sources.includes(s) ? '✓ ' : '  '}{s}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-space-deep border border-white/10 rounded-sm flex-1 max-w-xs">
          <Search size={16} className="text-white/40" />
          <input
            type="text"
            placeholder="搜索街口、内容..."
            value={filters.keyword}
            onChange={(e) => setFilters({ keyword: e.target.value })}
            className="bg-transparent outline-none text-sm text-white/80 flex-1 placeholder:text-white/30"
          />
        </div>

        <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
          <AlertTriangle size={16} className={filters.hasCoordIssue ? 'text-amber-warn' : 'text-white/40'} />
          <span className={filters.hasCoordIssue ? 'text-amber-warn' : 'text-white/60'}>仅异常坐标</span>
          <input
            type="checkbox"
            checked={filters.hasCoordIssue === true}
            onChange={(e) => setFilters({ hasCoordIssue: e.target.checked ? true : null })}
            className="accent-amber-warn"
          />
        </label>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-white/50 font-mono w-20 text-right">{formatDate(startTs)}</span>

        <div className="relative flex-1 h-16 bg-space-deep rounded-sm border border-white/10" ref={trackRef}>
          {monthTicks.map((t, i) => (
            <div
              key={i}
              className="absolute top-1 text-[10px] text-white/40 -translate-x-1/2"
              style={{ left: `${t.percent}%` }}
            >
              <div className="w-px h-2 bg-white/10 mx-auto mb-0.5" />
              {t.label}
            </div>
          ))}

          {complaintDates.size > 0 &&
            [...complaintDates].map((key) => {
              const [y, m, d] = key.split('-').map(Number);
              const ts = new Date(y, m, d).getTime();
              if (ts < dateRange.min || ts > dateRange.max) return null;
              return (
                <div
                  key={key}
                  className="absolute bottom-3 w-2 h-2 rounded-full bg-amber-warn/60 -translate-x-1/2"
                  style={{ left: `${getPercent(ts)}%` }}
                />
              );
            })}

          <div
            className="absolute top-0 bottom-0 bg-amber-warn/10"
            style={{
              left: `${getPercent(startTs)}%`,
              width: `${getPercent(endTs) - getPercent(startTs)}%`,
            }}
          />

          <div
            className="absolute top-0 bottom-0 w-1 bg-amber-warn cursor-ew-resize -translate-x-1/2 z-10"
            style={{ left: `${getPercent(startTs)}%` }}
            onMouseDown={handleMouseDown('start')}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-4 h-6 bg-amber-warn rounded-sm" />
          </div>
          <div
            className="absolute top-0 bottom-0 w-1 bg-amber-warn cursor-ew-resize -translate-x-1/2 z-10"
            style={{ left: `${getPercent(endTs)}%` }}
            onMouseDown={handleMouseDown('end')}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-4 h-6 bg-amber-warn rounded-sm" />
          </div>
        </div>

        <span className="text-xs text-white/50 font-mono w-20">{formatDate(endTs)}</span>
      </div>
    </div>
  );
}
