import { DataQuality } from "@/types";
import { getQualityLabel } from "@/utils/qualityDetector";
import { Check, AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  quality: DataQuality;
  reasons?: string[];
  showLabel?: boolean;
  size?: "sm" | "md";
}

const styles: Record<DataQuality, { bg: string; text: string; dot: string; ring: string }> = {
  available: {
    bg: "bg-quality-available/15",
    text: "text-quality-available",
    dot: "bg-quality-available",
    ring: "ring-quality-available/30",
  },
  pending: {
    bg: "bg-quality-pending/15",
    text: "text-quality-pending",
    dot: "bg-quality-pending",
    ring: "ring-quality-pending/30",
  },
  recollect: {
    bg: "bg-quality-recollect/15",
    text: "text-quality-recollect",
    dot: "bg-quality-recollect",
    ring: "ring-quality-recollect/30",
  },
};

const icons = {
  available: Check,
  pending: AlertTriangle,
  recollect: RefreshCw,
};

export default function QualityBadge({
  quality,
  reasons,
  showLabel = true,
  size = "sm",
}: Props) {
  const s = styles[quality];
  const Icon = icons[quality];
  const iconSize = size === "sm" ? 12 : 14;

  const badge = (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${s.bg} ${s.text} ${s.ring} transition-all hover:ring-2`}
      title={reasons?.join(" | ") || ""}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${quality === "recollect" ? "animate-pulse" : ""}`} />
      <Icon size={iconSize} />
      {showLabel && <span>{getQualityLabel(quality)}</span>}
    </span>
  );

  if (!reasons || reasons.length === 0) return badge;

  return (
    <div className="group relative inline-block">
      {badge}
      <div className="absolute left-0 top-full z-50 mt-2 w-64 p-3 rounded-lg bg-ocean-900/95 backdrop-blur-xl border border-ocean-600/40 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        <p className="text-xs font-semibold text-ocean-200 mb-1.5">判定依据</p>
        <ul className="space-y-1">
          {reasons.map((r, i) => (
            <li key={i} className="text-xs text-ocean-300/80 flex gap-1.5">
              <span className={s.text}>•</span>
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
