import { WaterQualityWarning } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  warning: WaterQualityWarning;
  expanded: boolean;
  onToggle: () => void;
}

export default function FormulaBlock({ warning, expanded, onToggle }: Props) {
  return (
    <div className="space-y-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left text-sm text-ocean-200 hover:text-ocean-50 transition-colors"
      >
        <span className="font-medium">计算公式与说明</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="space-y-4 animate-float-in">
          <div className="formula-block">
            <div className="text-ocean-500 text-xs mb-2 font-medium tracking-wider uppercase">
              Formula
            </div>
            <div className="text-ocean-50 font-mono text-base">
              {warning.formula}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-ocean-500 text-xs font-medium tracking-wider uppercase">
              变量释义
            </div>
            <div className="grid grid-cols-2 gap-2">
              {warning.variables.map((v) => (
                <div
                  key={v.name}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-ocean-900/50 border border-ocean-600/20"
                >
                  <div>
                    <span className="font-mono text-ocean-500 text-sm">
                      {v.name}
                    </span>
                    <span className="text-ocean-300/70 text-xs ml-2">
                      {v.label}
                    </span>
                  </div>
                  <span className="text-ocean-50 font-mono text-sm">
                    {v.value === null || v.value === undefined ? "—" : v.value}
                    <span className="text-ocean-400 text-xs ml-1">{v.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-ocean-500/10 border border-ocean-500/20">
            <div className="text-ocean-500 text-xs font-medium tracking-wider uppercase mb-1.5">
              公式含义
            </div>
            <p className="text-sm text-ocean-100/90 leading-relaxed">
              {warning.formulaDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 rounded-lg bg-quality-available/10 border border-quality-available/20">
              <div className="text-quality-available text-xs font-medium tracking-wider uppercase mb-1.5">
                适用范围
              </div>
              <p className="text-sm text-ocean-100/90 leading-relaxed">
                {warning.applicableScope}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-quality-recollect/10 border border-quality-recollect/20">
              <div className="text-quality-recollect text-xs font-medium tracking-wider uppercase mb-1.5">
                失败原因与假阳性
              </div>
              <p className="text-sm text-ocean-100/90 leading-relaxed">
                {warning.failureReason}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
