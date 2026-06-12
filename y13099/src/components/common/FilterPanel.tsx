import { useState } from "react";
import { Search, Calendar, Filter, X, ChevronDown } from "lucide-react";
import { STATUS_LABEL_MAP, PlanStatus } from "@shared/types";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  onFilter: (filters: {
    status?: string;
    corridorCode?: string;
    from?: string;
    to?: string;
  }) => void;
  filterSnapshot: Record<string, string>;
  showSensorType?: boolean;
}

export function FilterPanel({
  onFilter,
  filterSnapshot,
  showSensorType = false,
}: FilterPanelProps) {
  const [status, setStatus] = useState<string>(filterSnapshot.status || "");
  const [corridorCode, setCorridorCode] = useState<string>(
    filterSnapshot.corridorCode || ""
  );
  const [from, setFrom] = useState<string>(filterSnapshot.from || "");
  const [to, setTo] = useState<string>(filterSnapshot.to || "");
  const [expanded, setExpanded] = useState(true);

  const handleSubmit = () => {
    onFilter({
      status: status || undefined,
      corridorCode: corridorCode || undefined,
      from: from || undefined,
      to: to || undefined,
    });
  };

  const handleReset = () => {
    setStatus("");
    setCorridorCode("");
    setFrom("");
    setTo("");
    onFilter({});
  };

  const activeChips = [
    status && { key: "status", label: `状态: ${STATUS_LABEL_MAP[status as PlanStatus]}` },
    corridorCode && { key: "corridorCode", label: `走廊: ${corridorCode}` },
    from && { key: "from", label: `起始: ${from}` },
    to && { key: "to", label: `截止: ${to}` },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-6">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-text font-medium">
          <Filter className="w-4 h-4 text-primary" />
          <span>筛选条件</span>
          {activeChips.length > 0 && (
            <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">
              {activeChips.length} 个条件
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-muted transition-transform",
            expanded && "rotate-180"
          )}
        />
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="filter-chip filter-chip-active text-xs"
            >
              {chip.label}
              <X
                className="w-3 h-3"
                onClick={(e) => {
                  e.stopPropagation();
                  if (chip.key === "status") setStatus("");
                  if (chip.key === "corridorCode") setCorridorCode("");
                  if (chip.key === "from") setFrom("");
                  if (chip.key === "to") setTo("");
                  handleSubmit();
                }}
              />
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              状态
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary/60"
            >
              <option value="">全部</option>
              {Object.entries(STATUS_LABEL_MAP).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              走廊编号
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={corridorCode}
                onChange={(e) => setCorridorCode(e.target.value)}
                placeholder="如 LCX-A01"
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text focus:outline-none focus:border-primary/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              起始日期
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text focus:outline-none focus:border-primary/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              截止日期
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text focus:outline-none focus:border-primary/60"
              />
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className="flex gap-3 mt-4 justify-end">
          <button className="btn-secondary text-sm" onClick={handleReset}>
            <X className="w-4 h-4" />
            重置
          </button>
          <button className="btn-primary text-sm" onClick={handleSubmit}>
            <Search className="w-4 h-4" />
            查询
          </button>
        </div>
      )}
    </div>
  );
}
