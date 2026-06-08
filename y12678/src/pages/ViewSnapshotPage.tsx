import { useState } from "react";
import { Search, Filter, Camera, Download, Calendar, Plus } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import OutOfBoundsBanner from "@/components/view/OutOfBoundsBanner";
import ViewSnapshotCard from "@/components/view/ViewSnapshotCard";
import ColorLegend from "@/components/view/ColorLegend";
import { useAppStore } from "@/store/useAppStore";

export default function ViewSnapshotPage() {
  const { viewSnapshots } = useAppStore();
  const [filter, setFilter] = useState<"all" | "oob" | "supplement">("all");
  const [keyword, setKeyword] = useState("");

  const filtered = viewSnapshots.filter((s) => {
    const matchKeyword =
      !keyword ||
      s.name.includes(keyword) ||
      s.projectName.includes(keyword) ||
      s.operator.includes(keyword);
    const matchFilter =
      filter === "all" ||
      (filter === "oob" && s.outOfBoundsCount > 0) ||
      (filter === "supplement" && s.hasSupplement);
    return matchKeyword && matchFilter;
  });

  const stats = {
    total: viewSnapshots.length,
    oob: viewSnapshots.filter((s) => s.outOfBoundsCount > 0).length,
    supplement: viewSnapshots.filter((s) => s.hasSupplement).length,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="视角保存"
        subtitle="日常入口 · 评审截图沟通 · 颜色语义一目了然"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-400" />
          <input
            type="text"
            placeholder="搜索视角、项目、操作人..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-64 rounded border border-ocean-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-ocean-300 transition-colors focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
          />
        </div>
        <button className="btn-secondary">
          <Download className="h-4 w-4" />
          导出清单
        </button>
        <button className="btn-primary">
          <Plus className="h-4 w-4" />
          保存新视角
        </button>
      </PageHeader>

      <div className="flex-1 space-y-5 p-6">
        <OutOfBoundsBanner />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-song text-sm text-ocean-700 font-semibold">
                统计概览
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-1">
                <span className="font-mono-num text-2xl font-bold text-ocean-700">
                  {stats.total}
                </span>
                <span className="text-xs text-gray-500">总视角</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono-num text-2xl font-bold text-coral-500">
                  {stats.oob}
                </span>
                <span className="text-xs text-gray-500">含越界</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono-num text-2xl font-bold text-lavender-500">
                  {stats.supplement}
                </span>
                <span className="text-xs text-gray-500">含补录</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded border border-ocean-200 bg-white p-0.5">
              {([
                { key: "all", label: "全部" },
                { key: "oob", label: "仅越界" },
                { key: "supplement", label: "仅补录" },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={`rounded px-3 py-1.5 text-xs font-song transition-colors ${
                    filter === opt.key
                      ? "bg-ocean-500 text-white shadow-sm"
                      : "text-ocean-600 hover:bg-ocean-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button className="btn-secondary">
              <Filter className="h-4 w-4" />
              <Calendar className="h-4 w-4" />
              时间范围
            </button>
            <ColorLegend />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((snapshot, idx) => (
            <ViewSnapshotCard key={snapshot.id} snapshot={snapshot} index={idx} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="eng-card flex flex-col items-center justify-center py-20">
            <Camera className="mb-3 h-12 w-12 text-ocean-300" />
            <p className="font-song text-ocean-500">暂无匹配的视角快照</p>
            <p className="mt-1 text-xs text-gray-400">尝试调整筛选条件或保存新视角</p>
          </div>
        )}
      </div>
    </div>
  );
}
