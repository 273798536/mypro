import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Clock, FileText, AlertTriangle } from "lucide-react";
import { useStore } from "@/store";
import type { Batch } from "@/types";

const STATUS_FILTERS = [
  { key: "", label: "全部" },
  { key: "pending", label: "待处理" },
  { key: "in_review", label: "审核中" },
  { key: "completed", label: "已完成" },
];

const STATUS_LABEL: Record<Batch["status"], string> = {
  pending: "待处理",
  in_review: "审核中",
  completed: "已完成",
  closed: "已关闭",
};

function borderClass(status: Batch["status"]) {
  if (status === "completed") return "border-l-brand";
  if (status === "pending" || status === "in_review") return "border-l-amber";
  return "border-l-stone-300";
}

function formatRunAt(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SkeletonCard() {
  return (
    <div className="card border-l-4 border-l-stone-200 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-5 w-32 bg-stone-200 rounded" />
        <div className="h-4 w-20 bg-stone-100 rounded" />
      </div>
      <div className="flex gap-4">
        <div className="h-4 w-20 bg-stone-100 rounded" />
        <div className="h-4 w-24 bg-stone-100 rounded" />
        <div className="h-4 w-16 bg-stone-100 rounded" />
      </div>
      <div className="h-4 w-36 bg-stone-100 rounded" />
    </div>
  );
}

export default function ScreeningOverview() {
  const { batches, loading, error, fetchBatches, createBatch } = useStore();
  const [activeFilter, setActiveFilter] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [batchName, setBatchName] = useState("");

  useEffect(() => {
    fetchBatches();
  }, []);

  function handleFilter(status: string) {
    setActiveFilter(status);
    fetchBatches(status || undefined);
  }

  async function handleCreate() {
    if (!batchName.trim()) return;
    await createBatch(batchName.trim());
    setBatchName("");
    setShowDialog(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-serif text-stone-800">筛查总览</h2>
          <p className="text-sm text-stone-500 mt-1">
            管理宏基因组污染筛查运行批次，查看读段质量与异常统计
          </p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowDialog(true)}>
          <Plus size={16} />
          新建运行批次
        </button>
      </div>

      <div className="flex gap-2">
        {STATUS_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleFilter(key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === key
                ? "bg-brand text-white"
                : "bg-white text-stone-500 border border-stone-200 hover:border-brand hover:text-brand"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {batches.map((batch) => (
            <Link
              key={batch.id}
              to={`/screening/${batch.id}`}
              className={`card border-l-4 ${borderClass(batch.status)} block hover:no-underline`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-serif text-base text-stone-800">{batch.name}</h3>
                <span className="text-xs text-stone-400 font-mono">{batch.id}</span>
              </div>
              <div className="flex gap-5 mt-3 text-sm text-stone-600">
                <span className="flex items-center gap-1">
                  <FileText size={14} className="text-stone-400" />
                  总读段数 {batch.total_reads.toLocaleString()}
                </span>
                <span className={`flex items-center gap-1 ${batch.low_quality_reads > 0 ? "text-amber" : ""}`}>
                  <AlertTriangle size={14} className={batch.low_quality_reads > 0 ? "text-amber" : "text-stone-400"} />
                  低质量读段数 {batch.low_quality_reads.toLocaleString()}
                </span>
                <span className={`flex items-center gap-1 ${batch.anomaly_count > 0 ? "text-red-600" : ""}`}>
                  <AlertTriangle size={14} className={batch.anomaly_count > 0 ? "text-red-500" : "text-stone-400"} />
                  异常数 {batch.anomaly_count}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="flex items-center gap-1 text-xs text-stone-400">
                  <Clock size={12} />
                  {formatRunAt(batch.run_at)}
                </span>
                <span className={`status-${batch.status}`}>{STATUS_LABEL[batch.status]}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl space-y-4">
            <h3 className="font-serif text-lg text-stone-800">新建运行批次</h3>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="输入批次名称"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-brand"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { setShowDialog(false); setBatchName(""); }}>
                取消
              </button>
              <button className="btn-primary" onClick={handleCreate} disabled={!batchName.trim()}>
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
