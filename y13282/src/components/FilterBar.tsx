import {
  Search,
  Filter,
  AlertTriangle,
  Database,
  Copy,
  FileText,
  Download,
  X,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";

export default function FilterBar() {
  const { filterOptions, setFilter, batches, getFilteredRecords, exportFilteredCSV } =
    useAppStore();
  const f = filterOptions;
  const filteredCount = getFilteredRecords().length;

  const hasActiveFilter =
    f.status !== "all" ||
    f.intersection_error !== null ||
    f.bad_data !== null ||
    f.batch_id !== null ||
    !!f.keyword;

  return (
    <div className="bg-white border-b border-zinc-200 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-government-600" />
          <h3 className="text-sm font-bold text-zinc-800">记录筛选</h3>
          <span className="text-[11px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
            共 {filteredCount} 条匹配
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilter && (
            <button
              onClick={() =>
                setFilter({
                  status: "all",
                  intersection_error: null,
                  bad_data: null,
                  batch_id: null,
                  keyword: "",
                })
              }
              className="px-2.5 py-1 text-[11px] text-zinc-500 hover:text-databad-600 hover:bg-databad-50 rounded-md transition flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              清除筛选
            </button>
          )}
          <button
            onClick={exportFilteredCSV}
            className="px-3 py-1.5 text-[11px] font-medium bg-gradient-to-r from-government-600 to-government-700 text-white rounded-md hover:shadow-md transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            导出CSV（含全部标记）
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            value={f.keyword}
            onChange={(e) => setFilter({ keyword: e.target.value })}
            placeholder="搜索标题/描述/地点/投诉人..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-300 focus:border-government-500 focus:ring-1 focus:ring-government-200 outline-none transition"
          />
        </div>

        <select
          value={f.batch_id || ""}
          onChange={(e) =>
            setFilter({ batch_id: e.target.value || null })
          }
          className="px-2.5 py-1.5 text-xs rounded-md border border-zinc-300 focus:border-government-500 outline-none bg-white"
        >
          <option value="">全部批次</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name.slice(0, 18)}
              {b.name.length > 18 ? "..." : ""}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-md">
          {(
            [
              { v: "all", label: "全部状态", icon: <FileText className="w-3 h-3" /> },
              { v: "normal", label: "正常", icon: <FileText className="w-3 h-3" /> },
              { v: "duplicate", label: "已去重", icon: <Copy className="w-3 h-3" /> },
              { v: "merged", label: "已合并", icon: <Copy className="w-3 h-3" /> },
            ] as const
          ).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setFilter({ status: opt.v })}
              className={`px-2.5 py-1 text-[11px] rounded transition flex items-center gap-1 font-medium ${
                f.status === opt.v
                  ? "bg-white shadow-sm text-government-700"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-warning-50 rounded-md border border-warning-200">
          <span className="text-[11px] text-warning-700 px-2 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            路口合错
          </span>
          {(
            [
              { v: null as null | boolean, label: "全部" },
              { v: true, label: "仅看标记" },
              { v: false, label: "排除标记" },
            ] as const
          ).map((opt) => (
            <button
              key={String(opt.v)}
              onClick={() => setFilter({ intersection_error: opt.v })}
              className={`px-2 py-1 text-[11px] rounded transition font-medium ${
                f.intersection_error === opt.v
                  ? "bg-white shadow-sm text-warning-700"
                  : "text-warning-600/70 hover:text-warning-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-databad-50 rounded-md border border-databad-200">
          <span className="text-[11px] text-databad-700 px-2 font-medium flex items-center gap-1">
            <Database className="w-3 h-3" />
            坏数据
          </span>
          {(
            [
              { v: null as null | boolean, label: "全部" },
              { v: true, label: "仅看标记" },
              { v: false, label: "排除标记" },
            ] as const
          ).map((opt) => (
            <button
              key={String(opt.v)}
              onClick={() => setFilter({ bad_data: opt.v })}
              className={`px-2 py-1 text-[11px] rounded transition font-medium ${
                f.bad_data === opt.v
                  ? "bg-white shadow-sm text-databad-700"
                  : "text-databad-600/70 hover:text-databad-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
