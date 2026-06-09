import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Eye, ChevronRight, AlertCircle, AlertOctagon, Beaker, Calendar } from "lucide-react";
import { useRecordStore } from "@/store/useRecordStore";
import Layout from "@/components/Layout";
import StatusBadge from "@/components/StatusBadge";
import type { RecordStatus } from "@/types";

const filterOptions: { value: "all" | RecordStatus; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "success", label: "顺利" },
  { value: "pending", label: "待确认" },
  { value: "bad", label: "坏数据" },
];

export default function RecordList() {
  const { records } = useRecordStore();
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<"all" | RecordStatus>("all");

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchKeyword =
        !keyword ||
        r.batchNo.toLowerCase().includes(keyword.toLowerCase()) ||
        r.operator.includes(keyword);
      const matchFilter = filter === "all" || r.status === filter;
      return matchKeyword && matchFilter;
    });
  }, [records, keyword, filter]);

  const counts = useMemo(() => {
    return {
      all: records.length,
      success: records.filter((r) => r.status === "success").length,
      pending: records.filter((r) => r.status === "pending").length,
      bad: records.filter((r) => r.status === "bad").length,
    };
  }, [records]);

  return (
    <Layout title="实验记录列表">
      <div className="mb-8 animate-fade-in-up">
        <h2 className="font-serif text-2xl font-bold text-lab-ink mb-1">薄层色谱实验记录</h2>
        <p className="text-sm text-slate-500">选择一条记录查看谱图、数据表与异常说明</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 no-print">
        <div className="relative flex-1 max-w-md">
          <Search width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索批号或操作人员..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:border-lab-blue focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-1 w-fit">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                filter === opt.value
                  ? "bg-lab-blue text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
              <span className="ml-1 opacity-70">({counts[opt.value]})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r, idx) => {
          const leftBarColor =
            r.status === "success"
              ? "bg-emerald-500"
              : r.status === "pending"
              ? "bg-amber-500"
              : "bg-red-500";
          const isDup = r.isDuplicate;

          return (
            <Link
              key={r.id}
              to={`/records/${r.id}`}
              className="group relative block bg-white border border-slate-200 rounded shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${leftBarColor}`} />
              {isDup && (
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-red-100 border border-red-200 rounded text-xs font-semibold text-red-700">
                  <AlertOctagon width={12} height={12} />
                  批号重复
                </div>
              )}

              <div className="p-5 pl-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-mono text-sm font-bold text-lab-blue mb-1">{r.batchNo}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar width={12} height={12} />
                      {r.date}
                    </div>
                  </div>
                  <StatusBadge status={r.status} size="sm" />
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-600 mb-4">
                  <span className="inline-flex items-center gap-1">
                    <Beaker width={12} height={12} />
                    {r.operator}
                  </span>
                  <span>{r.plateType}</span>
                </div>

                {r.notes.length > 0 && (
                  <div className="mb-4 p-2.5 bg-amber-50 border border-amber-100 rounded">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle width={14} height={14} className="text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-xs text-amber-800 leading-relaxed">
                        {r.notes.length} 项异常：
                        {r.notes.map((n, i) => (
                          <span key={i}>
                            {i > 0 && "、"}
                            {n.message}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">{r.components.length} 个组分</span>
                  <span className="inline-flex items-center gap-1 text-sm text-lab-blue font-medium group-hover:gap-2 transition-all">
                    <Eye width={14} height={14} />
                    查看详情
                    <ChevronRight width={14} height={14} />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Search width={40} height={40} className="mx-auto mb-3 opacity-40" />
          <p>没有找到匹配的记录</p>
        </div>
      )}
    </Layout>
  );
}
