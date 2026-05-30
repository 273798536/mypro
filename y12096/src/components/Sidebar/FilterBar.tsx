import { useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { useRecordStore } from '../../store/useRecordStore';
import { useViewStore } from '../../store/useViewStore';

export function FilterBar() {
  const { filter, setFilter } = useRecordStore();
  const { syncWithFilter } = useViewStore();

  useEffect(() => {
    syncWithFilter(filter);
  }, [filter.axisFilter, syncWithFilter]);

  return (
    <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={14} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-300">记录筛选</span>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={filter.functionSearch}
            onChange={(e) => setFilter('functionSearch', e.target.value)}
            placeholder="搜索函数表达式..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">旋转轴</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['all', 'x', 'y', 'custom'] as const).map((axis) => (
              <button
                key={axis}
                onClick={() => setFilter('axisFilter', axis)}
                className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                  filter.axisFilter === axis
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                {axis === 'all' ? '全部' : axis === 'x' ? 'X轴' : axis === 'y' ? 'Y轴' : '自定义'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">审核状态</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['all', 'approved', 'needs_review', 'pending', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter('statusFilter', status)}
                className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                  filter.statusFilter === status
                    ? status === 'approved'
                      ? 'bg-green-600 text-white'
                      : status === 'needs_review' || status === 'rejected'
                        ? 'bg-red-600 text-white'
                        : 'bg-amber-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                {status === 'all' ? '全部' : status === 'approved' ? '通过' : status === 'needs_review' ? '待确认' : status === 'pending' ? '待审' : '驳回'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
