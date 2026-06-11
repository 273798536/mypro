import { Filter, Calendar, MapPin, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { statusMeta } from '@/utils/formatters';
import type { StatusFilter } from '@/types';

const STATIONS = ['A03', 'B07', 'C12'];

export function FilterBar() {
  const { filters, setFilters, setStatusFilter, resetToDemo } = useAppStore();

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'anomaly', label: '仅异常' },
    { value: 'normal', label: '仅正常' },
  ];

  return (
    <div className="h-12 bg-ocean-600 text-white flex items-center gap-3 px-4 border-b border-ocean-700">
      <div className="flex items-center gap-2 font-serif text-base font-semibold tracking-wide">
        <WindGlyph />
        <span>滨海步道风场剖面讲解</span>
      </div>
      <div className="h-6 w-px bg-ocean-400 mx-2" />
      <div className="flex items-center gap-2 text-xs">
        <Filter className="w-3.5 h-3.5 text-ocean-200" />
        <span className="text-ocean-200">筛选</span>
      </div>
      <label className="flex items-center gap-1.5 ml-1">
        <MapPin className="w-3.5 h-3.5 text-ocean-200" />
        <select
          value={filters.station}
          onChange={(e) => setFilters({ station: e.target.value })}
          className="bg-ocean-700 border border-ocean-500 rounded text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-tealish"
        >
          {STATIONS.map((s) => (
            <option key={s} value={s}>测站 {s}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-ocean-200" />
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ dateFrom: e.target.value, dateTo: e.target.value })}
          className="bg-ocean-700 border border-ocean-500 rounded text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-tealish"
        />
      </label>
      <div className="flex items-center gap-1 ml-1">
        {statusOptions.map((opt) => {
          const active = filters.statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                active
                  ? 'bg-tealish text-ocean-800 border-tealish font-medium'
                  : 'bg-ocean-700 border-ocean-500 text-ocean-100 hover:bg-ocean-500'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1" />
      <button
        onClick={resetToDemo}
        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-ocean-400 text-ocean-100 hover:bg-ocean-500 transition-colors"
      >
        <RotateCcw className="w-3 h-3" />
        放样例
      </button>
      <div className="flex items-center gap-1 text-xs text-ocean-200 ml-2">
        <span className={`inline-block w-2 h-2 rounded-full ${statusMeta.normal.dot}`} />
        正常
        <span className={`inline-block w-2 h-2 rounded-full ${statusMeta.supplement.dot} ml-2`} />
        补录
        <span className={`inline-block w-2 h-2 rounded-full ${statusMeta.anomaly.dot} ml-2`} />
        异常
      </div>
    </div>
  );
}

function WindGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  );
}
