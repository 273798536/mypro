import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useAssetStore } from '@/store/useAssetStore';
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPE_COLORS,
  TIME_WINDOW_LABELS,
  type AssetType,
  type TimeWindow,
} from '@/types';
import { getSectors } from '@/data/mockAssets';

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-700/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-medium text-gray-200">{title}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function FilterPanel() {
  const {
    filters,
    setAssetTypes,
    setSectors,
    setMinCorrelation,
    setMaxCorrelation,
    setTimeWindow,
    resetFilters,
  } = useAssetStore();

  const allSectors = getSectors();
  const allAssetTypes: AssetType[] = ['stock', 'bond', 'commodity', 'currency'];
  const allTimeWindows: TimeWindow[] = ['1m', '3m', '6m', '1y', '3y', '5y'];

  const handleAssetTypeToggle = (type: AssetType) => {
    const newTypes = filters.assetTypes.includes(type)
      ? filters.assetTypes.filter((t) => t !== type)
      : [...filters.assetTypes, type];
    setAssetTypes(newTypes);
  };

  const handleSectorToggle = (sector: string) => {
    const newSectors = filters.sectors.includes(sector)
      ? filters.sectors.filter((s) => s !== sector)
      : [...filters.sectors, sector];
    setSectors(newSectors);
  };

  return (
    <div className="w-72 bg-gray-900/80 backdrop-blur-xl border-r border-gray-700/50 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">筛选条件</h2>
        </div>
        <button
          onClick={resetFilters}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
          title="重置筛选"
        >
          <RefreshCw className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <FilterSection title="资产类型">
          <div className="grid grid-cols-2 gap-2">
            {allAssetTypes.map((type) => (
              <button
                key={type}
                onClick={() => handleAssetTypeToggle(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filters.assetTypes.includes(type)
                    ? 'text-white shadow-lg'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
                style={{
                  backgroundColor: filters.assetTypes.includes(type)
                    ? ASSET_TYPE_COLORS[type]
                    : undefined,
                  boxShadow: filters.assetTypes.includes(type)
                    ? `0 0 20px ${ASSET_TYPE_COLORS[type]}40`
                    : undefined,
                }}
              >
                {ASSET_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="行业分类">
          <div className="flex flex-wrap gap-2">
            {allSectors.map((sector) => (
              <button
                key={sector}
                onClick={() => handleSectorToggle(sector)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filters.sectors.includes(sector)
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                {sector}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="时间窗口">
          <div className="grid grid-cols-3 gap-2">
            {allTimeWindows.map((window) => (
              <button
                key={window}
                onClick={() => setTimeWindow(window)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filters.timeWindow === window
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                {TIME_WINDOW_LABELS[window]}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="相关系数阈值">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>最小值</span>
                <span className="text-cyan-400 font-mono">{filters.minCorrelation.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={filters.minCorrelation}
                onChange={(e) => setMinCorrelation(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>最大值</span>
                <span className="text-cyan-400 font-mono">{filters.maxCorrelation.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={filters.maxCorrelation}
                onChange={(e) => setMaxCorrelation(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
              <span>正相关</span>
              <div className="w-3 h-3 rounded-full bg-red-400 ml-2"></div>
              <span>负相关</span>
            </div>
          </div>
        </FilterSection>
      </div>

      <div className="p-4 border-t border-gray-700/50">
        <div className="text-xs text-gray-500 text-center">
          显示 {filters.assetTypes.length} 类资产 · {filters.sectors.length} 个行业
        </div>
      </div>
    </div>
  );
}
