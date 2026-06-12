import type { Sample } from '@/types';

const statusLabels: Record<string, string> = {
  pending: '待复核',
  reviewed: '已通过',
  rejected: '未通过',
};

const statusColors: Record<string, string> = {
  pending: 'bg-warning-amber/20 text-warning-amber',
  reviewed: 'bg-success-green/20 text-success-green',
  rejected: 'bg-red-500/20 text-red-400',
};

export default function SampleSidebar({
  samples,
  selectedId,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onSelect,
}: {
  samples: Sample[];
  selectedId: string | null;
  filter: string;
  search: string;
  onFilterChange: (f: string) => void;
  onSearchChange: (s: string) => void;
  onSelect: (id: string) => void;
}) {
  const filtered = samples.filter((s) => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search && !s.stationName.includes(search) && !s.id.includes(search)) return false;
    return true;
  });

  return (
    <div className="w-64 flex-shrink-0 bg-slate-900 rounded-lg border border-slate-800 flex flex-col h-full">
      <div className="p-3 border-b border-slate-800">
        <input
          type="text"
          placeholder="搜索站名/样本ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-800 text-sm text-slate-200 rounded px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-warning-amber/50 placeholder:text-slate-600"
        />
        <div className="flex gap-1 mt-2">
          {[
            { key: 'all', label: '全部' },
            { key: 'pending', label: '待复核' },
            { key: 'reviewed', label: '已通过' },
            { key: 'rejected', label: '未通过' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter === f.key
                  ? 'bg-deep-sea text-warning-amber'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-600 text-center mt-4">无匹配样本</p>
        )}
        {filtered.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`w-full text-left px-3 py-2.5 border-b border-slate-800/50 transition-colors ${
              selectedId === s.id
                ? 'bg-deep-sea/60 border-l-2 border-l-warning-amber'
                : 'hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-white font-medium truncate">
                {s.stationName}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[s.status] || ''}`}
              >
                {statusLabels[s.status] || s.status}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">{s.sampleDate}</p>
            {s.anomalies?.length > 0 && (
              <p className="text-[10px] text-red-400 mt-0.5">
                {s.anomalies?.filter((a) => a.type === 'supplement').length} 补材料 ·{' '}
                {s.anomalies?.filter((a) => a.type === 'recalibrate').length} 改口径
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
