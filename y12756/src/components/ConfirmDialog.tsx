import { X, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useLabStore } from "@/store/useLabStore";
import type { JudgeResult, SampleRecord } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  candidates: SampleRecord[];
}

export const ConfirmDialog = ({ open, onClose, candidates }: Props) => {
  const { manualConfirm } = useLabStore();
  const [selectedId, setSelectedId] = useState<string | null>(
    candidates[0]?.id || null
  );
  const [result, setResult] = useState<JudgeResult>("络合");

  if (!open) return null;

  const current = candidates.find((s) => s.id === selectedId);

  const handleConfirm = () => {
    if (!selectedId) return;
    manualConfirm(selectedId, result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-panel overflow-hidden">
        <div className="bg-gradient-to-br from-copper-600 to-copper-700 px-5 py-4 text-white flex items-center justify-between">
          <h2 className="font-serif font-semibold text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            人工确认判读结果
          </h2>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg hover:bg-white/10 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {candidates.length === 0 ? (
            <div className="text-center py-6 text-ink-500 text-sm">
              本批次暂无需人工确认的样本
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs uppercase tracking-wider text-ink-500 font-semibold mb-2">
                  选择待确认样本
                </label>
                <div className="space-y-1.5">
                  {candidates.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        selectedId === s.id
                          ? "border-copper-400 bg-copper-50"
                          : "border-ink-200 hover:border-ink-300 hover:bg-ink-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold text-ink-800">
                          {s.sampleNo}
                        </span>
                        <span
                          className={`tag border ${
                            s.judgeResult === "络合"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : s.judgeResult === "未络合"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {s.judgeResult}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-500 mt-1 font-mono">
                        λ={s.peakWavelength}nm · A={s.peakAbsorbance.toFixed(3)}
                        {s.concentration && ` · c=${s.concentration}${s.concentrationUnit || ""}`}
                      </div>
                      {s.anomalyReason && (
                        <div className="text-[11px] text-red-600 mt-1 flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span>{s.anomalyReason}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {current && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-ink-500 font-semibold mb-2">
                    确认判读结果
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["络合", "待确认", "未络合"] as JudgeResult[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setResult(r)}
                        className={`rounded-lg border-2 py-2.5 text-sm font-serif font-semibold transition-all ${
                          result === r
                            ? r === "络合"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : r === "未络合"
                                ? "border-rose-500 bg-rose-50 text-rose-700"
                                : "border-amber-500 bg-amber-50 text-amber-700"
                            : "border-ink-200 text-ink-600 hover:border-ink-300"
                        }`}
                      >
                        {r === "络合" ? (
                          <CheckCircle className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
                        ) : r === "未络合" ? (
                          <XCircle className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
                        )}
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-ink-100 bg-ink-50/50">
          <button onClick={onClose} className="btn-secondary !py-1.5 !text-xs">
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId || candidates.length === 0}
            className="btn-copper !py-1.5 !text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认并记录
          </button>
        </div>
      </div>
    </div>
  );
};
