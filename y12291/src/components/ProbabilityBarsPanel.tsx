import { useBlochSphereStore } from '@/store/blochSphereStore';
import { cn } from '@/lib/utils';

const BASIS_LABELS: Record<string, string> = {
  computational: '计算基 (Z)',
  hadamard: 'Hadamard 基 (X)',
  circular: '圆基 (Y)',
  custom: '自定义基',
};

function ProgressBar({ basis, value, confirmed }: { basis: string; value: number; confirmed: boolean }) {
  const pct = Math.min(Math.max(value * 100, 0), 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{basis}</span>
        <span className="font-mono [font-family:JetBrains_Mono,monospace] text-gray-300">{value.toFixed(4)}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-[#1a2236] overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300',
            confirmed ? 'bg-[#00e676]' : 'bg-[#546e7a]')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ProbabilityBarsPanel() {
  const { quantumStates, selectedStateId } = useBlochSphereStore();

  if (!selectedStateId) {
    return (
      <div className="bg-[#0a0e1a] rounded-xl p-6 flex items-center justify-center">
        <span className="text-gray-500 text-sm">请选择量子态</span>
      </div>
    );
  }

  const state = quantumStates[selectedStateId];
  if (!state) {
    return (
      <div className="bg-[#0a0e1a] rounded-xl p-6 flex items-center justify-center">
        <span className="text-gray-500 text-sm">量子态不存在</span>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0e1a] rounded-xl p-4 space-y-3 text-gray-200">
      <h3 className="text-sm font-semibold text-cyan-400">概率分布</h3>

      {!state.measurementBasis ? (
        <div className="rounded border border-amber-700/40 bg-amber-900/10 px-3 py-2">
          <span className="text-amber-400 text-sm">尚未指定测量基</span>
        </div>
      ) : (
        <div className="rounded-lg bg-[#0d1220] border border-gray-800 px-3 py-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">测量基</span>
          <div className="text-sm text-cyan-300 mt-0.5">
            {BASIS_LABELS[state.measurementBasis.type] ?? state.measurementBasis.type}
            {state.measurementBasis.customLabel && ` — ${state.measurementBasis.customLabel}`}
          </div>
        </div>
      )}

      {state.probabilityBars.length === 0 ? (
        <div className="rounded border border-amber-700/40 bg-amber-900/10 px-3 py-2">
          <span className="text-amber-400 text-sm">尚未输入概率数据</span>
        </div>
      ) : (
        <div className="space-y-3">
          {state.probabilityBars.map((bar, i) => (
            <ProgressBar key={`${bar.basis}-${i}`} basis={bar.basis} value={bar.value} confirmed={bar.confirmed} />
          ))}
        </div>
      )}

      {state.probabilityBars.length > 0 && (
        <div className="flex items-center gap-3 text-[10px] text-gray-500 pt-1">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#00e676]" />已确认</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#546e7a]" />未确认</span>
        </div>
      )}
    </div>
  );
}
