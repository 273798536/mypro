import {
  Eye,
  EyeOff,
  Flame,
  AlertTriangle,
  Tag,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { HeatDimension } from '../types';

export function ControlPanel() {
  const {
    showHeatmap,
    showConflicts,
    showLabels,
    heatDimension,
    setShowHeatmap,
    setShowConflicts,
    setShowLabels,
    setHeatDimension,
  } = useStore();

  const dimensions: { value: HeatDimension; label: string; desc: string }[] = [
    { value: 'frequency', label: '出入库频次', desc: '按操作次数计算' },
    { value: 'turnover', label: '周转率', desc: '按出库权重计算' },
    { value: 'weight', label: '重量维度', desc: '按货物重量计算' },
  ];

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-700 p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="text-sm font-bold text-gray-300 uppercase tracking-wider">
        显示控制
      </div>

      <button
        onClick={() => setShowHeatmap(!showHeatmap)}
        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
          showHeatmap
            ? 'bg-blue-900/50 border-blue-500 text-blue-300'
            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
        }`}
      >
        {showHeatmap ? <Flame size={18} /> : <Flame size={18} className="opacity-50" />}
        <div className="text-left">
          <div className="text-sm font-medium">货位热图</div>
          <div className="text-xs opacity-70">显示热度颜色</div>
        </div>
      </button>

      <button
        onClick={() => setShowConflicts(!showConflicts)}
        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
          showConflicts
            ? 'bg-red-900/50 border-red-500 text-red-300'
            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
        }`}
      >
        {showConflicts ? (
          <AlertTriangle size={18} />
        ) : (
          <AlertTriangle size={18} className="opacity-50" />
        )}
        <div className="text-left">
          <div className="text-sm font-medium">冲突标记</div>
          <div className="text-xs opacity-70">高亮问题货位</div>
        </div>
      </button>

      <button
        onClick={() => setShowLabels(!showLabels)}
        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
          showLabels
            ? 'bg-green-900/50 border-green-500 text-green-300'
            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
        }`}
      >
        {showLabels ? <Tag size={18} /> : <Tag size={18} className="opacity-50" />}
        <div className="text-left">
          <div className="text-sm font-medium">货位标签</div>
          <div className="text-xs opacity-70">悬停显示详情</div>
        </div>
      </button>

      <div className="border-t border-gray-700 pt-4">
        <div className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">
          热度维度
        </div>
        <div className="flex flex-col gap-2">
          {dimensions.map((dim) => (
            <button
              key={dim.value}
              onClick={() => setHeatDimension(dim.value)}
              className={`p-2 rounded text-left transition-all ${
                heatDimension === dim.value
                  ? 'bg-orange-900/50 border border-orange-500 text-orange-300'
                  : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              <div className="text-sm font-medium">{dim.label}</div>
              <div className="text-xs opacity-70">{dim.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4">
        <div className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">
          图例说明
        </div>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-gray-400">货位重复</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span className="text-gray-400">高度遮挡</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-500"></div>
            <span className="text-gray-400">数据不匹配</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-dashed border-yellow-500"></div>
            <span className="text-gray-400">被遮挡货位</span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4 mt-auto">
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <RefreshCw size={12} />
          <span>鼠标拖拽旋转，滚轮缩放</span>
        </div>
      </div>
    </div>
  );
}
