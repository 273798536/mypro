import React from 'react';
import { Settings, Layers, Ruler, BoxSelect } from 'lucide-react';
import { useSandboxStore, yards } from '../../store/useSandboxStore';

export const ControlPanel: React.FC = () => {
  const {
    currentYardId,
    craneRadius,
    minHeightFilter,
    maxHeightFilter,
    setCurrentYardId,
    setCraneRadius,
    setHeightFilter,
  } = useSandboxStore();

  return (
    <div className="w-72 bg-gray-900 border-r border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 text-blue-400">
          <Settings size={20} />
          <h2 className="font-semibold text-lg">参数控制</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-300">
            <Layers size={16} />
            <label className="text-sm font-medium">堆场模型</label>
          </div>
          <select
            value={currentYardId}
            onChange={(e) => setCurrentYardId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
          >
            {yards.map((yard) => (
              <option key={yard.id} value={yard.id}>
                {yard.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            当前: {yards.find((y) => y.id === currentYardId)?.name}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-300">
            <Ruler size={16} />
            <label className="text-sm font-medium">吊机半径</label>
          </div>
          <input
            type="range"
            min="10"
            max="50"
            value={craneRadius}
            onChange={(e) => setCraneRadius(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">10m</span>
            <span className="text-sm font-mono text-blue-400">{craneRadius}m</span>
            <span className="text-xs text-gray-500">50m</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-300">
            <BoxSelect size={16} />
            <label className="text-sm font-medium">箱区高度筛选</label>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-8">最低</span>
              <input
                type="range"
                min="0"
                max="15"
                value={minHeightFilter}
                onChange={(e) => setHeightFilter(Number(e.target.value), maxHeightFilter)}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <span className="text-sm font-mono text-green-400 w-12 text-right">
                {minHeightFilter}m
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-8">最高</span>
              <input
                type="range"
                min="0"
                max="15"
                value={maxHeightFilter}
                onChange={(e) => setHeightFilter(minHeightFilter, Number(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <span className="text-sm font-mono text-orange-400 w-12 text-right">
                {maxHeightFilter}m
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            筛选范围: {minHeightFilter}m - {maxHeightFilter}m
          </p>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">颜色图例</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-gray-400">正常集装箱</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500"></div>
              <span className="text-gray-400">高度预警</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span className="text-gray-400">超高集装箱</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-500"></div>
              <span className="text-gray-400">吊机盲区</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
