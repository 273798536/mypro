import { useFractalStore } from "@/store/useFractalStore";
import { AlertTriangle, AlertOctagon, Palette, Zap, ChevronRight, CheckCircle2, X } from "lucide-react";
import type { ValidationResult } from "@/types";
import { useState } from "react";

export default function ValidationStatusBar() {
  const { validations } = useFractalStore();
  const [expanded, setExpanded] = useState(false);
  const errors = validations.filter((v) => v.severity === "error");
  const warnings = validations.filter((v) => v.severity === "warning");

  if (validations.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <CheckCircle2 size={14} className="text-emerald-400" />
        <span className="text-xs text-emerald-300 font-mono">所有校验通过</span>
      </div>
    );
  }

  const borderColor = errors.length > 0 ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5";
  const iconColor = errors.length > 0 ? "text-red-400" : "text-amber-400";

  return (
    <div className={`rounded-lg border ${borderColor} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          {errors.length > 0 ? <AlertOctagon size={14} className={iconColor} /> : <AlertTriangle size={14} className={iconColor} />}
          <span className={`text-xs font-mono ${iconColor}`}>
            {errors.length} 个错误 · {warnings.length} 个警告
          </span>
        </div>
        <ChevronRight size={12} className={`text-slate-500 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-700/30 px-3 py-2 space-y-1.5 max-h-48 overflow-y-auto">
          {validations.map((v) => (
            <ValidationItem key={v.id} result={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function ValidationItem({ result }: { result: ValidationResult }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const iconMap = {
    iteration_explosion: <Zap size={11} />,
    rule_illegal: <AlertOctagon size={11} />,
    color_overlap: <Palette size={11} />,
  };
  const colorMap = {
    error: "text-red-400 bg-red-500/10 border-red-500/20",
    warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className={`flex items-start gap-2 px-2.5 py-2 rounded-md border ${colorMap[result.severity]}`}>
      <div className="mt-0.5 shrink-0">{iconMap[result.type]}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] leading-snug">{result.message}</div>
        <div className="text-[9px] mt-1 opacity-60 font-mono">
          指回: {result.sourceFieldName}
        </div>
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 opacity-40 hover:opacity-100 transition-opacity">
        <X size={10} />
      </button>
    </div>
  );
}
