import { useMemo } from "react";
import { useBuoyStore } from "@/store/useBuoyStore";
import BuoyDataTable from "@/components/BuoyDataTable";
import { Search, Filter, Download, CheckSquare } from "lucide-react";
import { DataQuality, ReviewStatus } from "@/types";
import { cn } from "@/lib/utils";

const QUALITY_OPTIONS: { value: DataQuality; label: string; color: string }[] = [
  { value: "available", label: "可用", color: "text-quality-available" },
  { value: "pending", label: "暂缓", color: "text-quality-pending" },
  { value: "recollect", label: "重采", color: "text-quality-recollect" },
];

const REVIEW_OPTIONS: { value: ReviewStatus; label: string }[] = [
  { value: "pending", label: "待确认" },
  { value: "approved", label: "已通过" },
];

export default function BuoyData() {
  const records = useBuoyStore((s) => s.records);
  const filterQuality = useBuoyStore((s) => s.filterQuality);
  const filterReview = useBuoyStore((s) => s.filterReview);
  const searchKeyword = useBuoyStore((s) => s.searchKeyword);
  const setFilterQuality = useBuoyStore((s) => s.setFilterQuality);
  const setFilterReview = useBuoyStore((s) => s.setFilterReview);
  const setSearchKeyword = useBuoyStore((s) => s.setSearchKeyword);
  const approveRecords = useBuoyStore((s) => s.approveRecords);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterQuality.length > 0 && !filterQuality.includes(r.quality)) {
        return false;
      }
      if (filterReview.length > 0 && !filterReview.includes(r.reviewStatus)) {
        return false;
      }
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const matches =
          r.buoyId.toLowerCase().includes(kw) ||
          r.location.toLowerCase().includes(kw) ||
          (r.rawRemark && r.rawRemark.toLowerCase().includes(kw));
        if (!matches) return false;
      }
      return true;
    });
  }, [records, filterQuality, filterReview, searchKeyword]);

  const pendingIds = filtered
    .filter((r) => r.reviewStatus === "pending")
    .map((r) => r.id);

  const toggleQuality = (q: DataQuality) => {
    if (filterQuality.includes(q)) {
      setFilterQuality(filterQuality.filter((x) => x !== q));
    } else {
      setFilterQuality([...filterQuality, q]);
    }
  };

  const toggleReview = (r: ReviewStatus) => {
    if (filterReview.includes(r)) {
      setFilterReview(filterReview.filter((x) => x !== r));
    } else {
      setFilterReview([...filterReview, r]);
    }
  };

  return (
    <div className="space-y-5">
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ocean-400"
            />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索浮标编号、位置、备注..."
              className="input-field pl-10"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={16} className="text-ocean-400 mr-1" />
            <span className="text-xs text-ocean-400 mr-2">质量：</span>
            {QUALITY_OPTIONS.map((opt) => {
              const active = filterQuality.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleQuality(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
                    active
                      ? `${opt.color} bg-current/10 border-current/30`
                      : "text-ocean-400 bg-ocean-800/40 border-ocean-600/20 hover:text-ocean-200"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ocean-400 mr-2">审核：</span>
            {REVIEW_OPTIONS.map((opt) => {
              const active = filterReview.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleReview(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
                    active
                      ? "text-ocean-50 bg-ocean-500/20 border-ocean-500/40"
                      : "text-ocean-400 bg-ocean-800/40 border-ocean-600/20 hover:text-ocean-200"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {pendingIds.length > 0 && (
              <button
                onClick={() => approveRecords(pendingIds)}
                className="btn-primary text-sm py-2 flex items-center gap-1.5"
              >
                <CheckSquare size={14} />
                批量通过 ({pendingIds.length})
              </button>
            )}
            <button className="btn-secondary text-sm py-2 flex items-center gap-1.5">
              <Download size={14} />
              导出
            </button>
          </div>
        </div>

        {(filterQuality.length > 0 ||
          filterReview.length > 0 ||
          searchKeyword) && (
          <div className="mt-3 pt-3 border-t border-ocean-600/20 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-ocean-400/70">
              当前筛选：{filtered.length} 条结果
            </span>
            {(filterQuality.length > 0 || filterReview.length > 0 || searchKeyword) && (
              <button
                onClick={() => {
                  setFilterQuality([]);
                  setFilterReview([]);
                  setSearchKeyword("");
                }}
                className="text-xs text-ocean-400 hover:text-ocean-50 underline underline-offset-2"
              >
                清除筛选
              </button>
            )}
          </div>
        )}
      </div>

      <BuoyDataTable records={filtered} />
    </div>
  );
}
