import { useState } from 'react';
import { Upload, Save, Camera, Trash2, Play, Grid3X3, Layers, FileJson, Scale } from 'lucide-react';
import { useLogStore } from '../../store/useLogStore';
import { useSceneStore } from '../../store/useSceneStore';
import { useViewStore } from '../../store/useViewStore';
import type { TrainingLogEntry } from '../../types';

interface LeftPanelProps {
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
}

export function LeftPanel({ cameraPosition, cameraTarget }: LeftPanelProps) {
  const [viewName, setViewName] = useState('');
  const { logEntries, selectedParams, loadLog, clearLog } = useLogStore();
  const { showWireframe, useLogScale, toggleWireframe, toggleLogScale, generateTerrain } = useSceneStore();
  const { viewPresets, saveView, restoreView, deleteView, exportScreenshot } = useViewStore();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (Array.isArray(data)) {
            loadLog(data as TrainingLogEntry[]);
            generateTerrain(data as TrainingLogEntry[], 'step', 'learningRate');
          }
        } catch (err) {
          alert('日志文件格式错误');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSaveView = () => {
    if (viewName.trim()) {
      saveView(viewName, cameraPosition, cameraTarget);
      setViewName('');
    }
  };

  const handleRestoreView = (id: string) => {
    restoreView(id);
  };

  return (
    <div className="glass-panel w-72 h-full p-4 flex flex-col gap-4 overflow-y-auto scrollbar-thin">
      <div>
        <h2 className="text-primary-400 font-bold text-sm mb-3 flex items-center gap-2">
          <FileJson size={16} />
          训练日志
        </h2>
        <div className="space-y-2">
          <label className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-primary-900/50 border border-primary-700/30 rounded cursor-pointer hover:bg-primary-800/50 hover:border-primary-600/50 transition-all text-sm">
            <Upload size={16} />
            <span>上传日志文件</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
          
          {logEntries.length > 0 && (
            <>
              <div className="text-xs text-gray-400">
                共 {logEntries.length} 条记录
              </div>
              <button
                onClick={clearLog}
                className="w-full py-1 px-2 text-xs text-red-400 border border-red-800/50 rounded hover:bg-red-900/30 transition-all"
              >
                清除日志
              </button>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-primary-800/30 pt-4">
        <h2 className="text-primary-400 font-bold text-sm mb-3 flex items-center gap-2">
          <Layers size={16} />
          显示设置
        </h2>
        <div className="space-y-2">
          <button
            onClick={toggleWireframe}
            className={`w-full flex items-center gap-2 py-2 px-3 rounded text-sm transition-all ${
              showWireframe ? 'bg-primary-700/50 border-primary-500 border text-primary-300' : 'bg-primary-900/30 border border-primary-800/30 text-gray-400 hover:bg-primary-800/30'
            }`}
          >
            <Grid3X3 size={14} />
            线框模式
          </button>
          
          <button
            onClick={toggleLogScale}
            className={`w-full flex items-center gap-2 py-2 px-3 rounded text-sm transition-all ${
              useLogScale ? 'bg-primary-700/50 border-primary-500 border text-primary-300' : 'bg-primary-900/30 border border-primary-800/30 text-gray-400 hover:bg-primary-800/30'
            }`}
          >
            <Scale size={14} />
            对数缩放
          </button>
        </div>
      </div>

      <div className="border-t border-primary-800/30 pt-4">
        <h2 className="text-primary-400 font-bold text-sm mb-3 flex items-center gap-2">
          <Camera size={16} />
          视角管理
        </h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder="视角名称"
            className="flex-1 py-1 px-2 bg-primary-900/50 border border-primary-700/30 rounded text-sm text-white placeholder-gray-500"
          />
          <button
            onClick={handleSaveView}
            disabled={!viewName.trim()}
            className="p-2 bg-primary-600 rounded hover:bg-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
          </button>
        </div>
        
        <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
          {viewPresets.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-2">暂无保存的视角</div>
          ) : (
            viewPresets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center gap-2 py-1 px-2 bg-primary-900/30 rounded group"
              >
                <button
                  onClick={() => handleRestoreView(preset.id)}
                  className="flex-1 text-left text-sm text-gray-300 hover:text-primary-300 truncate"
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => deleteView(preset.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-primary-800/30 pt-4 mt-auto">
        <button
          onClick={exportScreenshot}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary-600 hover:bg-primary-500 rounded text-sm font-medium transition-all"
        >
          <Camera size={16} />
          导出截图
        </button>
      </div>
    </div>
  );
}
