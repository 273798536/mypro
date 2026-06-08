import type { CoordinateSystem } from "@/types";
import { Globe2, MapPin, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  system: CoordinateSystem;
  hasMismatch?: boolean;
}

const config: Record<CoordinateSystem, { label: string; icon: typeof Globe2; bg: string; text: string }> = {
  WGS84: {
    label: "WGS84",
    icon: Globe2,
    bg: "bg-seaweed-50",
    text: "text-seaweed-700",
  },
  CGCS2000: {
    label: "CGCS2000",
    icon: MapPin,
    bg: "bg-ocean-50",
    text: "text-ocean-700",
  },
  LOCAL: {
    label: "本地坐标",
    icon: Target,
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
};

export default function CoordBadge({ system, hasMismatch }: Props) {
  const cfg = config[system];
  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        "badge gap-1",
        hasMismatch ? "bg-coral-100 text-coral-700 ring-1 ring-coral-300" : `${cfg.bg} ${cfg.text}`
      )}
      title={hasMismatch ? "存在坐标系混用风险" : `坐标系：${cfg.label}`}
    >
      <Icon className="h-3 w-3" />
      <span className="font-mono-num">{cfg.label}</span>
      {hasMismatch && <span className="text-[10px] font-semibold">⚠</span>}
    </span>
  );
}
