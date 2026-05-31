import { useState } from 'react';
import { Camera, Download, Upload, RotateCcw, HelpCircle } from 'lucide-react';
import { takeScreenshot, exportConfig, importConfig } from '@/utils/export';
import { useMagneticStore } from '@/store/magneticStore';

interface ToolbarProps {
  canvas: HTMLCanvasElement | null;
  onShowHelp: () => void;
}

export function Toolbar({ canvas, onShowHelp }: ToolbarProps) {
  const { getConfig, loadConfig } = useMagneticStore();
  const [exportStatus, setExportStatus] = useState<string>('');

  const handleScreenshot = () => {
    if (canvas) {
      takeScreenshot(canvas);
      setExportStatus('截图已导出');
      setTimeout(() => setExportStatus(''), 2000);
    }
  };

  const handleExportConfig = () => {
    const config = getConfig();
    exportConfig({
      ...config,
      showFieldLines: true,
      showStrengthLabels: false,
      syncFilters: true
    });
    setExportStatus('配置已导出');
    setTimeout(() => setExportStatus(''), 2000);
  };

  const handleImportConfig = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const config = await importConfig(file);
          loadConfig(config);
          setExportStatus('配置已导入');
          setTimeout(() => setExportStatus(''), 2000);
        } catch {
          setExportStatus('导入失败');
          setTimeout(() => setExportStatus(''), 2000);
        }
      }
    };
    input.click();
  };

  const handleReset = () => {
    window.location.reload();
  };

  return (
    <div className="h-14 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">磁</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">物理磁场线讲台</h1>
            <p className="text-[10px] text-gray-500">Web3D Interactive Magnetic Field</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {exportStatus && (
          <span className="text-xs text-green-400 mr-2 animate-pulse">
            {exportStatus}
          </span>
        )}

        <button
          onClick={handleScreenshot}
          className="p-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-cyan-400 rounded-lg transition-colors"
          title="导出截图"
        >
          <Camera size={18} />
        </button>

        <button
          onClick={handleExportConfig}
          className="p-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-cyan-400 rounded-lg transition-colors"
          title="导出配置"
        >
          <Download size={18} />
        </button>

        <button
          onClick={handleImportConfig}
          className="p-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-cyan-400 rounded-lg transition-colors"
          title="导入配置"
        >
          <Upload size={18} />
        </button>

        <div className="w-px h-6 bg-gray-700 mx-1" />

        <button
          onClick={handleReset}
          className="p-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-yellow-400 rounded-lg transition-colors"
          title="重置场景"
        >
          <RotateCcw size={18} />
        </button>

        <button
          onClick={onShowHelp}
          className="p-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-cyan-400 rounded-lg transition-colors"
          title="使用帮助"
        >
          <HelpCircle size={18} />
        </button>
      </div>
    </div>
  );
}
