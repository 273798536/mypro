import { useCondProbStore } from '@/store/useCondProbStore';
import { DATA_STATUS_LABEL, DataStatus } from '@/types';
import { Filter, AlertOctagon, X } from 'lucide-react';

const FILTERS: Array<{ key: DataStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'available', label: DATA_STATUS_LABEL.available },
  { key: 'pending', label: DATA_STATUS_LABEL.pending },
  { key: 'recollect', label: DATA_STATUS_LABEL.recollect },
];

export default function StatusFilterBar() {
  const { filterStatus, setFilterStatus, boundaryOnly, toggleBoundaryOnly } = useCondProbStore();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm text-ink-600">
        <Filter className="w-4 h-4" />
        <span className="font-medium">数据状态</span>
      </div>
      <div className="flex flex-wrap items-center gap-1 bg-white rounded-lg border border-ink-100 p-1 shadow-sm">
        {FILTERS.map((f) => {
          const active = filterStatus === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                active
                  ? 'bg-ink-700 text-white shadow'
                  : 'text-ink-600 hover:text-ink-800 hover:bg-ink-50'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <button
        onClick={toggleBoundaryOnly}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-all ${
          boundaryOnly
            ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm'
            : 'bg-white border-ink-100 text-ink-600 hover:border-amber-200 hover:text-amber-700'
        }`}
      >
        {boundaryOnly ? <X className="w-4 h-4" /> : <AlertOctagon className="w-4 h-4" />}
        {boundaryOnly ? '取消边界筛选' : '仅看边界样例'}
      </button>
    </div>
  );
}
