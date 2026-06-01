import { AlertTriangle, ArrowRightLeft, Music2, VolumeX } from "lucide-react";
import type { Case } from "@/types";

interface IssueStatsProps {
  cases: Case[];
}

export default function IssueStats({ cases }: IssueStatsProps) {
  const stats = {
    part_misalignment: 0,
    unmarked_modulation: 0,
    audio_gap: 0,
  };
  for (const c of cases) {
    for (const i of c.issues) {
      stats[i.type]++;
    }
  }

  const items = [
    { label: "声部错位", count: stats.part_misalignment, icon: ArrowRightLeft, color: "#C44E52", bg: "bg-[#C44E52]/10" },
    { label: "转调漏标", count: stats.unmarked_modulation, icon: Music2, color: "#D4A843", bg: "bg-[#D4A843]/10" },
    { label: "音频缺段", count: stats.audio_gap, icon: VolumeX, color: "#6b7280", bg: "bg-zinc-100" },
  ];

  return (
    <div className="flex gap-4">
      {items.map((item) => (
        <div key={item.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${item.bg}`}>
          <item.icon className="w-5 h-5" style={{ color: item.color }} />
          <div>
            <div className="text-xl font-mono font-bold" style={{ color: item.color }}>
              {item.count}
            </div>
            <div className="text-xs text-zinc-500">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
