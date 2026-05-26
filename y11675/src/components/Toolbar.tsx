import { Camera, RotateCcw, Download, Save, History, Undo2, Redo2, Image } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function Toolbar() {
  const { resetScene, undo, redo, saveSnapshot, history, historyIndex } = useStore();

  const handleExportScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `电磁场实验-${new Date().toISOString().slice(0, 19)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const handleSaveSnapshot = () => {
    const name = prompt('快照名称:', `实验 ${new Date().toLocaleString()}`);
    if (name) {
      const note = prompt('备注说明:', '') || '';
      saveSnapshot(name, note);
    }
  };

  return (
    <div className="h-14 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">电磁场线实验台</h1>
            <p className="text-xs text-slate-500">Web3D 物理教学演示</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="撤销"
        >
          <Undo2 className="w-4 h-4 text-slate-300" />
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="重做"
        >
          <Redo2 className="w-4 h-4 text-slate-300" />
        </button>

        <div className="w-px h-6 bg-slate-700/50 mx-2" />

        <button
          onClick={handleSaveSnapshot}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
          title="保存快照"
        >
          <Save className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-300">快照</span>
        </button>

        <button
          onClick={handleExportScreenshot}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
          title="导出截图"
        >
          <Image className="w-4 h-4 text-green-400" />
          <span className="text-xs text-slate-300">截图</span>
        </button>

        <div className="w-px h-6 bg-slate-700/50 mx-2" />

        <button
          onClick={resetScene}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
          title="重置场景"
        >
          <RotateCcw className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-slate-300">重置</span>
        </button>
      </div>
    </div>
  );
}
