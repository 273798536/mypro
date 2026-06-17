import { useMemo } from "react";
import TopNav from "@/components/layout/TopNav";
import SideFilter from "@/components/layout/SideFilter";
import StatusFilterBar from "@/components/overview/StatusFilterBar";
import PointList from "@/components/overview/PointList";
import { ClipboardCheck, FileWarning } from "lucide-react";
import { useReviewStore } from "@/store/reviewStore";

export default function OverviewPage() {
  const points = useReviewStore((s) => s.points);

  const counts = useMemo(
    () =>
      points.reduce(
        (acc, p) => {
          acc.all += 1;
          if (p.status === "processed") acc.processed += 1;
          else if (p.status === "pending_site") acc.pending_site += 1;
          else if (p.status === "conflict") acc.conflict += 1;
          return acc;
        },
        { all: 0, processed: 0, pending_site: 0, conflict: 0 },
      ),
    [points],
  );

  return (
    <div className="min-h-screen bg-ink-50">
      <TopNav />
      <div className="flex">
        <SideFilter />

        <main className="flex-1 overflow-y-auto h-[calc(100vh-56px)] p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 animate-fade-in-up">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h1 className="font-serif text-2xl font-bold text-ink-800 mb-1">
                    菜场卸货容量复核 · 点位总览
                  </h1>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    已处理、待现场看和冲突记录独立分类显示，
                    <span className="font-semibold text-clay-700">旧方案覆盖新意见的点位已单独拎出</span>
                    ，不会混入正常结果。
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-2 rounded bg-moss-50 border border-moss-200 text-xs">
                    <span className="text-moss-700 flex items-center gap-1">
                      <ClipboardCheck className="w-3.5 h-3.5" /> 已处理 {counts.processed}
                    </span>
                  </div>
                  <div className="px-3 py-2 rounded bg-amber-50 border border-amber-200 text-xs">
                    <span className="text-amber-700">待现场看 {counts.pending_site}</span>
                  </div>
                  <div className="px-3 py-2 rounded bg-clay-50 border border-clay-200 text-xs">
                    <span className="text-clay-700 flex items-center gap-1">
                      <FileWarning className="w-3.5 h-3.5" /> 冲突 {counts.conflict}
                    </span>
                  </div>
                </div>
              </div>

              <StatusFilterBar />
            </div>

            <PointList />
          </div>
        </main>
      </div>
    </div>
  );
}
