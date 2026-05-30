import React, { useRef } from 'react';
import { ArrowUp, Monitor, ArrowRight, Download, RefreshCw, Save, Move } from 'lucide-react';
import { useStageStore } from '@/store/useStageStore';
import { ViewPreset } from '@/types';
import { cn } from '@/utils/cn';
import { exportScreenshot } from '@/utils/exportScreenshot';

const viewPresets: { preset: ViewPreset; label: string; icon: React.ReactNode }[] = [
  { preset: 'perspective', label: '透视', icon: <Move size={16} /> },
  { preset: 'top', label: '顶视', icon: <ArrowUp size={16} /> },
  { preset: 'front', label: '正视', icon: <Monitor size={16} /> },
  { preset: 'side', label: '侧视', icon: <ArrowRight size={16} /> },
];

interface ToolbarProps {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export const Toolbar: React.FC<ToolbarProps> = ({ canvasRef }) => {
  const { viewPreset, setViewPreset, runConflictDetection, saveNewVersion, currentVersion } =
    useStageStore();

  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      exportScreenshot(canvas, currentVersion?.name || 'stage');
    }
  };

  const handleSaveVersion = () => {
    const name = prompt('请输入版本名称：', '修改后版本');
    if (name) {
      saveNewVersion(name);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-[#0a0a12] via-[#0a0a12]/95 to-transparent flex items-center justify-between px-6 pb-2">
      <div className="flex items-center gap-1 bg-[#16213e]/80 rounded-lg p-1 backdrop-blur-sm">
        <span className="text-xs text-gray-400 px-2">视角</span>
        <div className="flex gap-1">
          {viewPresets.map(({ preset, label, icon }) => (
            <button
              key={preset}
              onClick={() => setViewPreset(preset)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs transition-all',
                viewPreset === preset
                  ? 'bg-[#e94560] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              )}
              title={label}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={runConflictDetection}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded transition-all"
        >
          <RefreshCw size={14} />
          重新检测
        </button>

        <button
          onClick={handleSaveVersion}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f4c5c] hover:bg-[#0f4c5c]/80 text-white text-xs rounded transition-all"
        >
          <Save size={14} />
          保存版本
        </button>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-[#e94560] hover:bg-[#e94560]/80 text-white text-xs rounded transition-all"
        >
          <Download size={14} />
          导出截图
        </button>
      </div>
    </div>
  );
};
