import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertOctagon,
  AlertTriangle,
  Copy,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { useRecordsStore } from "../store/recordsStore";
import StatusBadge from "../components/StatusBadge";
import { UNIT_LABELS, cn, formatDateTime } from "../lib/utils";

export default function SectionView() {
  const nav = useNavigate();
  const { records, fetchRecords, loading } = useRecordsStore();

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const problems = records.filter(
    (r) => r.unitErrors.length > 0 || r.riskNotes.length > 0 || r.hasDuplicate
  );
  const ok = records.filter(
    (r) => r.unitErrors.length === 0 && r.riskNotes.length === 0 && !r.hasDuplicate
  );

  return (
    <div className="flex-1 h-screen overflow-y-auto">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        <header>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-accent rounded-full" />
            <div>
              <h1 className="font-display text-2xl font-bold text-text-primary">
                剖切查看
              </h1>
              <p className="text-sm text-text-secondary mt-0.5 font-mono">
                日常复核入口 · 快速浏览、发现问题、拎出坏记录
              </p>
            </div>
          </div>
        </header>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-text-primary flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-danger" />
              待处理问题记录
              <span className="tag border border-danger/40 bg-danger-bg text-danger">
                {problems.length}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {problems.map((r) => {
              const hasError = r.unitErrors.length > 0;
              const hasDup = r.hasDuplicate;
              const isMisread = r.isTransparentOcclusionMisread;
              return (
                <div
                  key={r.id}
                  onClick={() => nav(`/records/${r.id}`)}
                  className={cn(
                    "panel panel-hover p-4 cursor-pointer card-glow group",
                    hasError && "animate-border-pulse"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-text-primary">{r.fixtureName}</div>
                      <div className="text-xs text-text-muted font-mono mt-0.5">
                        {r.coords.fixtureId} · {r.batchNo}
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {hasError && (
                      <span className="tag border bg-danger-bg border-danger/40 text-danger">
                        <AlertOctagon className="w-3 h-3 mr-1" />
                        单位换算错误
                      </span>
                    )}
                    {r.riskNotes.length > 0 && (
                      <span className="tag border bg-warning-bg border-warning/40 text-warning">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        风险备注 {r.riskNotes.length}
                      </span>
                    )}
                    {hasDup && (
                      <span className="tag border bg-warning-bg border-warning/40 text-warning">
                        <Copy className="w-3 h-3 mr-1" />
                        重复导入
                      </span>
                    )}
                    {isMisread && (
                      <span className="tag border bg-danger-bg border-danger/50 text-danger">
                        <EyeOff className="w-3 h-3 mr-1" />
                        验收：透明遮挡误读
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/60">
                    <div className="text-xs text-text-muted font-mono">
                      ({r.coords.x}, {r.coords.y}, {r.coords.z}) {UNIT_LABELS[r.coords.unit]}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                      查看详情
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
            {problems.length === 0 && (
              <div className="col-span-3 panel p-8 text-center text-text-muted">
                {loading ? "加载中..." : "暂无问题记录，全部已复核通过 ✓"}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display font-semibold text-text-primary mb-3 flex items-center gap-2">
            其他记录
            <span className="tag border border-border bg-bg-tertiary text-text-secondary">
              {ok.length}
            </span>
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {ok.map((r) => (
              <div
                key={r.id}
                onClick={() => nav(`/records/${r.id}`)}
                className="panel panel-hover p-3 cursor-pointer flex items-center justify-between group"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {r.fixtureName}
                  </div>
                  <div className="text-[11px] text-text-muted font-mono truncate">
                    {r.coords.fixtureId} · {formatDateTime(r.updatedAt)}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
