import { AlertTriangle, FlaskConical, ShieldAlert } from "lucide-react";
import type { SafetyNote, SampleRecord } from "@/types";

interface Props {
  notes: SafetyNote[];
  selectedSample: SampleRecord | null;
}

export const SafetySidebar = ({ notes, selectedSample }: Props) => {
  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-ink-100 bg-amber-50/70 px-4 py-3 rounded-t-xl">
        <h3 className="panel-title flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-700" />
          安全备注
        </h3>
        <span className="text-[10px] text-amber-700/80">GHS 规范</span>
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin p-4 space-y-3">
        {notes.map((n, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 ${
              n.hazard === "高"
                ? "border-red-200 bg-red-50"
                : n.hazard === "中"
                  ? "border-amber-200 bg-amber-50"
                  : "border-ink-200 bg-ink-50"
            }`}
          >
            <div className="flex items-start justify-between mb-1.5">
              <div>
                <div className="font-serif text-sm font-semibold text-ink-800 flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5" />
                  {n.chemical}
                </div>
                <div className="font-mono text-xs text-ink-500 mt-0.5">
                  {n.formula}
                </div>
              </div>
              <span
                className={`tag ${
                  n.hazard === "高"
                    ? "bg-red-600 text-white"
                    : n.hazard === "中"
                      ? "bg-amber-500 text-white"
                      : "bg-ink-400 text-white"
                }`}
              >
                {n.hazard}危
              </span>
            </div>
            {n.ghsCode && (
              <div className="mb-2 text-[10px] font-mono text-ink-500">
                {n.ghsCode}
              </div>
            )}
            <div className="text-xs text-ink-700 leading-relaxed">
              <AlertTriangle className="inline h-3 w-3 mr-1 -mt-0.5 text-amber-600" />
              {n.precaution}
            </div>
          </div>
        ))}

        {selectedSample && (
          <div className="mt-4 rounded-lg border border-copper-200 bg-copper-50 p-3 animate-fade-in">
            <div className="text-xs font-semibold text-copper-800 mb-1.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-copper-500" />
              当前关联样本：{selectedSample.sampleNo}
            </div>
            <div className="space-y-1 text-[11px] text-copper-900/80 font-mono">
              <div>体系：{selectedSample.metalIon} + {selectedSample.ligand}</div>
              <div>来源：{selectedSample.sourceDoc}</div>
              {selectedSample.anomalyReason && (
                <div className="text-red-700 pt-1 border-t border-copper-200 mt-1.5">
                  ⚠ {selectedSample.anomalyReason}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
