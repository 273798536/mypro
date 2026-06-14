import { useState } from "react";
import { useStore } from "@/store";
import { PenLine, Check, X } from "lucide-react";

export default function AnnotationOverlay() {
  const { anomalies, selectedAnomalyId, annotations, overrideAnomalyJudgment, addAnnotation } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [newJudgment, setNewJudgment] = useState("");
  const [annotationText, setAnnotationText] = useState("");

  const anomaly = anomalies.find((a) => a.id === selectedAnomalyId);
  if (!anomaly) return null;

  const anomalyAnnotations = annotations.filter((a) => a.anomalyId === anomaly.id);

  const handleOverride = () => {
    if (!newJudgment.trim()) return;
    const author = "录音师老许";
    const impactScope = [anomaly.session, anomaly.channel];
    const sourceLine = `${anomaly.id}`;
    addAnnotation(anomaly.id, annotationText || `覆盖判断为：${newJudgment}`, author, impactScope, sourceLine);
    overrideAnomalyJudgment(anomaly.id, newJudgment, author);
    setIsEditing(false);
    setNewJudgment("");
    setAnnotationText("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewJudgment("");
    setAnnotationText("");
  };

  return (
    <div className="bg-surface-800 rounded-lg border border-surface-600 mt-4">
      <div className="px-4 py-3 border-b border-surface-600 flex items-center justify-between">
        <h3 className="font-mono text-sm font-semibold text-zinc-100">批注与覆盖</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-xs text-amber hover:text-amber-light transition-colors"
          >
            <PenLine className="w-3 h-3" />
            覆盖判断
          </button>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-zinc-500">当前判断：</span>
          {anomaly.status === "overridden" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 line-through">{anomaly.originalJudgment}</span>
              <span className="text-xs text-zinc-400">→</span>
              <span className="text-sm text-zinc-200">{anomaly.currentJudgment}</span>
            </div>
          ) : (
            <span className="text-sm text-zinc-200">{anomaly.currentJudgment}</span>
          )}
        </div>

        {isEditing && (
          <div className="bg-surface-700/50 rounded p-3 space-y-3 mb-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">批注内容</label>
              <textarea
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                placeholder="说明覆盖原因..."
                className="w-full bg-surface-700 border border-surface-500 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber resize-none h-16"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">新判断</label>
              <input
                value={newJudgment}
                onChange={(e) => setNewJudgment(e.target.value)}
                placeholder="输入新判断值..."
                className="w-full bg-surface-700 border border-surface-500 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber"
              />
            </div>
            <div className="bg-surface-800 rounded p-2">
              <p className="text-xs text-zinc-500 mb-1">影响范围（自动填充）</p>
              <div className="flex flex-wrap gap-1">
                {[anomaly.session, anomaly.channel].map((scope) => (
                  <span key={scope} className="text-xs bg-amber/10 text-amber px-2 py-0.5 rounded font-mono">
                    {scope}
                  </span>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-2 mb-1">来源行</p>
              <span className="text-xs text-zinc-300 font-mono">{anomaly.id}</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded transition-colors"
              >
                <X className="w-3 h-3" />
                取消
              </button>
              <button
                onClick={handleOverride}
                disabled={!newJudgment.trim()}
                className="flex items-center gap-1 text-xs text-surface-900 bg-amber hover:bg-amber-light disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded font-medium transition-colors"
              >
                <Check className="w-3 h-3" />
                确认覆盖
              </button>
            </div>
          </div>
        )}

        {anomalyAnnotations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">历史批注</p>
            {anomalyAnnotations.map((ann) => (
              <div key={ann.id} className="bg-surface-700/30 rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400 font-mono">{ann.id}</span>
                  <span className="text-xs text-zinc-500">{new Date(ann.createdAt).toLocaleString("zh-CN")}</span>
                </div>
                <p className="text-sm text-zinc-300">{ann.content}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {ann.impactScope.map((scope) => (
                    <span key={scope} className="text-xs bg-surface-600 text-zinc-400 px-1.5 py-0.5 rounded">
                      {scope}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-1 font-mono">来源行: {ann.sourceLine}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
