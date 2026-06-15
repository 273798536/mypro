import { Search, Calendar, User, Music2, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useConflictStore } from '@/store/conflictStore';
import type { ConflictStatus, FilterState } from '@/types';
import { STATUS_LABEL } from '@/types';
import { cn } from '@/lib/utils';

export default function FilterBar() {
  const { filters, setFilters, resetFilters, getAllTracks, getAllHandlers } = useConflictStore();
  const tracks = getAllTracks();
  const handlers = getAllHandlers();

  const statusOptions: { value: 'all' | ConflictStatus; label: string }[] = [
    { value: 'all', label: '全部状态' },
    { value: 'resolved', label: STATUS_LABEL.resolved },
    { value: 'pending_evidence', label: STATUS_LABEL.pending_evidence },
    { value: 'pending_confirm', label: STATUS_LABEL.pending_confirm },
  ];

  return (
    <div className="glass-nav rounded-2xl p-5 shadow-paper border border-brand-700/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white/90">
          <SlidersHorizontal className="w-5 h-5" />
          <h2 className="font-bold tracking-wide">筛选条件（统计·明细·报告同源）</h2>
        </div>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white/80 text-sm
                     bg-white/10 hover:bg-white/20 transition-all border border-white/20"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置筛选
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.searchKeyword}
            onChange={(e) => setFilters({ searchKeyword: e.target.value })}
            placeholder="搜索曲目、处理人、备注关键字..."
            className={cn('input-field pl-9 bg-white')}
          />
        </div>

        <div className="relative">
          <Music2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={filters.trackFilter}
            onChange={(e) => setFilters({ trackFilter: e.target.value })}
            className={cn('input-field pl-9 appearance-none bg-white pr-8')}
          >
            <option value="all">全部曲目</option>
            {tracks.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={filters.handlerFilter}
            onChange={(e) => setFilters({ handlerFilter: e.target.value })}
            className={cn('input-field pl-9 appearance-none bg-white pr-8')}
          >
            <option value="all">全部处理人</option>
            {handlers.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={filters.dateRangeStart}
              onChange={(e) => setFilters({ dateRangeStart: e.target.value })}
              className={cn('input-field pl-7 text-xs bg-white')}
              title="起始日期"
            />
          </div>
          <span className="text-white/50 text-xs">—</span>
          <div className="relative flex-1">
            <input
              type="date"
              value={filters.dateRangeEnd}
              onChange={(e) => setFilters({ dateRangeEnd: e.target.value })}
              className={cn('input-field text-xs bg-white')}
              title="结束日期"
            />
          </div>
        </div>

        <div>
          <select
            value={filters.statusFilter}
            onChange={(e) => setFilters({ statusFilter: e.target.value as FilterState['statusFilter'] })}
            className={cn('input-field appearance-none bg-white pr-8')}
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
