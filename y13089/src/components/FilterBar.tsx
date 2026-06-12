import { useLightingStore } from '@/store/lightingStore';
import { Search, Filter, RotateCcw, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FilterBar() {
  const { points, filters, setFilters, resetFilters } = useLightingStore();

  const schemes = [...new Set(points.map((p) => p.lightingScheme))];
  const showcases = [...new Set(points.map((p) => p.showcaseId))];
  const showcaseNames = Object.fromEntries(
    points.map((p) => [p.showcaseId, p.showcaseName])
  );

  const toggleScheme = (scheme: string) => {
    const newSchemes = filters.scheme.includes(scheme)
      ? filters.scheme.filter((s) => s !== scheme)
      : [...filters.scheme, scheme];
    setFilters({ scheme: newSchemes });
  };

  const toggleShowcase = (showcase: string) => {
    const newShowcases = filters.showcase.includes(showcase)
      ? filters.showcase.filter((s) => s !== showcase)
      : [...filters.showcase, showcase];
    setFilters({ showcase: newShowcases });
  };

  const hasActiveFilters = 
    filters.scheme.length > 0 ||
    filters.showcase.length > 0 ||
    filters.searchKeyword ||
    filters.showOnlyInconsistent ||
    filters.showOnlyExceptions ||
    filters.luxRange[0] !== 0 ||
    filters.luxRange[1] !== 300 ||
    filters.criRange[0] !== 70 ||
    filters.criRange[1] !== 100 ||
    filters.colorTempRange[0] !== 2700 ||
    filters.colorTempRange[1] !== 6500;

  return (
    <div className="bg-white border-b border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Filter className="w-5 h-5 text-blue-600" />
          <span>筛选条件</span>
          {hasActiveFilters && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              已启用
            </span>
          )}
        </div>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          重置筛选
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索点位名称、ID、展柜..."
          value={filters.searchKeyword}
          onChange={(e) => setFilters({ searchKeyword: e.target.value })}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        {filters.searchKeyword && (
          <button
            onClick={() => setFilters({ searchKeyword: '' })}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            灯光方案
          </label>
          <div className="flex flex-wrap gap-2">
            {schemes.map((scheme) => (
              <button
                key={scheme}
                onClick={() => toggleScheme(scheme)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md border transition-colors",
                  filters.scheme.includes(scheme)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                )}
              >
                {scheme}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            展柜
          </label>
          <div className="flex flex-wrap gap-2">
            {showcases.map((showcase) => (
              <button
                key={showcase}
                onClick={() => toggleShowcase(showcase)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md border transition-colors",
                  filters.showcase.includes(showcase)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                )}
              >
                {showcaseNames[showcase]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              照度范围 (lux): {filters.luxRange[0]} - {filters.luxRange[1]}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="300"
                value={filters.luxRange[0]}
                onChange={(e) => setFilters({ luxRange: [Number(e.target.value), filters.luxRange[1]] })}
                className="flex-1"
              />
              <span className="text-sm text-gray-500">-</span>
              <input
                type="range"
                min="0"
                max="300"
                value={filters.luxRange[1]}
                onChange={(e) => setFilters({ luxRange: [filters.luxRange[0], Number(e.target.value)] })}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              CRI范围: {filters.criRange[0]} - {filters.criRange[1]}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="70"
                max="100"
                value={filters.criRange[0]}
                onChange={(e) => setFilters({ criRange: [Number(e.target.value), filters.criRange[1]] })}
                className="flex-1"
              />
              <span className="text-sm text-gray-500">-</span>
              <input
                type="range"
                min="70"
                max="100"
                value={filters.criRange[1]}
                onChange={(e) => setFilters({ criRange: [filters.criRange[0], Number(e.target.value)] })}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              色温范围 (K): {filters.colorTempRange[0]} - {filters.colorTempRange[1]}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="2700"
                max="6500"
                step="100"
                value={filters.colorTempRange[0]}
                onChange={(e) => setFilters({ colorTempRange: [Number(e.target.value), filters.colorTempRange[1]] })}
                className="flex-1"
              />
              <span className="text-sm text-gray-500">-</span>
              <input
                type="range"
                min="2700"
                max="6500"
                step="100"
                value={filters.colorTempRange[1]}
                onChange={(e) => setFilters({ colorTempRange: [filters.colorTempRange[0], Number(e.target.value)] })}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showOnlyInconsistent}
              onChange={(e) => setFilters({ showOnlyInconsistent: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              仅显示名称不一致
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showOnlyExceptions}
              onChange={(e) => setFilters({ showOnlyExceptions: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              仅显示异常相关
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
