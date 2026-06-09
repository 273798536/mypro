import { useState } from "react";
  import { AlertTriangle, AlertOctagon, Info, ChevronDown, ChevronUp } from "lucide-react";
  import { useVolumeStore } from "@/store/useVolumeStore";
  import { Anomaly } from "@/types";

  const TYPE_META: Record<string, { bg: string; border: string; icon: typeof AlertTriangle; iconColor: string }> = {
    large_error: { bg: "bg-brick-50", border: "border-l-brick-400", icon: AlertOctagon, iconColor: "text-brick-500" },
    bad_data: { bg: "bg-brick-50", border: "border-l-brick-500", icon: AlertOctagon, iconColor: "text-brick-600" },
    zero_division: { bg: "bg-amber-50", border: "border-l-amber-400", icon: AlertTriangle, iconColor: "text-amber-600" },
    empty_set: { bg: "bg-mist-50", border: "border-l-mist-400", icon: Info, iconColor: "text-mist-600" },
    draft_gap: { bg: "bg-sand-50", border: "border-l-sand-400", icon: AlertTriangle, iconColor: "text-amber-600" },
  };

  const SEVERITY_DOTS = ["", "bg-mist-400", "bg-amber-400", "bg-brick-400"];

  export default function AnomalyCards() {
    const { currentBatch } = useVolumeStore();
    const anomalies = currentBatch.anomalies ?? [];

    return (
      <div className="bg-white/80 backdrop-blur rounded-lg border border-ink-100 shadow-card animate-fadeUp" style={{ animationDelay: "360ms" }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-100">
          <h3 className="serif text-base font-semibold text-ink-800">异常结论（说人话版）</h3>
          <span className="mono text-xs text-ink-400">{anomalies.length} 条异常</span>
        </div>
        <div className="p-4 space-y-3 max-h-[440px] overflow-y-auto">
          {anomalies.length === 0 ? (
            <p className="serif text-sm text-mist-500 text-center py-8">太棒了，本批次没有任何异常</p>
          ) : (
            anomalies.map((a, i) => (
              <AnomalyCard key={a.id} anomaly={a} index={i} />
            ))
          )}
        </div>
      </div>
    );
  }

  function AnomalyCard({ anomaly, index }: { anomaly: Anomaly; index: number }) {
    const [open, setOpen] = useState(false);
    const meta = TYPE_META[anomaly.type] ?? TYPE_META.draft_gap;
    const Icon = meta.icon;

    return (
      <div
        className={`${meta.bg} ${meta.border} border-l-4 rounded-r-md p-3.5 shadow-card hover:shadow-cardHover hover:scale-[1.01] transition-all cursor-pointer animate-fadeUp`}
        style={{ animationDelay: `${420 + index * 50}ms` }}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-start gap-3">
          <Icon className={`w-4 h-4 ${meta.iconColor} shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${SEVERITY_DOTS[anomaly.severity]}`} />
              <p className="serif text-sm text-ink-800 leading-relaxed font-medium">
                {anomaly.humanMessage}
              </p>
            </div>
            <div className={`overflow-hidden transition-all ${open ? "max-h-40 mt-2" : "max-h-0"}`}>
              {anomaly.detail && (
                <p className="mono text-[11px] text-ink-500 mb-1.5">{anomaly.detail}</p>
              )}
              <p className="serif text-[11px] text-mist-600">建议：{anomaly.suggestion}</p>
            </div>
          </div>
          {open
            ? <ChevronUp className="w-3.5 h-3.5 text-ink-400 shrink-0" />
            : <ChevronDown className="w-3.5 h-3.5 text-ink-400 shrink-0" />}
        </div>
      </div>
    );
  }
