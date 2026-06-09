import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAppStore } from "@/store/appStore";
import { ProblemBadge, StatusBadge } from "@/components/ui/Badges";
import Alert from "@/components/ui/Alert";
import {
  GitCompare,
  Clock,
  FileText,
  User,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  X,
  RefreshCw,
  Plus,
  Minus,
  Pencil,
  Ban,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VersionConflict, ImportBatch, VersionDiff, ConflictResolution } from "@/types";

export default function VersionsPage() {
  const [selectedConflict, setSelectedConflict] = useState<VersionConflict | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  const batches = useAppStore((s) => s.batches);
  const conflicts = useAppStore((s) => s.conflicts);
  const resolveConflict = useAppStore((s) => s.resolveConflict);
  const records = useAppStore((s) => s.records);
  const currentUser = useAppStore((s) => s.currentUser);

  const pendingConflicts = conflicts.filter((c) => !c.resolution);
  const resolvedConflicts = conflicts.filter((c) => c.resolution);

  const handleResolve = (resolution: ConflictResolution) => {
    if (!selectedConflict) return;
    resolveConflict(selectedConflict.recordId, resolution, resolveNote || undefined);
    setSelectedConflict(null);
    setResolveNote("");
  };

  return (
    <AppLayout
      title="版本管理中心"
      subtitle="草稿与冲突 · 重复导入去重、版本对比、冲突解决"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">导入批次</p>
              <FileText className="w-5 h-5 text-primary-500" strokeWidth={1.5} />
            </div>
            <p className="text-3xl font-bold font-serif-sc text-slate-800 dark:text-slate-100">
              {batches.length}
            </p>
          </div>
          <div className="card p-5 bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-warning-600 dark:text-warning-400">待解决冲突</p>
              <AlertTriangle className="w-5 h-5 text-warning-500" strokeWidth={1.5} />
            </div>
            <p className="text-3xl font-bold font-serif-sc text-warning-700 dark:text-warning-300">
              {pendingConflicts.length}
            </p>
            <p className="text-xs text-warning-600 mt-1">需人工判断保留版本</p>
          </div>
          <div className="card p-5 bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-success-600 dark:text-success-400">已解决冲突</p>
              <Shield className="w-5 h-5 text-success-500" strokeWidth={1.5} />
            </div>
            <p className="text-3xl font-bold font-serif-sc text-success-700 dark:text-success-300">
              {resolvedConflicts.length}
            </p>
          </div>
        </div>

        {pendingConflicts.length > 0 && (
          <Alert
            type="warning"
            title="检测到重复导入冲突"
            message={`存在 ${pendingConflicts.length} 条记录与已有数据重复，需要判断保留哪个版本。`}
            suggestion="请务必解决所有冲突后再提交投委会，避免同一件事出现两份互相打架的结论"
          />
        )}

        {/* Conflicts Section */}
        <div className="card">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary-700 dark:text-primary-300" strokeWidth={1.5} />
              <h3 className="section-title">冲突解决</h3>
              <span className="badge-warning ml-2">{pendingConflicts.length} 待处理</span>
            </div>
          </div>

          {pendingConflicts.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-success-400 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-slate-500 dark:text-slate-400">暂无待解决的版本冲突</p>
              <p className="text-xs text-slate-400 mt-1">
                当同一批草稿第二次导入时，系统会自动检测重复记录并在此处列出
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {pendingConflicts.map((conflict) => (
                <div
                  key={conflict.recordId}
                  className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100 font-serif-sc text-base">
                        {conflict.oldVersion.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        匹配键：{conflict.oldVersion.questionId || conflict.oldVersion.name}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedConflict(conflict)}
                        className="btn-accent text-sm"
                      >
                        <GitCompare className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                        对比并解决
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border-2 border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Clock className="w-4 h-4" strokeWidth={1.5} />
                          已有版本 (v{conflict.oldVersion.version})
                        </span>
                        <StatusBadge status={conflict.oldVersion.status} size="sm" />
                      </div>
                      <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                        <p>
                          <User className="w-3 h-3 inline mr-1" strokeWidth={1.5} />
                          {conflict.oldVersion.updatedBy}
                        </p>
                        <p>更新：{new Date(conflict.oldVersion.updatedAt).toLocaleString()}</p>
                        <p>
                          数量：{conflict.oldVersion.quantity ?? "—"}{" "}
                          {conflict.oldVersion.unit || ""}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-accent-50 dark:bg-accent-900/20 rounded border-2 border-accent-300 dark:border-accent-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-accent-700 dark:text-accent-300 flex items-center gap-1.5">
                          <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
                          新导入版本
                        </span>
                        <ProblemBadge type="duplicate" size="sm" />
                      </div>
                      <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                        <p>
                          <User className="w-3 h-3 inline mr-1" strokeWidth={1.5} />
                          {currentUser}（本次导入）
                        </p>
                        <p>
                          数量：{conflict.newVersion.quantity ?? "—"}{" "}
                          {conflict.newVersion.unit || ""}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {conflict.diffs
                            .filter((d) => d.diffType !== "unchanged")
                            .slice(0, 3)
                            .map((d) => (
                              <span
                                key={d.field}
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded font-mono",
                                  d.diffType === "added" && "bg-success-100 text-success-700",
                                  d.diffType === "removed" && "bg-danger-100 text-danger-700",
                                  d.diffType === "changed" && "bg-warning-100 text-warning-700"
                                )}
                              >
                                {d.diffType === "added" && <Plus className="w-2.5 h-2.5 inline" strokeWidth={3} />}
                                {d.diffType === "removed" && <Minus className="w-2.5 h-2.5 inline" strokeWidth={3} />}
                                {d.diffType === "changed" && <Pencil className="w-2.5 h-2.5 inline" strokeWidth={2} />}
                                {d.field}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Batches Timeline */}
        <div className="card">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-700 dark:text-primary-300" strokeWidth={1.5} />
              <h3 className="section-title">导入批次时间线</h3>
            </div>
          </div>

          {batches.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              暂无导入批次
            </div>
          ) : (
            <div className="p-5">
              <div className="relative">
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-6">
                  {batches.map((batch, idx) => (
                    <BatchTimelineItem
                      key={batch.id}
                      batch={batch}
                      isLatest={idx === 0}
                      recordCount={records.filter((r) => r.batchId === batch.id).length}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="section-title">版本对比与冲突解决</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedConflict.oldVersion.name} · 请选择保留的版本
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedConflict(null);
                  setResolveNote("");
                }}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-400 w-28">字段</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-400">
                        已有版本 (v{selectedConflict.oldVersion.version})
                      </th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-400">
                        新导入版本
                      </th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-400 w-20">差异</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedConflict.diffs.map((diff) => (
                      <DiffRow key={diff.field} diff={diff} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="form-label">处理备注（留痕）</label>
                <textarea
                  rows={2}
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  className="input-field resize-none"
                  placeholder="说明选择此版本的原因，供投委会审阅时参考..."
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between">
              <button
                onClick={() => handleResolve("keep_old")}
                className="btn-secondary"
              >
                <Ban className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                保留旧版本
              </button>
              <button
                onClick={() => handleResolve("manual")}
                className="btn-secondary"
              >
                <Pencil className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                人工处理
              </button>
              <button
                onClick={() => handleResolve("keep_new")}
                className="btn-accent"
              >
                <ArrowRight className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                采用新版本
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function DiffRow({ diff }: { diff: VersionDiff }) {
  const renderVal = (v: unknown) => {
    if (v === undefined || v === null || v === "") return <span className="text-slate-400 italic">（空）</span>;
    if (typeof v === "object") return <span className="font-mono text-xs">[对象]</span>;
    return <span className="font-mono">{String(v)}</span>;
  };

  const rowBg =
    diff.diffType === "added"
      ? "bg-success-50 dark:bg-success-900/10"
      : diff.diffType === "removed"
      ? "bg-danger-50 dark:bg-danger-900/10"
      : diff.diffType === "changed"
      ? "bg-warning-50 dark:bg-warning-900/10"
      : "";

  return (
    <tr className={cn("border-b border-slate-100 dark:border-slate-800", rowBg)}>
      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">{diff.field}</td>
      <td className={cn(
        "py-2 px-3",
        diff.diffType === "removed" && "text-danger-600 dark:text-danger-400 line-through",
        diff.diffType === "changed" && "text-danger-600 dark:text-danger-400"
      )}>
        {renderVal(diff.oldValue)}
      </td>
      <td className={cn(
        "py-2 px-3",
        diff.diffType === "added" && "text-success-600 dark:text-success-400 font-semibold",
        diff.diffType === "changed" && "text-success-600 dark:text-success-400 font-semibold"
      )}>
        {renderVal(diff.newValue)}
      </td>
      <td className="py-2 px-3">
        {diff.diffType === "unchanged" ? (
          <span className="text-xs text-slate-400">相同</span>
        ) : diff.diffType === "added" ? (
          <span className="badge-success text-[10px]">
            <Plus className="w-3 h-3" strokeWidth={3} />
            新增
          </span>
        ) : diff.diffType === "removed" ? (
          <span className="badge-danger text-[10px]">
            <Minus className="w-3 h-3" strokeWidth={3} />
            删除
          </span>
        ) : (
          <span className="badge-warning text-[10px]">
            <Pencil className="w-3 h-3" strokeWidth={2} />
            变更
          </span>
        )}
      </td>
    </tr>
  );
}

function BatchTimelineItem({
  batch,
  isLatest,
  recordCount,
}: {
  batch: ImportBatch;
  isLatest: boolean;
  recordCount: number;
}) {
  return (
    <div className="relative pl-12">
      <div
        className={cn(
          "absolute left-0 top-1 w-8 h-8 rounded-full border-2 flex items-center justify-center",
          isLatest
            ? "bg-primary-700 border-primary-500 text-white"
            : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-400"
        )}
      >
        {isLatest ? (
          <FileText className="w-4 h-4" strokeWidth={2} />
        ) : (
          <FileText className="w-4 h-4" strokeWidth={1.5} />
        )}
      </div>

      <div className={cn("card p-4", isLatest && "border-primary-300 dark:border-primary-700")}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">{batch.name}</h4>
              {isLatest && <span className="badge-info text-[10px]">最新</span>}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {batch.fileName} · {new Date(batch.importedAt).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <User className="w-3 h-3" strokeWidth={1.5} />
              导入人：{batch.importedBy}
            </p>
          </div>
          <div className="text-right text-sm">
            <div className="flex gap-3 mt-1">
              <span>
                <span className="font-bold text-success-600">{batch.cleanRecords}</span>
                <span className="text-slate-400 text-xs ml-1">通过</span>
              </span>
              <span>
                <span className="font-bold text-warning-600">{batch.problemRecords}</span>
                <span className="text-slate-400 text-xs ml-1">待处理</span>
              </span>
              <span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{batch.totalRecords}</span>
                <span className="text-slate-400 text-xs ml-1">总计</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">实际入库：{recordCount} 条</p>
          </div>
        </div>
      </div>
    </div>
  );
}
