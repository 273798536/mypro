import { useStore } from '@/store/useStore';
import { calculateFieldAt } from '@/utils/fieldCalculation';
import { Crosshair, Trash2, ChevronRight, ChevronLeft, BookOpen } from 'lucide-react';

export function TestPointPanel() {
  const testPoints = useStore((s) => s.testPoints);
  const charges = useStore((s) => s.charges);
  const selectedTestPointId = useStore((s) => s.selectedTestPointId);
  const collapsed = useStore((s) => s.panelCollapsed.right);
  const conclusionChange = useStore((s) => s.conclusionChange);
  const {
    addTestPoint, removeTestPoint, selectTestPoint, togglePanel,
    snapshotConclusion, checkConclusionChanges,
  } = useStore();

  if (collapsed) {
    return (
      <div className="absolute right-0 top-0 h-full w-10 bg-[#0d1225]/90 backdrop-blur-md
        flex items-center justify-center border-l border-cyan-900/30 z-10">
        <button
          onClick={() => togglePanel('right')}
          className="text-cyan-400/70 hover:text-cyan-300 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-[#0d1225]/90 backdrop-blur-md
      border-l border-cyan-900/30 flex flex-col z-10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-900/30">
        <h2 className="text-sm font-bold text-yellow-300 tracking-wide flex items-center gap-2">
          <Crosshair size={14} /> 试探点
        </h2>
        <button
          onClick={() => togglePanel('right')}
          className="text-cyan-400/70 hover:text-cyan-300 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex gap-2 px-4 py-2 border-b border-cyan-900/20">
        <button
          onClick={() => addTestPoint()}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded
            bg-yellow-900/30 hover:bg-yellow-800/40 text-yellow-300 text-xs
            border border-yellow-700/30 transition-colors"
        >
          <Plus size={12} /> 添加试探点
        </button>
        <button
          onClick={() => {
            snapshotConclusion();
          }}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded
            bg-cyan-900/30 hover:bg-cyan-800/40 text-cyan-300 text-xs
            border border-cyan-700/30 transition-colors"
        >
          <BookOpen size={12} /> 基准
        </button>
        <button
          onClick={() => checkConclusionChanges()}
          className="flex items-center justify-center px-3 py-1.5 rounded
            bg-orange-900/30 hover:bg-orange-800/40 text-orange-300 text-xs
            border border-orange-700/30 transition-colors"
        >
          对比
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {testPoints.map((tp) => {
          const isSelected = tp.id === selectedTestPointId;
          const field = calculateFieldAt(tp.position, charges);
          const isExplosion = !isFinite(field.magnitude) || field.magnitude > 500;
          const isWarning = field.magnitude > 100 && field.magnitude <= 500;

          const angleX = Math.atan2(field.vector[1], field.vector[0]) * 180 / Math.PI;
          const angleZ = Math.atan2(
            Math.sqrt(field.vector[0] ** 2 + field.vector[1] ** 2),
            field.vector[2]
          ) * 180 / Math.PI;

          return (
            <div
              key={tp.id}
              onClick={() => selectTestPoint(tp.id)}
              className={`p-2.5 rounded-lg border
                ${isExplosion ? 'border-red-500/60 bg-red-950/20' :
                  isWarning ? 'border-orange-500/40 bg-orange-950/10' :
                  isSelected ? 'border-yellow-500/40 bg-yellow-950/10' :
                  'border-cyan-900/30'}
                cursor-pointer transition-all hover:bg-cyan-900/10`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-yellow-200">
                  试探点 {tp.id.split('_')[1] || tp.id}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTestPoint(tp.id);
                  }}
                  className="text-red-400/50 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="text-[10px] font-mono text-cyan-300/60 mb-1.5">
                位置: ({tp.position[0].toFixed(2)}, {tp.position[1].toFixed(2)}, {tp.position[2].toFixed(2)})
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono">
                <div className="text-cyan-400/50">|E|</div>
                <div className={isExplosion ? 'text-red-400 font-bold' : isWarning ? 'text-orange-400' : 'text-cyan-200'}>
                  {isExplosion ? '∞ 爆炸' : field.magnitude.toFixed(3)}
                </div>

                <div className="text-cyan-400/50">Ex</div>
                <div className="text-cyan-200">{isExplosion ? '—' : field.vector[0].toFixed(3)}</div>

                <div className="text-cyan-400/50">Ey</div>
                <div className="text-cyan-200">{isExplosion ? '—' : field.vector[1].toFixed(3)}</div>

                <div className="text-cyan-400/50">Ez</div>
                <div className="text-cyan-200">{isExplosion ? '—' : field.vector[2].toFixed(3)}</div>

                <div className="text-cyan-400/50">方向</div>
                <div className="text-cyan-200">{isExplosion ? '—' : `${angleX.toFixed(1)}°, ${angleZ.toFixed(1)}°`}</div>
              </div>

              {isExplosion && (
                <div className="mt-1.5 px-2 py-1 rounded bg-red-900/50 border border-red-500/40
                  text-[10px] text-red-300 animate-pulse">
                  ⚠ 场强爆炸：距离电荷过近，E∝1/r² 奇点
                </div>
              )}
            </div>
          );
        })}

        {testPoints.length === 0 && (
          <div className="text-center py-8 text-yellow-500/40 text-xs">
            添加试探点以读取场强
          </div>
        )}
      </div>

      {conclusionChange && (
        <div className={`mx-3 mb-2 p-2.5 rounded-lg border text-[10px] font-mono
          ${conclusionChange.changed
            ? 'bg-orange-950/30 border-orange-500/40 text-orange-200'
            : 'bg-green-950/20 border-green-700/30 text-green-300'}`}>
          <div className="font-bold mb-1 text-xs">
            {conclusionChange.changed ? '⚠ 结论已变更' : '✓ 结论未变更'}
          </div>
          {conclusionChange.details.map((d, i) => (
            <div key={i} className="text-[9px] opacity-80 leading-relaxed">{d}</div>
          ))}
        </div>
      )}

      <div className="px-4 py-2 border-t border-cyan-900/20 text-[10px] text-cyan-500/40">
        {testPoints.length} 个试探点 · 点击"基准"记录当前结论 · 点击"对比"检测变更
      </div>
    </div>
  );
}

function Plus({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
