import { useState, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAppStore } from "@/store/appStore";
import { ProblemBadge, StatusBadge } from "@/components/ui/Badges";
import Alert from "@/components/ui/Alert";
import {
  ClipboardCheck,
  FileCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronUp,
  Eye,
  BarChart3,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImportBatch, ProblemType, IngredientRecord } from "@/types";

export default function ReviewPage() {
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  const batches = useAppStore((s) => s.batches);
  const getBatchRecords = useAppStore((s) => s.getBatchRecords);
  const getBatchStats = useAppStore((s) => s.getBatchStats);
  const getResultsByRecordId = useAppStore((s) => s.getResultsByRecordId);

  const overallStats = useMemo(() => {
    const allRecords = batches.flatMap((b) => getBatchRecords(b.id));
    const stats = {
      total: allRecords.length,
      confirmed: allRecords.filter((r) => r.status === "confirmed").length,
      pending: allRecords.filter((r) => r.status === "pending").length,
      failed: allRecords.filter((r) => r.status === "failed").length,
      withConflicts: 0,
      issues: {
        unit_missing: 0,
        empty_value: 0,
        duplicate: 0,
        note_mixed: 0,
      } as Record<ProblemType, number>,
    };
    allRecords.forEach((r) => {
      r.problems.forEach((p) => {
        if (p !== "none") stats.issues[p]++;
      });
    });
    return stats;
  }, [batches, getBatchRecords]);

  const checkConsistency = (records: IngredientRecord[]) => {
    const issues: { recordId: string; type: string; message: string }[] = [];
    const seenNames = new Map<string, IngredientRecord[]>();

    records.forEach((r) => {
      const key = r.questionId || r.name;
      if (!seenNames.has(key)) seenNames.set(key, []);
      seenNames.get(key)!.push(r);
    });

    seenNames.forEach((group) => {
      if (group.length > 1) {
        const uniqueStatuses = new Set(group.map((r) => r.status));
        if (uniqueStatuses.size > 1) {
          group.forEach((r) => {
            issues.push({
              recordId: r.id,
              type: "conflict",
              message: `同一条记录(${r.questionId || r.name})存在${uniqueStatuses.size}种不同状态，结论可能冲突`,
            });
          });
        }
      }
    });

    records.forEach((r) => {
      const results = getResultsByRecordId(r.id);
      if (results.length > 1) {
        const values = results.filter((res) => res.success).map((res) => res.value);
        if (values.length > 1) {
          const max = Math.max(...values.filter((v): v is number => v !== undefined));
          const min = Math.min(...values.filter((v): v is number => v !== undefined));
          if (max - min > max * 0.1) {
            issues.push({
              recordId: r.id,
              type: "inconsistent",
              message: `多次计算结果差异超过10%（${min} ~ ${max}），建议复核`,
            });
          }
        }
      }
    });

    return issues;
  };

  const toggleBatch = (id: string) => {
    setExpandedBatch(expandedBatch === id ? null : id);
  };

  return (
    <AppLayout
      title="批量复核"
      subtitle="月底/课前使用 · 批次对比、结论一致性校验、异常标记"
      actions={
        <button className="btn-secondary">
          <Download className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
          导出复核报告
        </button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">记录总数</p>
              <BarChart3 className="w-5 h-5 text-primary-500" strokeWidth={1.5} />
            </div>
            <p className="text-3xl font-bold font-serif-sc text-slate-800 dark:text-slate-100">
              {overallStats.total}
            </p>
          </div>
          <div className="card p-5 bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-success-600 dark:text-success-400">已通过</p>
              <CheckCircle2 className="w-5 h-5 text-success-500" strokeWidth={1.5} />
            </div>
            <p className="text-3xl font-bold font-serif-sc text-success-700 dark:text-success-300">
              {overallStats.confirmed}
            </p>
            <p className="text-xs text-success-600 mt-1">
              {overallStats.total > 0 ? ((overallStats.confirmed / overallStats.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="card p-5 bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-warning-600 dark:text-warning-400">待确认</p>
              <Clock className="w-5 h-5 text-warning-500" strokeWidth={1.5} />
            </div>
            <p className="text-3xl font-bold font-serif-sc text-warning-700 dark:text-warning-300">
              {overallStats.pending}
            </p>
            <p className="text-xs text-warning-600 mt-1">需人工修正</p>
          </div>
          <div className="card p-5 bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-danger-600 dark:text-danger-400">已驳回</p>
              <XCircle className="w-5 h-5 text-danger-500" strokeWidth={1.5} />
            </div>
            <p className="text-3xl font-bold font-serif-sc text-danger-700 dark:text-danger-300">
              {overallStats.failed}
            </p>
          </div>
        </div>

        {overallStats.pending > 0 && (
          <Alert
            type="warning"
            title="存在待确认记录"
            message={`当前有 ${overallStats.pending} 条记录处于待确认状态，尚未完成人工修正。`}
            suggestion="请前往人工修正工作台处理这些记录，确保数据完整后再进行最终复核"
          />
        )}

        {batches.length === 0 ? (
          <div className="card p-12 text-center">
            <ClipboardCheck className="w-14 h-14 text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="text-lg font-serif-sc font-semibold text-slate-600 mb-2">
              暂无批次数据
            </h3>
            <p className="text-sm text-slate-400">
              请先在数据导入页面导入题目清单，完成计算和人工修正后在此处进行批量复核
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => (
              <BatchCard
                key={batch.id}
                batch={batch}
                expanded={expandedBatch === batch.id}
                onToggle={() => toggleBatch(batch.id)}
                records={getBatchRecords(batch.id)}
                stats={getBatchStats(batch.id)}
                consistencyIssues={checkConsistency(getBatchRecords(batch.id))}
              />
            ))}
          </div>
        )}

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary-700 dark:text-primary-300" strokeWidth={1.5} />
            <h3 className="section-title">投委会审阅摘要</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 dark:text-slate-400 mb-2">数据质量评估</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">数据完整率</span>
                  <span className="font-semibold text-success-600">
                    {overallStats.total > 0
                      ? (((overallStats.total - overallStats.pending) / overallStats.total) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">一次通过率</span>
                  <span className="font-semibold text-primary-600">
                    {overallStats.total > 0
                      ? ((overallStats.confirmed / overallStats.total) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">需人工干预</span>
                  <span className="font-semibold text-warning-600">{overallStats.pending} 条</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 mb-2">问题类型分布</p>
              <div className="space-y-2">
                {(["unit_missing", "empty_value", "duplicate", "note_mixed"] as ProblemType[]).map((p) => (
                  <div key={p} className="flex items-center justify-between gap-3">
                    <ProblemBadge type={p} size="sm" />
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                      <div
                        className="h-full bg-accent-400"
                        style={{
                          width: `${overallStats.total > 0 ? (overallStats.issues[p] / overallStats.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-500 w-8 text-right">
                      {overallStats.issues[p]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

interface BatchCardProps {
  batch: ImportBatch;
  expanded: boolean;
  onToggle: () => void;
  records: IngredientRecord[];
  stats: {
    total: number;
    confirmed: number;
    pending: number;
    failed: number;
    problems: Record<ProblemType, number>;
  };
  consistencyIssues: { recordId: string; type: string; message: string }[];
}

function BatchCard({ batch, expanded, onToggle, records, stats, consistencyIssues }: BatchCardProps) {
  return (
    <div className="card overflow-hidden">
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-primary-100 dark:bg-primary-900/40 rounded flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-primary-700 dark:text-primary-300" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 font-serif-sc">
              {batch.name}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {batch.fileName} · {new Date(batch.importedAt).toLocaleString()} · 导入人：{batch.importedBy}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
              <p className="text-xs text-slate-400">总数</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-success-600">{stats.confirmed}</p>
              <p className="text-xs text-slate-400">通过</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-warning-600">{stats.pending}</p>
              <p className="text-xs text-slate-400">待确认</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-danger-600">{stats.failed}</p>
              <p className="text-xs text-slate-400">驳回</p>
            </div>
            {consistencyIssues.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-danger-50 dark:bg-danger-900/30 rounded text-danger-600 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                {consistencyIssues.length} 异常
              </div>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-5 space-y-4 animate-fade-in">
          {consistencyIssues.length > 0 && (
            <Alert
              type="danger"
              title="一致性校验发现异常"
              message={`检测到 ${consistencyIssues.length} 条可能存在结论冲突或计算不一致的记录。`}
              suggestion="请重点关注以下记录，确保同一批数据不会出现互相打架的结论"
            />
          )}

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>题目编号</th>
                  <th>食材名称</th>
                  <th>数量/单位</th>
                  <th>问题</th>
                  <th>状态</th>
                  <th>一致性</th>
                  <th>版本</th>
                  <th>更新人</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const issue = consistencyIssues.find((i) => i.recordId === r.id);
                  return (
                    <tr key={r.id} className={cn(issue && "bg-warning-50/50 dark:bg-warning-900/10")}>
                      <td className="font-mono text-xs text-slate-500">{r.questionId || "—"}</td>
                      <td className="font-medium">{r.name}</td>
                      <td className="font-mono text-sm">
                        {r.quantity ?? "—"} {r.unit || ""}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {r.problems.length === 0 ? (
                            <span className="text-xs text-slate-400">无</span>
                          ) : (
                            r.problems.map((p) => <ProblemBadge key={p} type={p} size="sm" />)
                          )}
                        </div>
                      </td>
                      <td><StatusBadge status={r.status} size="sm" /></td>
                      <td>
                        {issue ? (
                          <span className="badge-danger" title={issue.message}>
                            <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                            <span>{issue.type === "conflict" ? "状态冲突" : "结果不一致"}</span>
                          </span>
                        ) : (
                          <span className="badge-success">
                            <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                            <span>正常</span>
                          </span>
                        )}
                      </td>
                      <td className="font-mono text-xs">v{r.version}</td>
                      <td className="text-xs text-slate-500">{r.updatedBy}</td>
                      <td className="text-right">
                        <button className="btn-ghost text-xs py-1 px-2">
                          <Eye className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                          详情
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
