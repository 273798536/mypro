import { useState } from 'react';
import { Filter, Thermometer, AlertTriangle, Bot, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useFilterStore } from '../../stores/useFilterStore';
import { useDataStore } from '../../stores/useDataStore';
import type { AlertType } from '../../types';

const ALERT_TYPE_OPTIONS: { value: AlertType; label: string; color: string }[] = [
  { value: 'coordinate_flip', label: '坐标翻转', color: 'text-red-400' },
  { value: 'heat_overflow', label: '热度异常', color: 'text-yellow-400' },
  { value: 'trajectory_collision', label: '轨迹穿墙', color: 'text-red-400' },
  { value: 'data_invalid', label: '数据无效', color: 'text-purple-400' },
  { value: 'out_of_bounds', label: '越界警告', color: 'text-yellow-400' },
];

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-200">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
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

export function FilterPanel() {
  const {
    heatThreshold,
    alertTypes,
    showOnlyUnresolved,
    selectedRobots,
    setHeatThreshold,
    toggleAlertType,
    setShowOnlyUnresolved,
    toggleSelectedRobot,
    resetFilters,
  } = useFilterStore();

  const { trajectories, alerts } = useDataStore();

  const robotIds = Array.from(new Set(trajectories.map((t) => t.robotId))).sort();

  const unresolvedCount = alerts.filter((a) => !a.resolved).length;

  return (
    <div className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-white">数据筛选</h2>
          </div>
          <button
            onClick={resetFilters}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="重置筛选"
          >
            <RotateCcw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <CollapsibleSection title="热度阈值" icon={<Thermometer className="w-4 h-4 text-orange-400" />}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2">最小值: {heatThreshold.min}</label>
              <input
                type="range"
                min="0"
                max="100"
                value={heatThreshold.min}
                onChange={(e) => setHeatThreshold(Number(e.target.value), heatThreshold.max)}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">最大值: {heatThreshold.max}</label>
              <input
                type="range"
                min="0"
                max="100"
                value={heatThreshold.max}
                onChange={(e) => setHeatThreshold(heatThreshold.min, Number(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex gap-2">
              <div
                className="flex-1 h-2 rounded"
                style={{
                  background: 'linear-gradient(to right, #1E40AF, #0EA5E9, #10B981, #F59E0B, #EF4444)',
                }}
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={`异常类型 (${unresolvedCount})`}
          icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
        >
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyUnresolved}
                onChange={(e) => setShowOnlyUnresolved(e.target.checked)}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">仅显示未解决</span>
            </label>
            <div className="pt-2 space-y-1">
              {ALERT_TYPE_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alertTypes.includes(option.value)}
                    onChange={() => toggleAlertType(option.value)}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${option.color}`}>{option.label}</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {alerts.filter((a) => a.type === option.value && !a.resolved).length}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="机器人筛选" icon={<Bot className="w-4 h-4 text-green-400" />}>
          <div className="space-y-2">
            {robotIds.map((robotId) => (
              <label key={robotId} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRobots.length === 0 || selectedRobots.includes(robotId)}
                  onChange={() => toggleSelectedRobot(robotId)}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">{robotId}</span>
              </label>
            ))}
            {selectedRobots.length > 0 && (
              <p className="text-xs text-gray-500">已选择 {selectedRobots.length} 个机器人</p>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
