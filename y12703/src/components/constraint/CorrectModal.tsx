import { useState } from "react";
import type { SequenceProblem } from "@/types";
import { useStore } from "@/store/useStore";
import { X, CheckCircle } from "lucide-react";
import { formatNumber } from "@/utils/sequence";

interface Props {
  problem: SequenceProblem;
  onClose: () => void;
}

export default function CorrectModal({ problem, onClose }: Props) {
  const { correctProblem } = useStore();
  const baseValues = problem.correctedValues ?? problem.computedValues;
  const [values, setValues] = useState<number[]>([...baseValues]);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (idx: number, raw: string) => {
    const v = parseFloat(raw);
    const next = [...values];
    next[idx] = isNaN(v) ? 0 : v;
    setValues(next);
  };

  const fillWithHistorical = () => {
    setValues([...problem.historicalAnswers]);
    setReason("与历史答案对齐");
  };

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert("请填写修正原因");
      return;
    }
    correctProblem(problem.id, values, reason, "张编辑");
    setSubmitted(true);
    setTimeout(() => onClose(), 800);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-10 shadow-xl animate-modal-in flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-confirm/10 flex items-center justify-center text-confirm">
            <CheckCircle size={32} />
          </div>
          <div className="mt-4 font-serif font-bold text-lg text-ink-800">
            修正已提交
          </div>
          <div className="mt-1 text-sm text-ink-500">状态已自动流转为「已通过」</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-modal-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div>
            <h3 className="font-serif font-bold text-lg text-ink-800">人工修正</h3>
            <p className="text-xs text-ink-500 mt-0.5">
              {problem.id} · {problem.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
          <div className="rounded-lg p-3 bg-ink-50 border border-ink-100">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-ink-600">
                <span className="font-medium text-ink-700">递推公式：</span>
                <span className="math-formula ml-1">{problem.recurrenceFormula}</span>
              </div>
              <button
                onClick={fillWithHistorical}
                className="shrink-0 text-xs px-3 py-1 rounded-md bg-confirm/10 text-confirm hover:bg-confirm/20 transition font-medium"
              >
                一键填入历史答案
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-ink-700 mb-2">
              逐项修正（可直接编辑数值）
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {values.map((v, i) => {
                const isOutlier = problem.outlierIndices.includes(i);
                const changed = Math.abs(v - baseValues[i]) > 1e-9;
                return (
                  <div
                    key={i}
                    className={`rounded-lg border p-2 transition ${
                      isOutlier
                        ? "bg-alert-soft border-alert/30"
                        : changed
                        ? "bg-confirm/5 border-confirm/30"
                        : "bg-white border-ink-100"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-ink-500 mb-1">
                      <span className="font-mono">a{i + 1}</span>
                      {isOutlier && (
                        <span className="text-alert font-medium">越界</span>
                      )}
                      {changed && !isOutlier && (
                        <span className="text-confirm font-medium">已改</span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={v}
                      onChange={(e) => handleChange(i, e.target.value)}
                      className={`w-full text-sm font-mono bg-transparent focus:outline-none ${
                        isOutlier
                          ? "text-alert font-semibold"
                          : changed
                          ? "text-ink-800 font-semibold"
                          : "text-ink-700"
                      }`}
                    />
                    <div className="mt-0.5 text-[10px] text-ink-400 font-mono">
                      原: {formatNumber(baseValues[i])}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-ink-700 mb-1.5">
              修正原因 <span className="text-alert">*</span>
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="请说明修正依据（如：与历史答案对齐、公式推导验证、原题核对等）"
              className="w-full px-3 py-2 text-sm border border-ink-200 rounded-md focus:outline-none focus:border-ink-500 focus:ring-2 focus:ring-ink-100 resize-none"
            />
          </div>

          <div className="rounded-lg p-3 bg-warn-soft/60 border border-warn/20 text-xs text-ink-600">
            <div className="font-medium text-warn mb-0.5">操作将被留痕</div>
            提交后系统将自动记录「修正前 → 修正后」的完整差异，并写入操作日志，状态从「待确认」流转为「已通过」。
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-ink-100 bg-ink-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-ink-600 hover:bg-ink-100 transition"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-md text-sm font-medium bg-ink-700 text-ivory hover:bg-ink-800 transition"
          >
            提交修正
          </button>
        </div>
      </div>
    </div>
  );
}
