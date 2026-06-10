import { useMemo, useState } from "react";
import BatchCard from "@/components/BatchCard";
import { useApp } from "@/store/useApp";
import type { BatchStatus } from "@/types";
import { STATUS_LABEL } from "@/types";
import { Search, Filter, X, BarChart3 } from "lucide-react";

export default function RecordsPage() {
  const { batches, getPublishedBatches, role } = useApp();
  const displayBatches = role === "student" ? getPublishedBatches() : batches;

  const [q, setQ] = useState("");
  const [f, setF] = useState<BatchStatus | "all">("all");

  const filtered = useMemo(() => {
    return displayBatches.filter((b) => {
      const matchQ =
        !q ||
        b.batchId.toLowerCase().includes(q.toLowerCase()) ||
        b.solventType.toLowerCase().includes(q.toLowerCase());
      const matchF = f === "all" || b.status === f;
      return matchQ && matchF;
    });
  }, [displayBatches, q, f]);

  const statuses: (BatchStatus | "all")[] = ["all", "draft", "review", "published", "retest"];
  const statusLabel = (s: BatchStatus | "all") => (s === "all" ? "全部" : STATUS_LABEL[s]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-chem-50 text-chem-700 text-xs font-medium">
              <BarChart3 size="12" /> 结果可追溯
            </div>
            <h3 className="section-title mt-3">实验记录追踪</h3>
            <p className="section-subtitle">
              每个纯度结果旁边有 1-2 句专业解释，老师可以直接拿给别人讲解。
              {role === "student" && " 学生视图只显示已发布的最新版本，保证结论唯一。"}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size="15" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                className="input pl-9 w-64"
                placeholder="搜索批次号或溶剂..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-ink-100 text-ink-400"
                  onClick={() => setQ("")}
                >
                  <X size="14" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-ink-500 mr-1">
            <Filter size="12" /> 状态筛选
          </div>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setF(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                f === s
                  ? "bg-lab-500 text-white shadow-soft"
                  : "bg-ink-50 text-ink-600 hover:bg-ink-100"
              }`}
            >
              {statusLabel(s)}
              <span className={`ml-1 ${f === s ? "opacity-80" : "text-ink-400"}`}>
                ({s === "all" ? displayBatches.length : displayBatches.filter((b) => b.status === s).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <div className="font-display text-xl text-ink-700 mb-1">没有找到匹配的批次</div>
          <div className="text-sm text-ink-500">尝试调整搜索关键词或筛选条件</div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {filtered.map((b) => (
            <BatchCard key={b.batchId} batch={b} />
          ))}
        </div>
      )}
    </div>
  );
}
