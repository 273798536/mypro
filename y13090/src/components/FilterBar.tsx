import { Filter, MapPin, Package, AlertTriangle, RotateCcw } from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';
import { AREAS, STANDARD_MATERIALS } from '@/data/mockData';

export function FilterBar() {
  const { filters, setFilters } = useReviewStore();

  return (
    <div className="bg-steel-800/60 backdrop-blur border border-steel-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-industrial-400" />
        <h3 className="text-sm font-semibold text-steel-200 tracking-wide">筛选条件</h3>
        <div className="ml-auto flex items-center gap-1 text-xs text-steel-500">
          <span className="px-1.5 py-0.5 rounded bg-industrial-600/20 text-industrial-300 font-mono">
            与统计/明细/截图联动
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="flex items-center gap-1 text-xs text-steel-400 mb-1.5">
            <MapPin className="w-3 h-3" /> 区域
          </label>
          <select
            value={filters.area ?? ''}
            onChange={(e) => setFilters({ area: e.target.value || null })}
            className="w-full bg-steel-900 border border-steel-600 rounded px-3 py-2 text-sm text-steel-200 focus:outline-none focus:border-industrial-500 transition-colors"
          >
            <option value="">全部区域</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs text-steel-400 mb-1.5">
            <Package className="w-3 h-3" /> 材料类型
          </label>
          <select
            value={filters.materialType ?? ''}
            onChange={(e) => setFilters({ materialType: e.target.value || null })}
            className="w-full bg-steel-900 border border-steel-600 rounded px-3 py-2 text-sm text-steel-200 focus:outline-none focus:border-industrial-500 transition-colors"
          >
            <option value="">全部材料</option>
            {STANDARD_MATERIALS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={filters.showOnlyAnomaly}
                onChange={(e) => setFilters({ showOnlyAnomaly: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-steel-700 rounded-full peer-checked:bg-warning-500 transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-steel-300 rounded-full peer-checked:translate-x-4 transition-transform"></div>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-warning-400" />
              <span className="text-sm text-steel-300 group-hover:text-steel-100 transition-colors">
                仅显示异常
              </span>
            </div>
          </label>
        </div>

        <div className="flex items-end justify-end">
          <button
            onClick={() => setFilters({ timeRange: null, area: null, materialType: null, showOnlyAnomaly: false })}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-steel-400 hover:text-steel-200 hover:bg-steel-700/50 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置
          </button>
        </div>
      </div>
    </div>
  );
}
