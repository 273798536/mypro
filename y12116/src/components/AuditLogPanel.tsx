import { useFractalStore } from "@/store/useFractalStore";
import type { AuditEntry } from "@/types";
import { Clock, ArrowRight, Filter, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function AuditLogPanel() {
  const { auditLog, showAuditPanel, setShowAuditPanel } = useFractalStore();
  const [filter, setFilter] = useState("");
  const [loadedLog, setLoadedLog] = useState<AuditEntry[]>(auditLog);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("fractal_audit_log") || "[]");
      if (stored.length > auditLog.length) {
        setLoadedLog(stored);
      } else {
        setLoadedLog(auditLog);
      }
    } catch {
      setLoadedLog(auditLog);
    }
  }, [auditLog]);

  const filtered = filter
    ? loadedLog.filter(
        (e) =>
          e.targetFieldName.includes(filter) ||
          e.reason.includes(filter) ||
          String(e.oldValue).includes(filter) ||
          String(e.newValue).includes(filter)
      )
    : loadedLog;

  if (!showAuditPanel) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-slate-900 border-l border-slate-700/50 shadow-2xl z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-200">修正留痕</h2>
          <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">{filtered.length}</span>
        </div>
        <button onClick={() => setShowAuditPanel(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="px-4 py-2 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <Filter size={10} className="text-slate-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="筛选字段/原因..."
            className="flex-1 text-xs bg-slate-800 border border-slate-700/50 rounded px-2 py-1.5 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
        {filtered.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-8">暂无修正记录</div>
        )}
        {filtered.map((entry) => (
          <AuditCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function AuditCard({ entry }: { entry: AuditEntry }) {
  const time = new Date(entry.timestamp);
  const timeStr = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}:${time.getSeconds().toString().padStart(2, "0")}`;

  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono text-slate-500">{timeStr}</span>
        <span className="text-[9px] text-slate-600">{entry.operator}</span>
      </div>
      <div className="text-[11px] text-slate-300 font-mono mb-1.5">{entry.targetFieldName}</div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-red-400/80 font-mono bg-red-500/5 px-1.5 py-0.5 rounded">{String(entry.oldValue)}</span>
        <ArrowRight size={10} className="text-slate-500 shrink-0" />
        <span className="text-emerald-400/80 font-mono bg-emerald-500/5 px-1.5 py-0.5 rounded">{String(entry.newValue)}</span>
      </div>
      <div className="text-[9px] text-slate-500 mt-1.5">{entry.reason}</div>
      {entry.relatedValidationId && (
        <div className="text-[9px] text-amber-400/60 mt-1">关联校验: {entry.relatedValidationId.slice(0, 8)}</div>
      )}
    </div>
  );
}
