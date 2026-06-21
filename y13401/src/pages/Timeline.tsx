import { useMemo } from "react";
import { Search, Filter, History } from "lucide-react";
import { useTimelineStore } from "@/store/useTimelineStore";
import { TimelineList } from "@/components/TimelineList";
import type { OperationType } from "@/types";
import { getOperationLabel } from "@/utils/formatters";

const operationOptions: OperationType[] = [
  "create",
  "update",
  "supplement",
  "withdraw",
  "rejudge",
  "approve",
  "reject",
];

export default function Timeline() {
  const { filterOperation, searchQuery, setFilterOperation, setSearchQuery, getFilteredEntries } =
    useTimelineStore();

  const entries = useMemo(
    () => getFilteredEntries(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterOperation, searchQuery],
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-serif-title text-2xl font-bold text-ink-800">
          操作时间线
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          所有参数操作的完整记录，补录、撤回、改判都可追溯
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-parchment-100 overflow-hidden">
        <div className="p-4 border-b border-ink-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索参数名称、操作理由..."
                className="w-full pl-9 pr-3 py-2 border border-ink-200 rounded-lg text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-transparent transition-soft"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-ink-400" />
              <select
                value={filterOperation}
                onChange={(e) => setFilterOperation(e.target.value as OperationType | "all")}
                className="px-2.5 py-2 border border-ink-200 rounded-lg text-sm text-ink-700 bg-white focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-transparent transition-soft"
              >
                <option value="all">全部操作类型</option>
                {operationOptions.map((op) => (
                  <option key={op} value={op}>
                    {getOperationLabel(op)}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto text-sm text-ink-500">
              共 <span className="font-semibold text-ink-700">{entries.length}</span> 条记录
            </div>
          </div>
        </div>

        <div className="p-5 max-h-[calc(100vh-280px)] overflow-y-auto">
          {entries.length === 0 ? (
            <div className="text-center py-16 text-ink-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <div className="text-sm">暂无操作记录</div>
              <div className="text-xs mt-1">操作会自动记录在这里</div>
            </div>
          ) : (
            <TimelineList entries={entries} showParameterName={true} />
          )}
        </div>
      </div>
    </div>
  );
}
