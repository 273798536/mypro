import type { TraceNode } from "@/data/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, FileSearch, Database, ClipboardCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const KIND_META = {
  anomaly: { icon: AlertTriangle, color: "text-amber-300", ring: "border-amber-500/40", bg: "bg-amber-500/10" },
  sample: { icon: FileSearch, color: "text-sky-300", ring: "border-sky-500/40", bg: "bg-sky-500/10" },
  training: { icon: Database, color: "text-rose-300", ring: "border-rose-500/40", bg: "bg-rose-500/10" },
  opinion: { icon: ClipboardCheck, color: "text-emerald-300", ring: "border-emerald-500/40", bg: "bg-emerald-500/10" },
} as const;

const KIND_LABEL: Record<TraceNode["kind"], string> = {
  anomaly: "异常",
  sample: "样本",
  training: "训练样本",
  opinion: "处理意见",
};

export function TraceChain({ chain }: { chain: TraceNode[] }) {
  const navigate = useNavigate();

  return (
    <ol className="relative ml-3 stagger">
      {chain.map((node, i) => {
        const meta = KIND_META[node.kind];
        const Icon = meta.icon;
        const isLast = i === chain.length - 1;
        const clickable = node.kind === "sample" || node.kind === "training";
        return (
          <li key={i} className="relative pl-9 pb-6 last:pb-0">
            {/* connector */}
            {!isLast && (
              <span className="absolute left-[14px] top-7 h-[calc(100%-1.25rem)] w-px bg-gradient-to-b from-edge2 to-transparent" />
            )}
            {/* node dot */}
            <span
              className={cn(
                "absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border",
                meta.ring,
                meta.bg,
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", meta.color)} />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow !text-faint">{KIND_LABEL[node.kind]}</span>
              <span className="font-display text-base text-cream">{node.label}</span>
              <span
                className={cn(
                  "font-mono text-[0.7rem]",
                  node.kind === "training" ? "text-rose-300/80" : "text-faint",
                )}
              >
                {node.refId}
              </span>
              {clickable && (
                <button
                  onClick={() =>
                    node.kind === "sample"
                      ? navigate(`/samples/${node.refId}`)
                      : undefined
                  }
                  className={cn(
                    "font-mono text-[0.65rem] uppercase tracking-wider2 transition-colors",
                    node.kind === "sample"
                      ? "text-sky-400 hover:text-sky-300"
                      : "text-faint",
                  )}
                >
                  {node.kind === "sample" ? "查看详情 →" : ""}
                </button>
              )}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{node.detail}</p>
            <p className="mt-1 text-xs italic text-faint">↳ {node.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}
