import { Camera, RotateCcw, Download, Eye, EyeOff, Info } from 'lucide-react';
import { useStore } from '../../store/useStore';
import html2canvas from 'html2canvas';

export const Toolbar = () => {
  const { showDetailPanel, toggleDetailPanel, showAlertPanel, toggleAlertPanel, filteredFunds } = useStore();

  const handleExportImage = async () => {
    const sceneElement = document.getElementById('scene-container');
    if (sceneElement) {
      try {
        const canvas = await html2canvas(sceneElement, {
          backgroundColor: '#0a1628',
          scale: 2
        });
        const link = document.createElement('a');
        link.download = `基金组合风险星图-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (error) {
        console.error('导出图片失败:', error);
      }
    }
  };

  const handleResetView = () => {
    window.location.reload();
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-2 flex items-center gap-2 z-10">
      <div className="flex items-center gap-1 pr-3 border-r border-gray-700/50">
        <span className="text-xs text-gray-400 mr-2">显示:</span>
        <button
          onClick={toggleAlertPanel}
          className={`p-2 rounded-lg transition-all ${
            showAlertPanel
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
          title="切换警告面板"
        >
          <Info className="w-4 h-4" />
        </button>
        <button
          onClick={toggleDetailPanel}
          className={`p-2 rounded-lg transition-all ${
            showDetailPanel
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
          title="切换明细面板"
        >
          {showDetailPanel ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center gap-1 pr-3 border-r border-gray-700/50">
        <button
          onClick={handleResetView}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all"
          title="重置视角"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleExportImage}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all"
          title="导出图片"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm">导出</span>
        </button>
      </div>

      <div className="pl-3 border-l border-gray-700/50">
        <span className="text-xs text-gray-500">
          共 <span className="text-cyan-400">{filteredFunds.length}</span> 只基金
        </span>
      </div>
    </div>
  );
};
