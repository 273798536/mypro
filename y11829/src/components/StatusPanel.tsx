import type { Score } from "@/types/game";
import { Users, CheckCircle, Crown, Clock, AlertTriangle } from "lucide-react";

interface StatusPanelProps {
  queueLength: number;
  score: Score;
  tick: number;
  vipBacklog: number;
}

export default function StatusPanel({
  queueLength,
  score,
  tick,
  vipBacklog,
}: StatusPanelProps) {
  const items = [
    {
      icon: <Users className="w-4 h-4" />,
      label: "等待",
      value: queueLength,
      color: "text-slate-700",
    },
    {
      icon: <CheckCircle className="w-4 h-4" />,
      label: "已办",
      value: score.served,
      color: "text-emerald-600",
    },
    {
      icon: <Crown className="w-4 h-4" />,
      label: "VIP积压",
      value: vipBacklog,
      color: vipBacklog > 0 ? "text-amber-600" : "text-slate-400",
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: "过号",
      value: score.appointmentExpired,
      color: score.appointmentExpired > 0 ? "text-red-600" : "text-slate-400",
    },
    {
      icon: <AlertTriangle className="w-4 h-4" />,
      label: "故障",
      value: score.brokenCount,
      color: score.brokenCount > 0 ? "text-red-600" : "text-slate-400",
    },
  ];

  return (
    <div className="bg-[#1B3A5C] rounded-xl p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold tracking-wider">实时状态</h2>
        <div className="font-mono text-lg font-bold text-[#D4A843]">
          {String(Math.floor(tick / 60)).padStart(2, "0")}:
          {String(tick % 60).padStart(2, "0")}
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {item.icon}
            </div>
            <div
              className={`font-mono text-2xl font-bold ${
                item.label === "等待" ? "text-white" : item.color
              }`}
            >
              {item.value}
            </div>
            <div className="text-xs text-slate-300">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
