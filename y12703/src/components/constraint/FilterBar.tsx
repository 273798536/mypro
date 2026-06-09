import { Search, Filter, AlertTriangle, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import type { ProblemStatus } from "@/types";

const STATUS_OPTIONS: { value: ProblemStatus | "all"; label: string }[] = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待确认" },
  { value: "approved", label: "已通过" },
  { value: "suspended", label: "暂缓" },
  { value: "recollect", label: "需重采" },
];

export default function FilterBar() {
  const { filters, setFilters } = useStore();
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[240px] max-w-md">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
        />
        <input
          value={filters.search ?? ""}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder="搜索题目编号、标题或递推公式..."
          className="w-full pl-9 pr-8 py-2 text-sm border border-ink-200 rounded-md bg-white focus:outline-none focus:border-ink-500 focus:ring-2 focus:ring-ink-100 transition"
        />
        {filters.search && (
          <button
            onClick={() => setFilters({ search: undefined })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-3 py-2 border border-ink-200 rounded-md bg-white">
        <Filter size={14} className="text-ink-500" />
        <select
          value={filters.status ?? "all"}
          onChange={(e) =>
            setFilters({
              status: e.target.value === "all" ? undefined : (e.target.value as ProblemStatus),
            })
          }
          className="text-sm bg-transparent focus:outline-none text-ink-700 pr-1"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <label
        className={`inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm cursor-pointer transition ${
          filters.onlyOutliers
            ? "bg-alert-soft border-alert/40 text-alert"
            : "bg-white border-ink-200 text-ink-600 hover:border-alert/30"
        }`}
      >
        <AlertTriangle size={14} />
        <span className="font-medium">仅看外推越界</span>
        <input
          type="checkbox"
          checked={filters.onlyOutliers}
          onChange={(e) => setFilters({ onlyOutliers: e.target.checked })}
          className="sr-only"
        />
      </label>
    </div>
  );
}
