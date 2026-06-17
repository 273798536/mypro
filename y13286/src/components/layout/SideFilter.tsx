import { useMemo } from "react";
import { Search, Filter, AlertTriangle, MapPin, CheckCircle2, Clock } from "lucide-react";
import { useReviewStore } from "@/store/reviewStore";
import { STATUS_LABEL, type PointStatus } from "@/types";

const filters: { key: PointStatus | "all"; icon: typeof MapPin }[] = [
  { key: "all", icon: MapPin },
  { key: "processed", icon: CheckCircle2 },
  { key: "pending_site", icon: Clock },
  { key: "conflict", icon: AlertTriangle },
];

const districts = ["全部片区", "东片区", "南片区", "西片区", "北片区", "中片区"];

export default function SideFilter() {
  const activeStatus = useReviewStore((s) => s.activeStatus);
  const setActiveStatus = useReviewStore((s) => s.setActiveStatus);
  const searchKeyword = useReviewStore((s) => s.searchKeyword);
  const setSearchKeyword = useReviewStore((s) => s.setSearchKeyword);
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
    <aside className="w-60 shrink-0 border-r border-ink-200 bg-white h-[calc(100vh-56px)] overflow-y-auto">
      <div className="p-4">
        <div className="mb-5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-600 mb-2">
            <Search className="w-3.5 h-3.5" /> 关键词搜索
          </label>
          <input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="菜场名称或地址"
            className="w-full px-3 py-2 text-sm border border-ink-200 rounded outline-none focus:border-ink-500 focus:ring-2 focus:ring-ink-100 transition"
          />
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-600 mb-2">
            <Filter className="w-3.5 h-3.5" /> 按状态筛选
          </div>
          <div className="flex flex-col gap-1">
            {filters.map((f) => {
              const Icon = f.icon;
              const active = activeStatus === f.key;
              const count = counts[f.key];
              const colorCls =
                f.key === "processed"
                  ? "text-moss-700"
                  : f.key === "pending_site"
                    ? "text-amber-700"
                    : f.key === "conflict"
                      ? "text-clay-700"
                      : "text-ink-600";
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveStatus(f.key)}
                  className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between transition border ${
                    active
                      ? "bg-ink-700 text-white border-ink-700"
                      : "bg-white text-ink-700 border-transparent hover:bg-ink-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${active ? "text-amber-400" : colorCls}`} />
                    {STATUS_LABEL[f.key]}
                  </span>
                  <span className={`text-xs font-semibold ${active ? "text-amber-300" : "text-slate-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-600 mb-2">
            <MapPin className="w-3.5 h-3.5" /> 按片区
          </div>
          <div className="flex flex-col gap-1">
            {districts.map((d, i) => (
              <button
                key={d}
                className={`w-full text-left px-3 py-1.5 rounded text-sm transition ${
                  i === 0 ? "bg-ink-50 text-ink-800 font-medium" : "text-ink-600 hover:bg-ink-50"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-4 my-2 p-3 rounded bg-amber-50 border border-amber-200">
        <p className="text-[11px] font-semibold text-amber-800 mb-1">操作提醒</p>
        <p className="text-[11px] text-amber-700 leading-relaxed">
          冲突记录已独立置顶，旧方案覆盖新意见的点位不会混入正常结果，公示前请优先处理。
        </p>
      </div>
    </aside>
  );
}
