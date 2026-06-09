import type { TraceNode } from "../../shared/types";
import { Database, Cog, CheckCircle2, ArrowRight } from "lucide-react";
import { formatDateTime } from "../lib/utils";
import { cn } from "../lib/utils";

const TYPE_CFG = {
  source: { icon: Database, label: "来源", color: "text-accent", bg: "bg-accent/20", border: "border-accent/40" },
  process: { icon: Cog, label: "处理", color: "text-text-primary", bg: "bg-bg-tertiary", border: "border-border-light" },
  result: { icon: CheckCircle2, label: "结果", color: "text-success", bg: "bg-success/20", border: "border-success/40" },
};

export default function TraceTimeline({ trace }: { trace: TraceNode[] }) {
  if (!trace.length) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">暂无追溯链数据</div>
    );
  }
  return (
    <div className="relative pl-2">
      <div className="absolute left-[17px] top-2 bottom-2 w-px bg-gradient-to-b from-accent/50 via-border to-success/50" />
      {trace.map((node, i) => {
        const cfg = TYPE_CFG[node.type];
        const Icon = cfg.icon;
        return (
          <div key={node.id} className="relative pb-5 last:pb-0">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "relative z-10 w-8 h-8 rounded-full flex items-center justify-center border shrink-0",
                  cfg.bg,
                  cfg.border
                )}
              >
                <Icon className={cn("w-4 h-4", cfg.color)} />
              </div>
              <div className="flex-1 panel p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("tag border", cfg.bg, cfg.border, cfg.color)}>
                    {cfg.label}
                  </span>
                  <span className="text-sm font-medium text-text-primary">{node.title}</span>
                </div>
                <p className="text-sm text-text-secondary">{node.description}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-text-muted">
                  <span>{formatDateTime(node.timestamp)}</span>
                  <span className="flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    {node.operator}
                  </span>
                </div>
                {Object.keys(node.metadata).length > 0 && (
                  <div className="mt-2 p-2 bg-bg-primary/60 rounded border border-border text-[11px] font-mono text-text-muted">
                    {Object.entries(node.metadata).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-text-muted/60">{k}:</span>
                        <span className="text-text-secondary">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {i < trace.length - 1 && (
              <div className="absolute left-[30px] top-8 w-px h-5 bg-border-light" />
            )}
          </div>
        );
      })}
    </div>
  );
}
