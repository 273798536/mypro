import { useStore } from '../../store/useStore';
import {
  Upload,
  AlertTriangle,
  Volume2,
  RotateCcw,
  Download,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Database,
} from 'lucide-react';

export default function Toolbar({
  onFileSelect,
  onExportPNG,
  onExportCSV,
}: {
  onFileSelect: (file: File) => void;
  onExportPNG: () => void;
  onExportCSV: () => void;
}) {
  const {
    filters,
    toggleFilter,
    detections,
    data,
    isPlaying,
    setIsPlaying,
    loadMockData,
  } = useStore();

  const unresolvedCount = detections.filter((d) => !d.resolved).length;
  const errorCount = detections.filter((d) => d.severity === 'error' && !d.resolved).length;

  return (
    <div className="h-12 bg-slate-900/80 backdrop-blur border-b border-slate-700/50 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <button
          onClick={loadMockData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
        >
          <Database size={14} />
          模拟数据
        </button>

        <div className="w-px h-5 bg-slate-700 mx-2" />

        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm cursor-pointer transition-colors">
          <Upload size={14} />
          上传数据
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
            }}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => toggleFilter('showBackwardation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
            filters.showBackwardation
              ? 'bg-red-900/40 text-red-300 border border-red-800/50'
              : 'bg-slate-800 text-slate-400 hover:text-slate-300'
          }`}
        >
          <AlertTriangle size={14} />
          倒挂高亮
        </button>

        <button
          onClick={() => toggleFilter('volumeHeatmap')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
            filters.volumeHeatmap
              ? 'bg-green-900/40 text-green-300 border border-green-800/50'
              : 'bg-slate-800 text-slate-400 hover:text-slate-300'
          }`}
        >
          <Volume2 size={14} />
          成交量
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        <button
          onClick={onExportPNG}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
        >
          <Download size={14} />
          截图
        </button>

        <button
          onClick={onExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
        >
          <Download size={14} />
          导出CSV
        </button>
      </div>

      <div className="flex items-center gap-4">
        {errorCount > 0 && (
          <span className="flex items-center gap-1 text-red-400 text-sm">
            <AlertTriangle size={14} />
            {errorCount} 个错误
          </span>
        )}
        {unresolvedCount > 0 && errorCount === 0 && (
          <span className="flex items-center gap-1 text-yellow-400 text-sm">
            <AlertTriangle size={14} />
            {unresolvedCount} 条警告
          </span>
        )}
        <span className="text-slate-500 text-sm">
          {data.length} 条数据
        </span>
      </div>
    </div>
  );
}