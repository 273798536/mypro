import { useState } from 'react';
import { Filter, X, Search } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { FINGER_TYPES, QUALITY_LABELS, QualityType } from '../../types';
import { FINGER_TYPE_COLORS, QUALITY_COLORS } from '../../utils/colorScheme';

export function FilterPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const filters = useAppStore(state => state.filters);
  const setFilters = useAppStore(state => state.setFilters);
  const totalDuration = useAppStore(state => state.totalDuration);

  const toggleFingerType = (type: string) => {
    const current = filters.fingerTypes;
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFilters({ fingerTypes: next });
  };

  const toggleQuality = (quality: QualityType) => {
    const current = filters.quality;
    const next = current.includes(quality)
      ? current.filter(q => q !== quality)
      : [...current, quality];
    setFilters({ quality: next });
  };

  const resetFilters = () => {
    setFilters({
      timeRange: [0, totalDuration],
      fingerTypes: [],
      frequencyRange: [0, 20000],
      quality: [],
      searchKeyword: ''
    });
  };

  const activeFiltersCount = 
    (filters.fingerTypes.length > 0 ? 1 : 0) +
    (filters.quality.length > 0 ? 1 : 0) +
    (filters.timeRange[0] > 0 || filters.timeRange[1] < totalDuration ? 1 : 0) +
    (filters.frequencyRange[0] > 0 || filters.frequencyRange[1] < 20000 ? 1 : 0) +
    (filters.searchKeyword ? 1 : 0);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-[#1E1E2A] hover:bg-[#2A2A3A] border border-[#3A3A4A] rounded transition-colors relative"
      >
        <Filter size={16} className="text-[#F5F0E6]" />
        <span className="text-[#F5F0E6] text-sm">筛选</span>
        {activeFiltersCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#8B2323] text-white text-xs rounded-full flex items-center justify-center">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-[#1E1E2A] border border-[#3A3A4A] rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-[#3A3A4A]">
            <h3 className="text-[#F5F0E6] font-medium text-sm">筛选条件</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-[#2A2A3A] rounded"
            >
              <X size={14} className="text-[#A0A0A0]" />
            </button>
          </div>

          <div className="p-3 space-y-4 max-h-96 overflow-y-auto">
            <div>
              <label className="flex items-center gap-1 text-[#A0A0A0] text-xs mb-2">
                <Search size={12} />
                关键词搜索
              </label>
              <input
                type="text"
                value={filters.searchKeyword}
                onChange={(e) => setFilters({ searchKeyword: e.target.value })}
                placeholder="搜索片段名称或标签..."
                className="w-full px-3 py-2 bg-[#2A2A3A] border border-[#3A3A4A] rounded text-[#F5F0E6] text-sm focus:outline-none focus:border-[#8B2323]"
              />
            </div>

            <div>
              <label className="text-[#A0A0A0] text-xs mb-2 block">指法类型</label>
              <div className="flex flex-wrap gap-1">
                {FINGER_TYPES.map(type => {
                  const isActive = filters.fingerTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleFingerType(type)}
                      className={`px-2 py-1 rounded text-xs transition-all ${
                        isActive
                          ? 'text-white'
                          : 'bg-[#2A2A3A] text-[#A0A0A0] hover:text-white'
                      }`}
                      style={isActive ? { backgroundColor: FINGER_TYPE_COLORS[type] } : {}}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[#A0A0A0] text-xs mb-2 block">数据质量</label>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(QUALITY_LABELS) as QualityType[]).map(quality => {
                  const isActive = filters.quality.includes(quality);
                  return (
                    <button
                      key={quality}
                      onClick={() => toggleQuality(quality)}
                      className={`px-2 py-1 rounded text-xs transition-all ${
                        isActive
                          ? 'text-white'
                          : 'bg-[#2A2A3A] text-[#A0A0A0] hover:text-white'
                      }`}
                      style={isActive ? { backgroundColor: QUALITY_COLORS[quality] } : {}}
                    >
                      {QUALITY_LABELS[quality]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[#A0A0A0] text-xs mb-2 block">
                时间范围: {filters.timeRange[0].toFixed(0)}s - {filters.timeRange[1].toFixed(0)}s
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={totalDuration}
                  step={1}
                  value={filters.timeRange[0]}
                  onChange={(e) => setFilters({
                    timeRange: [parseFloat(e.target.value), filters.timeRange[1]]
                  })}
                  className="flex-1 accent-[#8B2323]"
                />
                <input
                  type="range"
                  min={0}
                  max={totalDuration}
                  step={1}
                  value={filters.timeRange[1]}
                  onChange={(e) => setFilters({
                    timeRange: [filters.timeRange[0], parseFloat(e.target.value)]
                  })}
                  className="flex-1 accent-[#8B2323]"
                />
              </div>
            </div>

            <div>
              <label className="text-[#A0A0A0] text-xs mb-2 block">
                频段范围: {filters.frequencyRange[0]}Hz - {filters.frequencyRange[1]}Hz
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={20}
                  max={20000}
                  step={100}
                  value={filters.frequencyRange[0]}
                  onChange={(e) => setFilters({
                    frequencyRange: [parseFloat(e.target.value), filters.frequencyRange[1]]
                  })}
                  className="flex-1 accent-[#1A5276]"
                />
                <input
                  type="range"
                  min={20}
                  max={20000}
                  step={100}
                  value={filters.frequencyRange[1]}
                  onChange={(e) => setFilters({
                    frequencyRange: [filters.frequencyRange[0], parseFloat(e.target.value)]
                  })}
                  className="flex-1 accent-[#1A5276]"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 p-3 border-t border-[#3A3A4A]">
            <button
              onClick={resetFilters}
              className="flex-1 py-2 bg-[#2A2A3A] hover:bg-[#3A3A4A] text-[#A0A0A0] text-xs rounded transition-colors"
            >
              重置
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 py-2 bg-[#8B2323] hover:bg-[#A52A2A] text-white text-xs rounded transition-colors"
            >
              应用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
