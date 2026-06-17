import { MapPin, Calendar, User, StickyNote, AlertOctagon, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ReviewPoint } from "@/types";
import { STATUS_LABEL } from "@/types";
import { mockRemarks } from "@/data/mockData";

const statusStyle: Record<ReviewPoint["status"], { bg: string; text: string; label: string }> = {
  processed: { bg: "bg-moss-100", text: "text-moss-700", label: STATUS_LABEL.processed },
  pending_site: { bg: "bg-amber-100", text: "text-amber-700", label: STATUS_LABEL.pending_site },
  conflict: { bg: "bg-clay-100", text: "text-clay-700", label: STATUS_LABEL.conflict },
};

interface Props {
  point: ReviewPoint;
  index?: number;
  isConflict?: boolean;
}

export default function PointCard({ point, index = 0, isConflict = false }: Props) {
  const nav = useNavigate();
  const s = statusStyle[point.status];
  const hasRemark = mockRemarks.some((r) => r.pointId === point.id);

  return (
    <div
      onClick={() => nav(`/point/${point.id}`)}
      className={`relative cursor-pointer card-hover bg-white rounded border p-4 animate-fade-in-up ${
        isConflict
          ? "border-clay-400 conflict-stripe animate-shake"
          : "border-ink-200 hover:border-ink-400"
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {point.hasConflict && !isConflict && (
        <div className="absolute -top-2 -right-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-clay-600 text-white shadow">
            <AlertOctagon className="w-3 h-3" /> 含被覆盖记录
          </span>
        </div>
      )}

      {isConflict && (
        <div className="absolute -top-2 -right-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-clay-700 text-white shadow">
            被覆盖
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-serif text-base font-semibold text-ink-800 leading-snug pr-2">
          {point.name}
        </h3>
        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${s.bg} ${s.text}`}>
          {s.label}
        </span>
      </div>

      <p className="flex items-center gap-1 text-xs text-slate-500 mb-2">
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="truncate">{point.address}</span>
      </p>

      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <span className="font-semibold text-ink-700">{point.designCapacity}</span>
          <span>辆/日</span>
        </span>
        <span className="px-1.5 py-0.5 rounded bg-ink-50 text-ink-600">{point.district}</span>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 border-l-2 border-ink-200 pl-2 mb-3">
        {point.conclusion}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-ink-100">
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {point.lastUpdatedBy}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {point.lastUpdatedAt.split(" ")[0]}
          </span>
          {hasRemark && (
            <span className="flex items-center gap-1 text-amber-700 font-medium">
              <StickyNote className="w-3 h-3" />
              有后补备注
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-ink-400" />
      </div>
    </div>
  );
}
