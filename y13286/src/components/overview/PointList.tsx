import { useMemo } from "react";
import { MapPinned } from "lucide-react";
import { useReviewStore } from "@/store/reviewStore";
import PointCard from "./PointCard";
import ConflictSection from "./ConflictSection";

export default function PointList() {
  const points = useReviewStore((s) => s.points);
  const activeStatus = useReviewStore((s) => s.activeStatus);
  const searchKeyword = useReviewStore((s) => s.searchKeyword);

  const allPoints = useMemo(() => {
    const kw = searchKeyword.trim();
    return points.filter((p) => {
      const matchStatus = activeStatus === "all" ? true : p.status === activeStatus;
      const matchKw = kw ? p.name.includes(kw) || p.address.includes(kw) : true;
      return matchStatus && matchKw;
    });
  }, [points, activeStatus, searchKeyword]);

  const displayPoints = useMemo(() => {
    if (activeStatus === "conflict") return allPoints;
    return allPoints.filter((p) => !(p.status === "conflict" || p.hasConflict));
  }, [allPoints, activeStatus]);

  const showConflictSection = activeStatus === "all";
  const showNormalList = activeStatus !== "conflict" ? displayPoints.length > 0 : allPoints.length > 0;

  return (
    <div>
      {showConflictSection && <ConflictSection />}

      {showNormalList && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded flex items-center justify-center bg-ink-700 text-white">
              <MapPinned className="w-4 h-4" />
            </div>
            <h2 className="font-serif text-lg font-semibold text-ink-800">
              {activeStatus === "all" ? "GIS点位列表（除冲突外）" : "GIS点位列表"}
            </h2>
            <span className="ml-auto text-xs text-slate-500">
              共 <span className="font-bold text-ink-700">{displayPoints.length}</span> 条
            </span>
          </div>

          {displayPoints.length === 0 ? (
            <div className="py-16 text-center rounded border border-dashed border-ink-200 bg-white">
              <p className="text-sm text-slate-500">暂无符合筛选条件的点位</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayPoints.map((p, i) => (
                <PointCard key={p.id} point={p} index={i} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
