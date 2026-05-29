import { useStore } from '@/store/useStore';
import { Camera, FileText, Grid3x3 } from 'lucide-react';

export function NotesBar() {
  const notes = useStore((s) => s.notes);
  const gridVisible = useStore((s) => s.gridVisible);
  const anomalies = useStore((s) => s.anomalies);
  const charges = useStore((s) => s.charges);
  const testPoints = useStore((s) => s.testPoints);
  const { setNotes, addSnapshot, toggleGrid } = useStore();

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      addSnapshot(dataUrl);

      const link = document.createElement('a');
      link.download = `电场沙盒_${new Date().toLocaleTimeString('zh-CN').replace(/:/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('截图失败:', e);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10
      bg-[#0d1225]/90 backdrop-blur-md border-t border-cyan-900/30">
      <div className="flex items-center gap-3 px-4 py-2">
        <button
          onClick={toggleGrid}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs
            border transition-colors
            ${gridVisible
              ? 'bg-cyan-900/30 border-cyan-700/40 text-cyan-300'
              : 'bg-transparent border-cyan-900/30 text-cyan-500/50'}`}
        >
          <Grid3x3 size={12} /> 网格
        </button>

        <div className="flex-1 flex items-center gap-2">
          <FileText size={12} className="text-cyan-400/50 shrink-0" />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="课堂备注..."
            className="flex-1 bg-transparent text-xs text-cyan-200 placeholder:text-cyan-600/40
              border-b border-cyan-900/30 focus:border-cyan-600/50 focus:outline-none py-1"
          />
        </div>

        <button
          onClick={handleScreenshot}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs
            bg-cyan-900/30 border border-cyan-700/40 text-cyan-300
            hover:bg-cyan-800/40 transition-colors"
        >
          <Camera size={12} /> 截图
        </button>

        <div className="text-[10px] font-mono text-cyan-500/30">
          {charges.length}q · {testPoints.length}tp · {anomalies.length}异常
        </div>
      </div>
    </div>
  );
}
