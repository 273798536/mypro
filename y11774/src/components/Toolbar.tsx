import { RotateCcw, Play, Pause, Camera, FileText, Maximize2 } from 'lucide-react';
import { useAssetStore } from '@/store/useAssetStore';

interface ToolbarProps {
  onScreenshot: () => void;
  onExportReport: () => void;
}

export default function Toolbar({ onScreenshot, onExportReport }: ToolbarProps) {
  const { isAutoRotating, setAutoRotating } = useAssetStore();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl">
        <div className="flex items-center gap-2 pr-4 border-r border-gray-700/50">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white">资产相关性星云</h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-cyan-500/20 text-cyan-400 rounded-full">
              Web3D
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoRotating(!isAutoRotating)}
            className={`p-2 rounded-lg transition-all ${
              isAutoRotating
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            title={isAutoRotating ? '暂停自动旋转' : '开始自动旋转'}
          >
            {isAutoRotating ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>

          <button
            className="p-2 text-gray-400 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
            title="重置视角"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            className="p-2 text-gray-400 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
            title="全屏"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-gray-700/50" />

        <div className="flex items-center gap-1">
          <button
            onClick={onScreenshot}
            className="p-2 text-gray-400 hover:bg-white/10 hover:text-white rounded-lg transition-colors group"
            title="导出截图"
          >
            <Camera className="w-4 h-4 group-hover:text-cyan-400 transition-colors" />
          </button>

          <button
            onClick={onExportReport}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>导出报告</span>
          </button>
        </div>
      </div>
    </div>
  );
}
