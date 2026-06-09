import { useState } from "react";
import { Calculator, ChevronDown, ChevronUp, AlertTriangle, Plus } from "lucide-react";
import { useVolumeStore } from "@/store/useVolumeStore";
import { approximateVolume } from "@/utils/approximateVolume";
import { Material } from "@/types";

const FIELD_LABELS: Record<string, string> = {
  length: "长", width: "宽", height: "高", quantity: "数量",
};

export default function CalculationDraft() {
  const { currentBatch, selectedMaterialId, fillDraftGap } = useVolumeStore();
  const [expanded, setExpanded] = useState(true);

  const gaps = currentBatch.draftGaps ?? [];
  const displayMaterial = selectedMaterialId
    ? currentBatch.materials.find((m) => m.id === selectedMaterialId)
    : currentBatch.materials.find((m) => !m.hasDraftGap);

  return (
    <div className="bg-white/80 backdrop-blur rounded-lg border border-ink-100 shadow-card animate-fadeUp" style={{ animationDelay: "300ms" }}>
      <div
        className="flex items-center justify-between px-5 py-3 border-b border-ink-100 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-mist-500" />
          <h3 className="serif text-base font-semibold text-ink-800">计算草稿</h3>
          {displayMaterial && (
            <span className="serif text-xs text-ink-400">· {displayMaterial.name}</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-ink-400" /> : <ChevronDown className="w-4 h-4 text-ink-400" />}
      </div>

      {expanded && (
        <div className="p-5 space-y-5 max-h-[520px] overflow-y-auto">
          {displayMaterial && <DraftSteps material={displayMaterial} />}

          {gaps.length > 0 && (
            <div className="space-y-3">
              <h4 className="serif text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                草稿缺口（已跳过 {gaps.length} 条，不阻塞计算）
              </h4>
              {gaps.map((gap) => {
                const mat = currentBatch.materials.find((m) => m.id === gap.materialId);
                return (
                  <div key={gap.id} className="bg-sand-50 border border-sand-200 rounded-md p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="serif text-sm text-ink-800 mb-0.5">{mat?.name}</div>
                        <div className="serif text-xs text-amber-700 mb-1">
                          缺 <span className="mono font-semibold">{FIELD_LABELS[gap.missingField] ?? gap.missingField}</span> 字段
                        </div>
                        <div className="serif text-[11px] text-ink-500 leading-relaxed">{gap.impactDescription}</div>
                      </div>
                      <GapFiller
                        materialId={gap.materialId}
                        field={gap.missingField}
                        onFill={(v) => fillDraftGap(gap.materialId, gap.missingField, v)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DraftSteps({ material }: { material: Material }) {
  const { currentBatch } = useVolumeStore();
  const matParams = { ...currentBatch.params };
  if (material.boundaryType === "zero_division") matParams.fillRate = 0;
  const result = approximateVolume(material, matParams);

  return (
    <div className="space-y-1.5">
      <h4 className="serif text-xs text-ink-500 mb-2">分步计算公式</h4>
      {result.steps.map((step, i) => (
        <div key={i} className="flex items-baseline gap-3 text-xs py-1 border-b border-ink-50 last:border-0">
          <span className="serif text-ink-500 w-40 shrink-0">{step.label}</span>
          <span className="mono text-ink-800 font-semibold">
            {typeof step.value === "number" && step.value > 1000
              ? step.value.toLocaleString()
              : step.value}
          </span>
          {step.note && (
            <span className="serif text-ink-400 text-[11px]">{step.note}</span>
          )}
        </div>
      ))}
      {result.anomalyMessage && (
        <div className="mt-3 p-2.5 rounded bg-amber-50 border border-amber-100 serif text-xs text-amber-800 leading-relaxed">
          ⓘ {result.anomalyMessage}
        </div>
      )}
    </div>
  );
}

function GapFiller({
  materialId, field, onFill,
}: {
  materialId: string; field: string; onFill: (v: number) => void;
}) {
  const [val, setVal] = useState("");

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <input
        type="number"
        placeholder={FIELD_LABELS[field]}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-20 bg-white border border-sand-300 rounded px-2 py-1 mono text-xs focus:outline-none focus:border-amber-400"
      />
      <button
        onClick={() => {
          const v = Number(val);
          if (!isNaN(v) && v > 0) onFill(v);
        }}
        className="p-1.5 bg-amber-400 hover:bg-amber-500 text-white rounded transition-colors"
        title="补全该字段"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}
