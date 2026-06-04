import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const FilterBar: React.FC = () => {
  const filters = useAppStore(state => state.filters);
  const setFilters = useAppStore(state => state.setFilters);
  const sourceMaterials = useAppStore(state => state.sourceMaterials);
  const trackPoints = useAppStore(state => state.trackPoints);

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'normal', label: '正常' },
    { value: 'out-of-bounds', label: '边界越界' },
    { value: 'color-invalid', label: '颜色异常' },
    { value: 'missing-unit', label: '缺项漏填' },
    { value: 'supplementary', label: '补录数据' },
  ];

  const operators = Array.from(
    new Set(trackPoints.map(p => p.operator).filter(Boolean))
  );

  const activeFiltersCount = [
    filters.searchText,
    filters.status !== 'all',
    filters.materialId,
    filters.operator
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilters({
      searchText: '',
      status: 'all',
      materialId: null,
      operator: null
    });
  };

  return (
    <div className="bg-xuan-50 border border-ochre-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-ink-600 flex items-center gap-2">
          <Filter className="w-4 h-4 text-ochre-600" />
          筛选条件
          {activeFiltersCount > 0 && (
            <span className="text-xs bg-cinnabar-500 text-white px-1.5 py-0.5 rounded">
              {activeFiltersCount}
            </span>
          )}
        </h3>
        {activeFiltersCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-ochre-600 hover:text-cinnabar-600 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            清除所有
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-ochre-600 mb-1">关键词搜索</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ochre-400" />
            <input
              type="text"
              value={filters.searchText}
              onChange={e => setFilters({ ...filters, searchText: e.target.value })}
              placeholder="点号、坐标、备注..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-ochre-200 rounded focus:outline-none focus:border-ochre-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-ochre-600 mb-1">数据状态</label>
          <select
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value as any })}
            className="w-full px-3 py-2 text-sm bg-white border border-ochre-200 rounded focus:outline-none focus:border-ochre-500"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-ochre-600 mb-1">来源材料</label>
          <select
            value={filters.materialId || ''}
            onChange={e => setFilters({ ...filters, materialId: e.target.value || null })}
            className="w-full px-3 py-2 text-sm bg-white border border-ochre-200 rounded focus:outline-none focus:border-ochre-500"
          >
            <option value="">全部材料</option>
            {sourceMaterials.map(mat => (
              <option key={mat.id} value={mat.id}>{mat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-ochre-600 mb-1">录入人员</label>
          <select
            value={filters.operator || ''}
            onChange={e => setFilters({ ...filters, operator: e.target.value || null })}
            className="w-full px-3 py-2 text-sm bg-white border border-ochre-200 rounded focus:outline-none focus:border-ochre-500"
          >
            <option value="">全部人员</option>
            {operators.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
