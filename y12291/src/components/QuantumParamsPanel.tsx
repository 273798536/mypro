import { useBlochSphereStore } from '@/store/blochSphereStore';

function NormBadge({ isNormalized, delta }: { isNormalized: boolean | null; delta: number | null }) {
  if (isNormalized === true) return <span className="rounded bg-emerald-600/30 text-emerald-400 px-2 py-0.5 text-xs font-medium">已归一</span>;
  if (isNormalized === false) return <span className="rounded bg-red-600/30 text-red-400 px-2 py-0.5 text-xs font-medium">未归一 Δ={delta?.toFixed(4)}</span>;
  return <span className="rounded bg-gray-600/30 text-gray-400 px-2 py-0.5 text-xs font-medium">待确认</span>;
}

function PhaseBadge({ isPhaseInRange, overflow }: { isPhaseInRange: boolean; overflow: number | null }) {
  if (isPhaseInRange) return <span className="rounded bg-emerald-600/30 text-emerald-400 px-2 py-0.5 text-xs font-medium">正常</span>;
  return <span className="rounded bg-amber-600/30 text-amber-400 px-2 py-0.5 text-xs font-medium">越界 +{overflow?.toFixed(4)}</span>;
}

function DataGapBadges({ fields }: { fields: string[] }) {
  if (fields.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {fields.map((f) => (
        <span key={f} className="rounded bg-amber-600/30 text-amber-400 px-2 py-0.5 text-xs font-medium">缺失: {f}</span>
      ))}
    </div>
  );
}

function ParamCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg bg-[#131927] border border-gray-700/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="font-mono [font-family:JetBrains_Mono,monospace] text-lg text-cyan-300">
        {value}{unit && <span className="text-xs text-gray-500 ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}

export default function QuantumParamsPanel() {
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

  const { validationStatus, hasDataGap, dataGapFields } = state;

  return (
    <div className="bg-[#0a0e1a] rounded-xl p-4 space-y-3 text-gray-200">
      <h3 className="text-sm font-semibold text-cyan-400">{state.label} — 参数面板</h3>

      <div className="grid grid-cols-2 gap-2">
        <ParamCard label="θ" value={state.theta.toFixed(4)} unit="rad" />
        <ParamCard label="φ" value={state.phi.toFixed(4)} unit="rad" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ParamCard label="α" value={state.alpha.toFixed(4)} />
        <ParamCard label="β" value={state.beta.toFixed(4)} />
      </div>

      <div className="space-y-2 rounded-lg bg-[#0d1220] border border-gray-800 p-3">
        <div className="text-xs text-gray-500 uppercase tracking-wider">验证状态</div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">归一化:</span>
          <NormBadge isNormalized={validationStatus.isNormalized} delta={validationStatus.normalizationDelta} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">相位:</span>
          <PhaseBadge isPhaseInRange={validationStatus.isPhaseInRange} overflow={validationStatus.phaseOverflow} />
        </div>
      </div>

      {hasDataGap && (
        <div className="space-y-1">
          <div className="text-xs text-gray-500 uppercase tracking-wider">数据缺失</div>
          <DataGapBadges fields={dataGapFields} />
        </div>
      )}
    </div>
  );
}
