import { MapPin, Navigation, FileDigit, Building2 } from "lucide-react";
import type { ReviewPoint } from "@/types";
import { STATUS_LABEL } from "@/types";

const statusStyle: Record<ReviewPoint["status"], string> = {
  processed: "bg-moss-600 text-white",
  pending_site: "bg-amber-600 text-white",
  conflict: "bg-clay-600 text-white",
};

interface Props {
  point: ReviewPoint;
  conclusionRef: React.RefObject<HTMLDivElement>;
  highlightConclusion: boolean;
}

export default function PointInfoCard({ point, conclusionRef, highlightConclusion }: Props) {
  return (
    <div className="bg-white rounded border border-ink-200 p-5 animate-fade-in-up">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="font-serif text-xl font-bold text-ink-800">{point.name}</h2>
            <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${statusStyle[point.status]}`}>
              {STATUS_LABEL[point.status]}
            </span>
            {point.hasConflict && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-clay-100 text-clay-700 border border-clay-300">
                含被覆盖旧方案
              </span>
            )}
          </div>
          <p className="flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="w-3.5 h-3.5" />
            {point.address} · {point.district}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-500">最近更新</p>
          <p className="text-sm font-medium text-ink-700">{point.lastUpdatedBy}</p>
          <p className="text-xs text-slate-500">{point.lastUpdatedAt}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3 border-y border-ink-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-ink-100 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-ink-600" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500">GIS经度</p>
            <p className="text-sm font-mono font-medium text-ink-700">{point.gisLng}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-ink-100 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-ink-600 rotate-90" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500">GIS纬度</p>
            <p className="text-sm font-mono font-medium text-ink-700">{point.gisLat}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-ink-100 flex items-center justify-center">
            <FileDigit className="w-4 h-4 text-ink-600" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500">设计卸货容量</p>
            <p className="text-sm font-medium text-ink-700">
              <span className="text-lg font-bold text-amber-600">{point.designCapacity}</span> 辆/日
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-ink-100 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-ink-600" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500">片区归属</p>
            <p className="text-sm font-medium text-ink-700">{point.district}</p>
          </div>
        </div>
      </div>

      <div
        ref={conclusionRef}
        className={`mt-4 p-4 rounded border-l-4 border-amber-500 bg-amber-50 transition-colors ${
          highlightConclusion ? "animate-pulse-highlight" : ""
        }`}
      >
        <p className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          最终复核结论
        </p>
        <p className="text-sm leading-relaxed text-ink-800">{point.conclusion}</p>
      </div>
    </div>
  );
}
