import { Download, RefreshCw, BarChart3 } from 'lucide-react';
import { useParamStore } from '@/store/paramStore';
import { useEvidenceStore } from '@/store/evidenceStore';
import { toPng } from 'html-to-image';

interface Props {
  chartAreaRef: React.RefObject<HTMLDivElement | null>;
}

export default function TopBar({ chartAreaRef }: Props) {
  const { activeGroupId, setActiveGroup, resetToFactory } = useParamStore();
  const { getCounts, reset: resetEvidence } = useEvidenceStore();
  const counts = getCounts();

  const handleExport = async () => {
    if (!chartAreaRef.current) return;
    try {
      const dataUrl = await toPng(chartAreaRef.current, {
        pixelRatio: 2,
        backgroundColor: '#f5f1e8',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `马尔可夫链图表解释-${activeGroupId}组-${Date.now()}.png`;
      a.click();
    } catch (e) {
      console.error('导出失败：', e);
    }
  };

  const handleReset = () => {
    if (window.confirm('确定恢复出厂示例数据？所有自定义修改将丢失。')) {
      resetToFactory();
      resetEvidence();
    }
  };

  return (
    <header className="h-14 flex items-center justify-between px-5 bg-academic-navy text-academic-paper border-b-4 border-academic-navy-deep flex-shrink-0">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6" />
        <h1 className="font-serif text-lg font-semibold tracking-wide">
          马尔可夫链图表解释 <span className="text-xs opacity-70 mono">v1.0</span>
        </h1>
        <span className="ml-4 flex items-center gap-1.5 text-xs mono">
          <span className="px-2 py-0.5 rounded-sm bg-success-ink">✅{counts.processed}</span>
          <span className="px-2 py-0.5 rounded-sm bg-late-ochre">📌{counts.pending}</span>
          <span className="px-2 py-0.5 rounded-sm bg-abnormal-brick">⚠️{counts.abnormal}</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-sm overflow-hidden border border-academic-paper/50 p-0.5">
          <button
            onClick={() => setActiveGroup('A')}
            className={`px-4 py-1 font-serif text-sm transition-all ${
              activeGroupId === 'A'
                ? 'bg-academic-paper text-academic-navy font-semibold'
                : 'text-academic-paper/80 hover:text-white'
            }`}
          >
            A组 · 课堂实测
          </button>
          <button
            onClick={() => setActiveGroup('B')}
            className={`px-4 py-1 font-serif text-sm transition-all ${
              activeGroupId === 'B'
                ? 'bg-academic-paper text-academic-navy font-semibold'
                : 'text-academic-paper/80 hover:text-white'
            }`}
          >
            B组 · 含晚到附件
          </button>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-serif border border-academic-paper/40 hover:bg-academic-paper/10 transition-all rounded-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          恢复出厂
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-serif bg-academic-paper text-academic-navy font-semibold hover:bg-white transition-all rounded-sm"
        >
          <Download className="w-4 h-4" />
          导出PNG
        </button>
      </div>
    </header>
  );
}
