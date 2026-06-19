"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Filter,
  User,
  Clock,
  MessageSquare,
  ArrowRight,
  FileText,
  Database,
} from "lucide-react";
import { STATUS_LABEL, formatTime } from "@/lib/utils";
import type { ReviewLog } from "@/lib/types";

export default function AuditLogPage() {
  const searchParams = useSearchParams();
  const dirtyRowIdParam = searchParams.get("dirty_row_id");
  const batchIdParam = searchParams.get("batch_id");

  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: "",
    operator: "",
  });

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dirtyRowIdParam) params.set("dirty_row_id", dirtyRowIdParam);
    if (batchIdParam) params.set("batch_id", batchIdParam);
    params.set("limit", "200");

    fetch(`/api/review-logs?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.list);
        setLoading(false);
      });
  }, [dirtyRowIdParam, batchIdParam]);

  const actionLabels: Record<string, { label: string; color: string }> = {
    approve: { label: "复核通过", color: "bg-emerald-100 text-emerald-700" },
    reject: { label: "驳回", color: "bg-rose-100 text-rose-700" },
    escalate: { label: "升级处理", color: "bg-amber-100 text-amber-700" },
    reopen: { label: "重新打开", color: "bg-zinc-100 text-zinc-700" },
    comment: { label: "备注", color: "bg-sky-100 text-sky-700" },
  };

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));
  const uniqueOperators = Array.from(new Set(logs.map((l) => l.operator)));

  const filteredLogs = logs.filter((log) => {
    if (filters.action && log.action !== filters.action) return false;
    if (filters.operator && log.operator !== filters.operator) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">审计日志</h1>
        <p className="text-sm text-zinc-500 mt-1">
          所有复核操作完整留痕：谁改的、什么时候改的、为什么改。支持追溯到具体脏行和批次。
        </p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-700">筛选</span>
          <span className="text-xs text-zinc-400">
            共 {filteredLogs.length} 条记录
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          >
            <option value="">全部操作</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>
                {actionLabels[a]?.label ?? a}
              </option>
            ))}
          </select>

          <select
            value={filters.operator}
            onChange={(e) => setFilters({ ...filters, operator: e.target.value })}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          >
            <option value="">全部操作人</option>
            {uniqueOperators.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <ShieldCheck className="w-4 h-4" />
            <span>总操作数</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-1">
            {filteredLogs.length}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <span>复核通过</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {filteredLogs.filter((l) => l.action === "approve").length}
          </p>
        </div>
        <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
          <div className="flex items-center gap-2 text-sm text-rose-600">
            <span>驳回</span>
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-1">
            {filteredLogs.filter((l) => l.action === "reject").length}
          </p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <span>升级处理</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {filteredLogs.filter((l) => l.action === "escalate").length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <p className="text-sm text-zinc-500">加载中...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-sm text-zinc-500">暂无审计日志</p>
          <p className="text-xs text-zinc-400 mt-1">
            在「脏行明细」中进行复核操作后会产生审计记录
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-zinc-600 text-xs">
                    时间
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-zinc-600 text-xs">
                    操作人
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-zinc-600 text-xs">
                    操作
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-zinc-600 text-xs">
                    状态变更
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-zinc-600 text-xs">
                    原因
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-zinc-600 text-xs">
                    关联脏行
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-zacc-600 text-xs">
                    所属批次
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredLogs.map((log) => {
                  const act = actionLabels[log.action];
                  const stOld = STATUS_LABEL[log.old_status];
                  const stNew = STATUS_LABEL[log.new_status];
                  return (
                    <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-5 py-3 text-zinc-500 text-xs whitespace-nowrap">
                        {formatTime(log.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-zinc-700 font-medium">
                            {log.operator}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${act?.color}`}
                        >
                          {act?.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs ${stOld?.color}`}
                          >
                            {stOld?.label}
                          </span>
                          <ArrowRight className="w-3 h-3 text-zinc-300" />
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs ${stNew?.color}`}
                          >
                            {stNew?.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 max-w-xs">
                        {log.reason ? (
                          <div className="flex items-start gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                            <span className="text-zinc-600 text-xs line-clamp-2">
                              {log.reason}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/dirty-rows?#row-${log.dirty_row_id}`}
                          className="text-xs text-indigo-600 hover:underline font-mono"
                        >
                          #{log.dirty_row_id}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/dirty-rows?batch_id=${log.batch_id}`}
                          className="text-xs text-indigo-600 hover:underline font-mono"
                        >
                          #{log.batch_id}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
        <div className="flex items-start gap-3">
          <div className="bg-white p-2 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-zinc-900">审计追溯说明</h4>
            <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
              每条审计日志都完整记录了操作人、操作时间、状态变更和原因。
              可追溯链路：<strong className="text-zinc-800">审计日志 → 脏行详情 → 备份记录 → 批次信息 → 慢查询</strong>。
              安全审计员验收时，顺着一条异常往回查，可完整查到备份记录和处理意见。
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs text-emerald-700">
                所有操作永久留痕，不可篡改
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
