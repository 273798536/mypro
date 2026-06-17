import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import { useReviewStore } from "@/store/reviewStore";
import PointCard from "./PointCard";

export default function ConflictSection() {
  const points = useReviewStore((s) => s.points);
  const activeStatus = useReviewStore((s) => s.activeStatus);
  const searchKeyword = useReviewStore((s) => s.searchKeyword);

  const conflicts = useMemo(() => {
    const kw = searchKeyword.trim();
    return points.filter((p) => {
      const isConflict = p.status === "conflict" || p.hasConflict;
      const matchKw = kw ? p.name.includes(kw) || p.address.includes(kw) : true;
      const matchStatus = activeStatus === "all" || activeStatus === "conflict";
      return isConflict && matchKw && matchStatus;
    });
  }, [points, activeStatus, searchKeyword]);

  if (conflicts.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded flex items-center justify-center bg-clay-600 text-white">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <h2 className="font-serif text-lg font-semibold text-clay-800">
            ⚠ 冲突记录（旧方案覆盖新意见）
          </h2>
          <p className="text-xs text-clay-600 mt-0.5">
            下列点位存在旧方案被新表/备注覆盖情况，已独立拎出，不会混入正常结果
          </p>
        </div>
        <span className="ml-auto px-2.5 py-1 rounded-full bg-clay-600 text-white text-xs font-bold">
          {conflicts.length} 条
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 rounded bg-clay-50 border border-clay-200">
        {conflicts.map((p, i) => (
          <PointCard key={p.id} point={p} index={i} isConflict />
        ))}
      </div>
    </section>
  );
}
