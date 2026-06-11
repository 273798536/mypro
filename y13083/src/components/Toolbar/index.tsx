import { Anchor, FileDown, RotateCcw, AlertTriangle } from 'lucide-react';
import { useAppStore, getFilteredObjects } from '@/store/useAppStore';
import { generateMarkdownReport, downloadTextFile } from '@/utils/markdown';
import { formatNow } from '@/utils/helpers';
import { cn } from '@/lib/utils';

export default function Toolbar() {
  const { objects, layers, notes, filterState, resetAll, focusObject } = useAppStore();
  const visibleObjects = getFilteredObjects(objects, layers, filterState);

  const abnormalCount = visibleObjects.filter((o) => o.isAbnormal).length;
  const overlapCount = visibleObjects.filter((o) => o.isOverlapping).length;
  const noteCount = notes.filter((n) =>
    visibleObjects.some((o) => o.id === n.objectId),
  ).length;

  const handleExport = () => {
    const content = generateMarkdownReport({
      objects: visibleObjects,
      layers,
      notes,
      filter: filterState,
      generatedAt: formatNow(),
    });
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    downloadTextFile(`码头危险品库报告-${timestamp}.md`, content);
  };

  const handleFocusAbnormal = () => {
    const firstAbnormal = visibleObjects.find((o) => o.isAbnormal);
    if (firstAbnormal) focusObject(firstAbnormal.id);
  };

  const btnBase =
    'flex items-center gap-1.5 h-9 px-3 text-sm font-medium border-2 transition-colors';

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-4',
        'bg-slate-950/95 backdrop-blur',
        'border-b border-[#1e293b]',
      )}
    >
      <div className="flex items-center gap-2.5">
        <Anchor className="w-5 h-5 text-cyan-400" strokeWidth={2} />
        <span
          className="text-cyan-400 text-base tracking-wide"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          码头危险品库剖面讲解
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-slate-400">
          异常<span className="text-red-400 font-semibold ml-1">{abnormalCount}</span>个
        </span>
        <span className="w-px h-3 bg-slate-700" />
        <span className="text-slate-400">
          重叠<span className="text-yellow-400 font-semibold ml-1">{overlapCount}</span>个
        </span>
        <span className="w-px h-3 bg-slate-700" />
        <span className="text-slate-400">
          备注<span className="text-cyan-400 font-semibold ml-1">{noteCount}</span>条
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className={cn(
            btnBase,
            'border-cyan-700 text-cyan-400 hover:bg-cyan-950/60',
          )}
        >
          <FileDown className="w-4 h-4" strokeWidth={2} />
          导出报告
        </button>
        <button
          onClick={resetAll}
          className={cn(
            btnBase,
            'border-slate-600 text-slate-300 hover:bg-slate-800/60',
          )}
        >
          <RotateCcw className="w-4 h-4" strokeWidth={2} />
          重置视图
        </button>
        <button
          onClick={handleFocusAbnormal}
          className={cn(
            btnBase,
            'border-red-700 text-red-400 hover:bg-red-950/50',
          )}
        >
          <AlertTriangle className="w-4 h-4" strokeWidth={2} />
          聚焦异常
        </button>
      </div>
    </div>
  );
}
