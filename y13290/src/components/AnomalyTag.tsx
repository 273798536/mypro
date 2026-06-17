import { AlertTriangle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnomalyFlags } from "@/lib/anomaly";

interface AnomalyTagsProps {
  flags: AnomalyFlags;
  className?: string;
}

export default function AnomalyTags({ flags, className }: AnomalyTagsProps) {
  if (!flags.nameInconsistent && !flags.coordOffset) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {flags.nameInconsistent && (
        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
          <AlertTriangle size={12} />
          名称不一致
        </span>
      )}
      {flags.coordOffset && (
        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
          <MapPin size={12} />
          坐标偏移
        </span>
      )}
    </div>
  );
}
