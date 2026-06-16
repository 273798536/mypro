import { useMemo } from 'react';
import { Search, AlertTriangle, ClipboardList, Filter } from 'lucide-react';
import { useSchemeStore } from '../store/useSchemeStore';
import type { FilterOptions, SchemeStatus } from '../types';

const statusOptions: { label: string; value: SchemeStatus | 'all' }[] = [
  { label: '全部状态', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '评审中', value: 'reviewing' },
  { label: '已确定', value: 'finalized' },
];

export function FilterBar() {
  const filters = useSchemeStore((s) => s.filters);
  const setFilters = useSchemeStore((s) => s.setFilters);
  const schemes = useSchemeStore((s) => s.schemes);
  const materials = useSchemeStore((s) => s.materials);

  const filteredCount = useMemo(() => {
    return schemes.filter((s) => {
      if (filters.keyword && !s.name.toLowerCase().includes(filters.keyword.toLowerCase())) {
        return false;
      }
      if (filters.onlyOverload && !s.hasCapacityOverload) return false;
      if (filters.status !== 'all' && s.status !== filters.status) return false;
      if (filters.onlyIncomplete) {
        const count = materials.filter((m) => m.schemeId === s.id).length;
        if (count >= 3) return false;
      }
      return true;
    }).length;
  }, [schemes, materials, filters]);

  const overloadCount = useMemo(
    () => schemes.filter((s) => s.hasCapacityOverload).length,
    [schemes]
  );
  const incompleteCount = useMemo(
    () =>
      schemes.filter((s) => materials.filter((m) => m.schemeId === s.id).length < 3).length,
    [schemes, materials]
  );

  const update = (patch: Partial<FilterOptions>) => setFilters(patch);

  return (
    <div className="bg-white border border-slateX-200 rounded-sm p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-slateX-700 font-serif">
        <Filter size={14} />
        <span>筛选</span>
        <span className="ml-auto text-xs text-slateX-500 font-mono">
          共 {filteredCount} / {schemes.length} 个方案
        </span>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slateX-400" />
        <input
          type="text"
          placeholder="搜索方案名称..."
          value={filters.keyword}
          onChange={(e) => update({ keyword: e.target.value })}
          className="w-full h-9 pl-9 pr-3 text-sm border border-slateX-200 rounded-sm focus:outline-none focus:border-engineering-600 focus:ring-1 focus:ring-engineering-600"
        />
      </div>

      <div>
        <select
          value={filters.status}
          onChange={(e) => update({ status: e.target.value as SchemeStatus | 'all' })}
          className="w-full h-9 px-3 text-sm border border-slateX-200 rounded-sm bg-white focus:outline-none focus:border-engineering-600"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={filters.onlyOverload}
            onChange={(e) => update({ onlyOverload: e.target.checked })}
            className="w-4 h-4 accent-alert-600"
          />
          <span className="text-sm text-slateX-700 flex items-center gap-1 group-hover:text-alert-600">
            <AlertTriangle size={14} className="text-alert-600" />
            仅看容量超限
          </span>
          <span className="ml-auto text-xs font-mono text-slateX-500">{overloadCount}</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={filters.onlyIncomplete}
            onChange={(e) => update({ onlyIncomplete: e.target.checked })}
            className="w-4 h-4 accent-amberX-600"
          />
          <span className="text-sm text-slateX-700 flex items-center gap-1 group-hover:text-amberX-600">
            <ClipboardList size={14} className="text-amberX-600" />
            仅看材料不齐
          </span>
          <span className="ml-auto text-xs font-mono text-slateX-500">{incompleteCount}</span>
        </label>
      </div>
    </div>
  );
}
