import { useSimStore } from "../store/simStore";
import { Droplets, Zap, AlertTriangle, RefreshCw } from "lucide-react";

export default function MetricCards() {
  const result = useSimStore((s) => s.result);
  if (!result) return null;

  const { summary } = result;

  const cards = [
    {
      label: "循环周期",
      value: `${summary.cyclePeriod}h`,
      sub: `日循环 ${summary.dailyCycles} 次`,
      icon: RefreshCw,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
    },
    {
      label: "最低余氯",
      value: `${summary.minChlorine}`,
      sub: `${String(summary.minChlorineHour).padStart(2, "0")}:00 出现`,
      icon: Droplets,
      color:
        summary.minChlorine < 0.5 ? "text-red-400" : "text-emerald-400",
      bgColor:
        summary.minChlorine < 0.5 ? "bg-red-500/10" : "bg-emerald-500/10",
      borderColor:
        summary.minChlorine < 0.5
          ? "border-red-500/20"
          : "border-emerald-500/20",
    },
    {
      label: "总电费",
      value: `¥${summary.totalCost}`,
      sub: `平均 ¥${(summary.totalCost / 24).toFixed(2)}/h`,
      icon: Zap,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    {
      label: "异常事件",
      value: `${summary.anomalyCount}`,
      sub: Object.entries(summary.anomalyTypes)
        .filter(([, v]) => (v as number) > 0)
        .map(([k, v]) => `${k === "low_chlorine" ? "余氯低" : k === "pump_shutdown" ? "泵停" : "客流增"}×${v}`)
        .join(" ") || "无异常",
      icon: AlertTriangle,
      color:
        summary.anomalyCount > 0 ? "text-red-400" : "text-emerald-400",
      bgColor:
        summary.anomalyCount > 0 ? "bg-red-500/10" : "bg-emerald-500/10",
      borderColor:
        summary.anomalyCount > 0
          ? "border-red-500/20"
          : "border-emerald-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bgColor} border ${card.borderColor} rounded-xl p-4 transition-all`}
        >
          <div className="flex items-center gap-2 mb-2">
            <card.icon className={`w-4 h-4 ${card.color}`} />
            <span className="text-[11px] font-medium text-slate-400">
              {card.label}
            </span>
          </div>
          <div className={`text-xl font-bold font-mono ${card.color}`}>
            {card.value}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}
