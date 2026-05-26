import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { useCashFlowStore } from '../../hooks/useCashFlowStore';

export default function DateRangeFilter() {
  const dateRange = useCashFlowStore(s => s.filters.dateRange);
  const setDateRange = useCashFlowStore(s => s.setDateRange);
  const records = useCashFlowStore(s => s.records);

  const minDate = useMemo(() => {
    if (records.length === 0) return '2026-01-01';
    return records.map(r => r.flowDate).sort()[0];
  }, [records]);

  const maxDate = useMemo(() => {
    if (records.length === 0) return '2026-12-31';
    return records.map(r => r.flowDate).sort()[records.length - 1];
  }, [records]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    if (newStart <= dateRange[1]) {
      setDateRange([newStart, dateRange[1]]);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    if (newEnd >= dateRange[0]) {
      setDateRange([dateRange[0], newEnd]);
    }
  };

  const applyQuickRange = (type: 'month' | 'quarter' | 'all') => {
    if (type === 'all') {
      setDateRange([minDate, maxDate]);
      return;
    }
    const today = new Date();
    if (type === 'month') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const start = `${year}-${month}-01`;
      const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
      const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      const safeStart = start < minDate ? minDate : start;
      const safeEnd = end > maxDate ? maxDate : end;
      if (safeStart <= safeEnd) setDateRange([safeStart, safeEnd]);
    }
    if (type === 'quarter') {
      const year = today.getFullYear();
      const quarter = Math.floor(today.getMonth() / 3);
      const startMonth = quarter * 3;
      const endMonth = startMonth + 2;
      const start = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, endMonth + 1, 0).getDate();
      const end = `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const safeStart = start < minDate ? minDate : start;
      const safeEnd = end > maxDate ? maxDate : end;
      if (safeStart <= safeEnd) setDateRange([safeStart, safeEnd]);
    }
  };

  const rangePct = useMemo(() => {
    const totalMs = new Date(maxDate).getTime() - new Date(minDate).getTime();
    if (totalMs === 0) return { start: 0, end: 100 };
    const startMs = new Date(dateRange[0]).getTime() - new Date(minDate).getTime();
    const endMs = new Date(dateRange[1]).getTime() - new Date(minDate).getTime();
    return {
      start: (startMs / totalMs) * 100,
      end: (endMs / totalMs) * 100,
    };
  }, [dateRange, minDate, maxDate]);

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Calendar className="w-4 h-4 text-sky-400" />
        <h3 className="text-base font-semibold text-white">日期范围</h3>
      </div>
      <p className="text-xs text-white/50 mb-4 pl-6">Date Range</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[11px] text-white/50 mb-1">开始日期</label>
          <input
            type="date"
            value={dateRange[0]}
            min={minDate}
            max={dateRange[1]}
            onChange={handleStartChange}
            className="w-full px-3 py-2 text-sm text-white bg-black/30 border border-white/10 rounded-lg focus:outline-none focus:border-sky-400/60 transition-colors [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="block text-[11px] text-white/50 mb-1">结束日期</label>
          <input
            type="date"
            value={dateRange[1]}
            min={dateRange[0]}
            max={maxDate}
            onChange={handleEndChange}
            className="w-full px-3 py-2 text-sm text-white bg-black/30 border border-white/10 rounded-lg focus:outline-none focus:border-sky-400/60 transition-colors [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => applyQuickRange('month')}
          className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 transition-colors"
        >
          本月
        </button>
        <button
          onClick={() => applyQuickRange('quarter')}
          className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 transition-colors"
        >
          本季度
        </button>
        <button
          onClick={() => applyQuickRange('all')}
          className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-colors"
        >
          全部
        </button>
      </div>

      <div>
        <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="absolute top-0 bottom-0 rounded-full transition-all duration-300"
            style={{
              left: `${rangePct.start}%`,
              width: `${rangePct.end - rangePct.start}%`,
              background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-white/40">
          <span>{minDate}</span>
          <span>{maxDate}</span>
        </div>
      </div>
    </div>
  );
}
