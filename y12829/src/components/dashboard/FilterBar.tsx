import { Search, Filter } from "lucide-react";
import { useSampleStore } from "@/store/useSampleStore";
import { cn } from "@/lib/utils";
import { FilterStatus, SampleStatus } from "@/types";
import { useMemo } from "react";

interface FilterButtonProps {
  label: string;
  status: FilterStatus;
  count: number;
  active: boolean;
  onClick: () => void;
  activeClass: string;
  badgeClass: string;
}

function FilterButton({
  label,
  count,
  active,
  onClick,
  activeClass,
  badgeClass,
}: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium",
        "transition-all duration-200 border",
        active
          ? cn("text-white shadow-md border-transparent", activeClass)
          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <Filter className="h-4 w-4" />
      {label}
      <span
        className={cn(
          "inline-flex min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums",
          active
            ? cn("bg-white/25 text-white", badgeClass)
            : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
        )}
      >
        {count}
      </span>
    </button>
  );
}

export default function FilterBar() {
  const {
    filterStatus,
    setFilter,
    searchKeyword,
    setSearch,
    samples,
  } = useSampleStore();

  const s = useMemo(() => {
    const total = samples.length;
    const normal = samples.filter((x) => x.status === SampleStatus.NORMAL).length;
    const borderline = samples.filter((x) => x.status === SampleStatus.BORDERLINE).length;
    const abnormal = samples.filter((x) => x.status === SampleStatus.ABNORMAL).length;
    return { total, normal, borderline, abnormal };
  }, [samples]);

  const filteredCount = useMemo(() => {
    return samples.filter((x) => {
      if (filterStatus !== "all" && x.status !== filterStatus) return false;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        return (
          x.id.toLowerCase().includes(kw) ||
          x.name.toLowerCase().includes(kw) ||
          x.location.toLowerCase().includes(kw) ||
          x.batch.toLowerCase().includes(kw)
        );
      }
      return true;
    }).length;
  }, [samples, filterStatus, searchKeyword]);

  const buttons: Omit<FilterButtonProps, "active" | "onClick">[] = [
    {
      label: "全部",
      status: "all",
      count: s.total,
      activeClass: "bg-gradient-to-r from-primary-500 to-primary-700",
      badgeClass: "",
    },
    {
      label: "正常",
      status: SampleStatus.NORMAL,
      count: s.normal,
      activeClass: "bg-gradient-to-r from-teal-500 to-teal-700",
      badgeClass: "",
    },
    {
      label: "边界",
      status: SampleStatus.BORDERLINE,
      count: s.borderline,
      activeClass: "bg-gradient-to-r from-amber-500 to-amber-600",
      badgeClass: "",
    },
    {
      label: "异常",
      status: SampleStatus.ABNORMAL,
      count: s.abnormal,
      activeClass: "bg-gradient-to-r from-red-500 to-red-700",
      badgeClass: "",
    },
  ];

  return (
    <div className="animate-fade-in-up rounded-2xl bg-white p-5 shadow-card" style={{ animationDelay: "320ms" }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索样本 ID / 名称 / 地点 / 批次..."
            className={cn(
              "w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 py-3 text-sm",
              "text-slate-900 placeholder:text-slate-400",
              "focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-100",
              "transition-all duration-200"
            )}
          />
          {searchKeyword && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              清除
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {buttons.map((b) => (
            <FilterButton
              key={b.status}
              {...b}
              active={filterStatus === b.status}
              onClick={() => setFilter(b.status)}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="inline-block h-2 w-2 rounded-full bg-primary-400" />
        当前筛选结果：<span className="font-semibold text-slate-700">{filteredCount}</span> 条样本
        {(searchKeyword || filterStatus !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
            className="ml-2 text-primary-600 hover:text-primary-800 hover:underline"
          >
            重置全部筛选
          </button>
        )}
      </div>
    </div>
  );
}
