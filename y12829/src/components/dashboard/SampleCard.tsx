import { useNavigate } from "react-router-dom";
import { MapPin, Package, ArrowRight, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useSampleStore } from "@/store/useSampleStore";
import { cn } from "@/lib/utils";

type PrimerSample = ReturnType<typeof useSampleStore.getState>["samples"][number];
type MetricItem = PrimerSample["metrics"][number];

interface SampleCardProps {
  sample: PrimerSample;
  delay?: number;
}

const statusConfig = {
  normal: {
    bar: "bg-teal-500",
    badgeBg: "bg-teal-50 text-teal-700 ring-teal-200",
    badgeLabel: "正常",
    badgeIcon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  borderline: {
    bar: "bg-amber-500",
    badgeBg: "bg-amber-50 text-amber-700 ring-amber-200",
    badgeLabel: "边界",
    badgeIcon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  abnormal: {
    bar: "bg-red-500",
    badgeBg: "bg-red-50 text-red-700 ring-red-200",
    badgeLabel: "异常",
    badgeIcon: <XCircle className="h-3.5 w-3.5" />,
  },
};

export default function SampleCard({ sample, delay = 0 }: SampleCardProps) {
  const navigate = useNavigate();
  const cfg = statusConfig[sample.status];
  const gc = sample.metrics.find((m: MetricItem) => m.shortName === "GC%");
  const tm = sample.metrics.find((m: MetricItem) => m.shortName === "Tm");

  return (
    <div
      className={cn(
        "group relative flex overflow-hidden rounded-2xl bg-white shadow-card",
        "transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-fade-in-up"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn("w-2 shrink-0", cfg.bar)} />

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-mono text-xs font-medium text-slate-400">{sample.id}</p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                  cfg.badgeBg
                )}
              >
                {cfg.badgeIcon}
                {cfg.badgeLabel}
              </span>
            </div>
            <h3 className="mt-1 truncate text-lg font-bold text-primary-900 group-hover:text-primary-700">
              {sample.name}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Package className="h-3.5 w-3.5 text-slate-400" />
                {sample.batch}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {sample.location}
              </span>
            </div>
          </div>
        </div>

        <div className="mx-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50/80 p-3">
          {gc && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">GC 含量</p>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span
                  className={cn(
                    "text-xl font-bold tabular-nums",
                    gc.isOutOfRange
                      ? "text-red-600"
                      : gc.isBoundary
                      ? "text-amber-600"
                      : "text-teal-700"
                  )}
                >
                  {gc.value.toFixed(1)}
                </span>
                <span className="text-xs font-medium text-slate-500">{gc.unit}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">
                阈值 {gc.thresholdMin}-{gc.thresholdMax}
              </p>
            </div>
          )}
          {tm && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">熔解温度</p>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span
                  className={cn(
                    "text-xl font-bold tabular-nums",
                    tm.isOutOfRange
                      ? "text-red-600"
                      : tm.isBoundary
                      ? "text-amber-600"
                      : "text-teal-700"
                  )}
                >
                  {tm.value.toFixed(1)}
                </span>
                <span className="text-xs font-medium text-slate-500">{tm.unit}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">
                阈值 {tm.thresholdMin}-{tm.thresholdMax}
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto px-5 py-4">
          <button
            onClick={() => navigate(`/sample/${sample.id}`)}
            className={cn(
              "inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5",
              "text-sm font-semibold transition-all duration-200",
              "bg-primary-50 text-primary-700 ring-1 ring-primary-100",
              "hover:bg-primary-600 hover:text-white hover:ring-primary-600",
              "group/btn"
            )}
          >
            查看详情
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
