import { useFractalStore } from "@/store/useFractalStore";
import type { ConflictEntry } from "@/types";
import { AlertTriangle, Check, X } from "lucide-react";

export default function ConflictPanel() {
  const { conflicts, resolveConflict, setShowConflictPanel } = useFractalStore();
  const unresolved = conflicts.filter((c) => !c.resolved);

  if (unresolved.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-amber-500/5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-400" />
            <h2 className="text-base font-semibold text-amber-200">规则与图形冲突</h2>
            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{unresolved.length} 项</span>
          </div>
          <button onClick={() => setShowConflictPanel(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-slate-400">迭代规则与初始图形可能由不同人维护，以下字段存在冲突，请手动选择使用哪一边的值。</p>
          {unresolved.map((c) => (
            <ConflictCard key={c.field} conflict={c} onResolve={resolveConflict} />
          ))}
        </div>

        <div className="px-6 py-3 border-t border-slate-700/50 flex justify-end">
          <button
            onClick={() => setShowConflictPanel(false)}
            className="text-xs px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
          >
            暂时跳过
          </button>
        </div>
      </div>
    </div>
  );
}

function ConflictCard({ conflict, onResolve }: { conflict: ConflictEntry; onResolve: (field: string, choice: "rule" | "shape") => void }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="text-xs font-mono text-slate-400 mb-3">字段: {conflict.field}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
        <div className="bg-slate-900/80 border border-slate-600/30 rounded-lg p-3">
          <div className="text-[10px] text-emerald-400 mb-1.5 font-semibold uppercase tracking-wider">迭代规则</div>
          <div className="text-sm text-slate-200 font-mono">{String(conflict.ruleValue)}</div>
          <button
            onClick={() => onResolve(conflict.field, "rule")}
            className="mt-3 w-full text-xs px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-600/30 transition-colors flex items-center justify-center gap-1"
          >
            <Check size={12} /> 选规则
          </button>
        </div>
        <div className="flex items-center text-amber-400">
          <AlertTriangle size={16} />
        </div>
        <div className="bg-slate-900/80 border border-slate-600/30 rounded-lg p-3">
          <div className="text-[10px] text-blue-400 mb-1.5 font-semibold uppercase tracking-wider">初始图形</div>
          <div className="text-sm text-slate-200 font-mono">{String(conflict.shapeValue)}</div>
          <button
            onClick={() => onResolve(conflict.field, "shape")}
            className="mt-3 w-full text-xs px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-1"
          >
            <Check size={12} /> 选图形
          </button>
        </div>
      </div>
    </div>
  );
}
