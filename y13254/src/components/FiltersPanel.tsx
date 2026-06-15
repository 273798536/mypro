import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useStore, selectFilteredItems } from "../store";
import type { ItemStatus } from "../shared/types";

const STATUS_OPTIONS: { value: ItemStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending_review", label: "待审核" },
  { value: "need_supplement", label: "待补材料" },
  { value: "pending_manual", label: "待人工确认" },
  { value: "approved", label: "已通过" },
  { value: "community_verified", label: "已核社区" },
];

const MATERIAL_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "complete", label: "材料完整" },
  { value: "incomplete", label: "材料缺失" },
];

export default function FiltersPanel({ className = "" }: { className?: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const items = useStore((s) => s.items);
  const locations = useStore((s) => s.locations);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const setSelectedItemId = useStore((s) => s.setSelectedItemId);
  const setSelectedLocationId = useStore((s) => s.setSelectedLocationId);

  const filteredItems = useMemo(
    () => selectFilteredItems({ items, locations, filters }),
    [items, locations, filters],
  );

  if (collapsed) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-50`}>
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-md bg-white border border-slate-200 hover:bg-slate-100 transition-all"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    );
  }

  return (
    <div className={`${className} flex flex-col bg-white`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700">筛选条件</h3>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-slate-100 transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">状态</label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const isActive =
                (opt.value === "all" && !filters.status) || filters.status === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() =>
                    setFilters({ status: opt.value === "all" ? undefined : opt.value })
                  }
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "bg-night-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">关键词搜索</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜点位名/别名..."
              value={filters.keyword || ""}
              onChange={(e) => setFilters({ keyword: e.target.value })}
              className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">材料完整度</label>
          <select
            value={filters.materialComplete || "all"}
            onChange={(e) =>
              setFilters({
                materialComplete: e.target.value as "all" | "complete" | "incomplete",
              })
            }
            className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all text-sm bg-white"
          >
            {MATERIAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-600">点位列表</h4>
            <span className="text-xs text-slate-400">{filteredItems.length} 项</span>
          </div>
          <div className="space-y-1">
            {filteredItems.map((item) => {
              const location = locations.find((l) => l.id === item.locationId);
              const isSelected = selectedItemId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedItemId(item.id);
                    if (location) setSelectedLocationId(location.id);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${
                    isSelected
                      ? "bg-night-50 border-l-4 border-night-500 text-night-700 font-medium"
                      : "hover:bg-slate-50 text-slate-700 border-l-4 border-transparent"
                  }`}
                >
                  <div className="truncate">{location?.canonicalName || "未知点位"}</div>
                </button>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-400">暂无匹配结果</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
