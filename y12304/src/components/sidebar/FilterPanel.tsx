import { Search, Filter, X, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { ObjectType, AlarmLevel } from '../../types';
import { useFilterStore } from '../../store/useFilterStore';

const objectTypeLabels: Record<ObjectType, { label: string; color: string }> = {
  rack: { label: '机柜', color: 'bg-cyan-500' },
  vent: { label: '风口', color: 'bg-green-500' },
  tray: { label: '桥架', color: 'bg-purple-500' },
  sensor: { label: '探头', color: 'bg-orange-500' },
};

const alarmLevelLabels: Record<AlarmLevel, { label: string; color: string }> = {
  critical: { label: '严重', color: 'bg-red-500' },
  warning: { label: '警告', color: 'bg-orange-500' },
  info: { label: '信息', color: 'bg-blue-500' },
};

export function FilterPanel() {
  const {
    selectedTypes,
    alarmLevels,
    searchKeyword,
    toggleType,
    toggleAlarmLevel,
    setSearchKeyword,
    resetFilters,
  } = useFilterStore();

  return (
    <div className="border-b border-gray-700/50">
      <div className="px-4 py-3 border-b border-gray-700/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-200">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">筛选条件</span>
          </div>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-cyan-400 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索告警或设备..."
            className="w-full pl-10 pr-9 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-700/30">
        <div className="text-xs text-gray-400 mb-2">对象类型</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(objectTypeLabels) as ObjectType[]).map((type) => {
            const isSelected = selectedTypes.includes(type);
            const config = objectTypeLabels[type];
            return (
              <motion.button
                key={type}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleType(type)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? `${config.color} text-white shadow-lg`
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white/50' : config.color}`} />
                {config.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="text-xs text-gray-400 mb-2">告警级别</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(alarmLevelLabels) as AlarmLevel[]).map((level) => {
            const isSelected = alarmLevels.includes(level);
            const config = alarmLevelLabels[level];
            return (
              <motion.button
                key={level}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleAlarmLevel(level)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? `${config.color} text-white shadow-lg`
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white/50' : config.color}`} />
                {config.label}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
