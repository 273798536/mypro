import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, X, ChevronRight } from "lucide-react";
import { useStore } from "@/store";

function ScoreColor({ score }: { score: number }) {
  const cls =
    score >= 20
      ? "text-emerald font-semibold"
      : score >= 15
        ? "text-amber font-semibold"
        : "text-red-600 font-semibold";
  return <span className={cls}>{score}</span>;
}

function StatusBadge({ low }: { low: boolean }) {
  return low ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
      低质量
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
      通过
    </span>
  );
}

const statusLabel: Record<string, string> = {
  pending: "待处理",
  in_review: "审核中",
  completed: "已完成",
  closed: "已关闭",
};

export default function ScreeningDetail() {
  const { batchId } = useParams<{ batchId: string }>();
  const {
    currentBatch,
    reads,
    selectedRead,
    loading,
    error,
    fetchBatch,
    fetchReads,
    selectRead,
    createAnomaly,
  } = useStore();

  const [filterLow, setFilterLow] = useState(false);

  useEffect(() => {
    if (batchId) {
      fetchBatch(batchId);
      fetchReads(batchId);
    }
  }, [batchId]);

  useEffect(() => {
    if (batchId) fetchReads(batchId, filterLow);
  }, [filterLow]);

  const closeDrawer = () => selectRead(null);

  const handleMarkAnomaly = async () => {
    if (!selectedRead || !batchId) return;
    await createAnomaly(selectedRead.read_id, batchId, "张技师");
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="card border border-red-200 text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 relative">
      <nav className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Link to="/screening" className="flex items-center gap-1 hover:text-brand transition-colors">
          <ArrowLeft className="w-4 h-4" />
          返回筛查总览
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[var(--text-primary)] font-medium">
          {currentBatch?.name ?? "批次详情"}
        </span>
      </nav>

      {loading && !currentBatch ? (
        <div className="space-y-4">
          <div className="h-20 bg-surface-alt rounded-xl animate-pulse" />
          <div className="h-10 w-64 bg-surface-alt rounded-lg animate-pulse" />
          <div className="h-64 bg-surface-alt rounded-xl animate-pulse" />
        </div>
      ) : (
        <>
          <div className="card flex items-center gap-6 text-sm">
            <div>
              <span className="text-[var(--text-muted)]">批次</span>
              <p className="font-semibold text-base">{currentBatch?.name}</p>
            </div>
            <div className="border-l border-[var(--border)] pl-6">
              <span className="text-[var(--text-muted)]">总读段</span>
              <p className="font-semibold text-base">{currentBatch?.total_reads ?? 0}</p>
            </div>
            <div className="border-l border-[var(--border)] pl-6">
              <span className="text-amber">低质量</span>
              <p className="font-semibold text-base text-amber">
                {currentBatch?.low_quality_reads ?? 0}
              </p>
            </div>
            <div className="border-l border-[var(--border)] pl-6">
              <span className="text-red-600">异常</span>
              <p className="font-semibold text-base text-red-600">
                {currentBatch?.anomaly_count ?? 0}
              </p>
            </div>
            <div className="ml-auto">
              <span className={`status-${currentBatch?.status}`}>
                {currentBatch ? statusLabel[currentBatch.status] : ""}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterLow(false)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !filterLow
                  ? "bg-brand text-white"
                  : "bg-white text-[var(--text-secondary)] border border-[var(--border)]"
              }`}
            >
              全部读段
            </button>
            <button
              onClick={() => setFilterLow(true)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterLow
                  ? "bg-brand text-white"
                  : "bg-white text-[var(--text-secondary)] border border-[var(--border)]"
              }`}
            >
              仅低质量
            </button>
          </div>

          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-surface">
                  <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">
                    读段ID
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">
                    质量分
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">
                    质量状态
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">
                    异常标记
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--border)]">
                      <td colSpan={4} className="py-3 px-4">
                        <div className="h-4 bg-surface-alt rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : reads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[var(--text-muted)]">
                      暂无读段数据
                    </td>
                  </tr>
                ) : (
                  reads.map((r, i) => (
                    <tr
                      key={r.id}
                      onClick={() => selectRead(r)}
                      className={`border-b border-[var(--border)] cursor-pointer transition-colors hover:bg-brand-50 ${
                        i % 2 === 1 ? "bg-surface/50" : ""
                      } ${r.is_low_quality ? "border-l-4 border-l-amber" : ""}`}
                    >
                      <td className="py-2.5 px-4 font-mono text-xs">{r.read_id}</td>
                      <td className="py-2.5 px-4">
                        <ScoreColor score={r.quality_score} />
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge low={r.is_low_quality} />
                      </td>
                      <td className="py-2.5 px-4">
                        {r.anomaly_id ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            已标记
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedRead && (
        <div className="fixed inset-0 z-40" onClick={closeDrawer}>
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}

      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white z-50 shadow-xl transform transition-transform duration-300 ${
          selectedRead ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedRead && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="font-serif font-semibold text-base">读段详情</h3>
              <button onClick={closeDrawer} className="p-1 rounded-lg hover:bg-surface transition-colors">
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">读段ID</p>
                <p className="font-mono text-sm">{selectedRead.read_id}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">质量分</p>
                <ScoreColor score={selectedRead.quality_score} />
              </div>

              {selectedRead.is_low_quality && (
                <>
                  <div className="border-t border-[var(--border)] pt-4">
                    <h4 className="font-serif font-semibold text-sm mb-3">为什么没通过</h4>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {selectedRead.reason_explanation ?? "未提供说明"}
                    </p>
                  </div>
                  {selectedRead.reason_category && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">原因分类</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-alt text-[var(--text-secondary)]">
                        {selectedRead.reason_category}
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-[var(--border)] pt-4">
                {selectedRead.anomaly_id ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      已标记异常
                    </span>
                    <Link
                      to={`/review/${selectedRead.anomaly_id}`}
                      className="text-xs text-brand hover:underline"
                    >
                      查看详情 →
                    </Link>
                  </div>
                ) : (
                  <button onClick={handleMarkAnomaly} disabled={loading} className="btn-amber">
                    标记为异常
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
