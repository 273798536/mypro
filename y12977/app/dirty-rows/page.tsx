"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown,
  Filter,
  Download,
  Clock,
  User,
  MessageSquare,
  Database,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  FileText,
  TrendingUp,
} from "lucide-react";
import {
  CATEGORY_LABEL,
  SEVERITY_LABEL,
  STATUS_LABEL,
  formatTime,
  shortText,
} from "@/lib/utils";
import type { DirtyRow, ReviewLog, BackupRecord, ScanBatch } from "@/lib/types";

export default function DirtyRowsPage() {
  const searchParams = useSearchParams();
  const batchIdParam = searchParams.get("batch_id");
  const statusParam = searchParams.get("status");
  const categoryParam = searchParams.get("category");

  const [rows, setRows] = useState<DirtyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<DirtyRow | null>(null);
  const [reviewLogs, setReviewLogs] = useState<ReviewLog[]>([]);
  const [backup, setBackup] = useState<BackupRecord | null>(null);
  const [batch, setBatch] = useState<ScanBatch | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: statusParam || "",
    category: categoryParam || "",
    severity: "",
    batch_id: batchIdParam || "",
  });
  const [reviewAction, setReviewAction] = useState<string>("");
  const [reviewReason, setReviewReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [operator, setOperator] = useState("安全审计员_张三");

  const fetchRows = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.category) params.set("category", filters.category);
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.batch_id) params.set("batch_id", filters.batch_id);
    params.set("limit", "500");

    fetch(`/api/dirty-rows?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.list);
        setLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const fetchDetail = (id: number) => {
    setDetailLoading(true);
    fetch(`/api/dirty-rows/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSelectedRow(data.row);
        setReviewLogs(data.review);
        setBackup(data.backup);
        setBatch(data.batch);
        setDetailLoading(false);
      });
  };

  const handleReview = async () => {
    if (!selectedRow || !reviewAction) return;
    setReviewing(true);

    try {
      const res = await fetch("/api/dirty-rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRow.id,
          action: reviewAction,
          operator,
          reason: reviewReason,
        }),
      });
      const data = await res.json();
      setSelectedRow(data.row);
      setReviewLogs(data.review_logs);
      fetchRows();
      setReviewAction("");
      setReviewReason("");
    } finally {
      setReviewing(false);
    }
  };

  const handleExport = () => {
    if (!filters.batch_id) {
      alert("请先选择一个批次后再导出");
      return;
    }
    const params = new URLSearchParams();
    params.set("batch_id", filters.batch_id);
    params.set("type", "dirty_rows");
    params.set("operator", operator);

    fetch(`/api/export?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const blob = new Blob([data.content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.file_name;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const categories = [
    { value: "", label: "全部类别" },
    { value: "permission_override", label: "权限越权" },
    { value: "data_missing", label: "数据缺失" },
    { value: "range_violation", label: "值域违规" },
    { value: "duplicate_key", label: "重复主键" },
    { value: "format_error", label: "格式错误" },
  ];

  const statuses = [
    { value: "", label: "全部状态" },
    { value: "pending", label: "待复核" },
    { value: "approved", label: "复核通过" },
    { value: "rejected", label: "已驳回" },
    { value: "escalated", label: "已升级" },
  ];

  const severities = [
    { value: "", label: "全部级别" },
    { value: "high", label: "高危" },
    { value: "medium", label: "中危" },
    { value: "low", label: "低危" },
  ];

  const actionLabels: Record<string, { label: string; icon: any; color: string }> = {
    approve: { label: "复核通过", icon: CheckCircle, color: "bg-emerald-500 hover:bg-emerald-600" },
    reject: { label: "驳回", icon: XCircle, color: "bg-rose-500 hover:bg-rose-600" },
    escalate: { label: "升级处理", icon: TrendingUp, color: "bg-amber-500 hover:bg-amber-600" },
    reopen: { label: "重新打开", icon: RotateCcw, color: "bg-zinc-500 hover:bg-zinc-600" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">脏行明细</h1>
          <p className="text-sm text-zinc-500 mt-1">
            业务化说明清晰呈现，复核操作完整留痕。所有数据与图表、导出文件同源。
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-white border border-zinc-200 px-4 py-2 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          导出 CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-700">筛选条件</span>
          <span className="text-xs text-zinc-400">
            共 {rows.length} 条记录
            {filters.batch_id && ` · 批次 #${filters.batch_id}`}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.batch_id}
            onChange={(e) => setFilters({ ...filters, batch_id: e.target.value })}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          >
            <option value="">全部批次</option>
            {batchIdParam && <option value={batchIdParam}>批次 #{batchIdParam}</option>}
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          >
            {severities.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="p-4 border-b border-zinc-100">
            <h2 className="font-semibold text-zinc-900 text-sm">脏行列表</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">加载中...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">暂无脏行数据</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 max-h-[calc(100vh-300px)] overflow-y-auto">
              {rows.map((row) => {
                const cat = CATEGORY_LABEL[row.category];
                const sev = SEVERITY_LABEL[row.severity];
                const st = STATUS_LABEL[row.status];
                const isSelected = selectedRow?.id === row.id;

                return (
                  <div
                    key={row.id}
                    onClick={() => fetchDetail(row.id)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-indigo-50 border-l-4 border-l-indigo-500"
                        : "hover:bg-zinc-50 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-1.5 rounded ${
                          row.severity === "high"
                            ? "bg-rose-100"
                            : row.severity === "medium"
                            ? "bg-amber-100"
                            : "bg-sky-100"
                        }`}
                      >
                        <AlertTriangle
                          className={`w-4 h-4 ${
                            row.severity === "high"
                              ? "text-rose-600"
                              : row.severity === "medium"
                              ? "text-amber-600"
                              : "text-sky-600"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 ring-inset ${cat?.color}`}
                          >
                            {cat?.label}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sev?.color}`}
                          >
                            {sev?.label}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ring-1 ring-inset ${st?.color}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${st?.dot}`} />
                            {st?.label}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-800 mt-1.5 line-clamp-2">
                          {shortText(row.business_explanation, 100)}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
                          <span>#{row.id}</span>
                          <span>批次 #{row.batch_id}</span>
                          <span>{row.source_table}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selectedRow ? (
            <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
              <ShieldCheck className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">点击左侧脏行查看详情</p>
              <p className="text-xs text-zinc-400 mt-1">包含业务说明、技术细节、复核记录</p>
            </div>
          ) : detailLoading ? (
            <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
              <p className="text-sm text-zinc-500">加载中...</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900 text-sm">业务说明</h3>
                    <span className="text-xs text-zinc-400">给业务同事看</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                    {selectedRow.business_explanation}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900 text-sm">技术细节</h3>
                    <span className="text-xs text-zinc-400">给研发同学看</span>
                  </div>
                </div>
                <div className="p-4">
                  <pre className="text-xs text-zinc-600 whitespace-pre-wrap bg-zinc-50 p-3 rounded font-mono">
                    {selectedRow.tech_detail}
                  </pre>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50">
                  <h3 className="font-semibold text-zinc-900 text-sm">追溯链路</h3>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <Database className="w-3.5 h-3.5 text-zinc-400" />
                    <span>备份记录: </span>
                    <Link
                      href={`/compare?backup_a=${selectedRow.backup_id}`}
                      className="text-indigo-600 hover:underline font-mono"
                    >
                      #{selectedRow.backup_id}
                    </Link>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-500">{selectedRow.source_table}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>所属批次: </span>
                    <span className="font-mono text-indigo-600">
                      {batch?.batch_no ?? `#${selectedRow.batch_id}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
                    <span>脏行 ID: </span>
                    <span className="font-mono text-zinc-700">#{selectedRow.id}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-500">主键: {selectedRow.source_pk}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900 text-sm">复核操作</h3>
                    {selectedRow.reviewed_by && (
                      <span className="text-xs text-zinc-400">
                        {selectedRow.reviewed_by} · {formatTime(selectedRow.reviewed_at)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1.5">当前操作人</label>
                    <input
                      type="text"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(actionLabels).map(([key, val]) => {
                      const Icon = val.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => setReviewAction(key)}
                          disabled={reviewing}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors ${
                            reviewAction === key
                              ? val.color
                              : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {val.label}
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1.5">复核原因</label>
                    <textarea
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      placeholder="请填写复核原因，如：已补充审批单 / 权限已回收 / 需升级至安全委员会..."
                      rows={3}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                    />
                  </div>
                  <button
                    onClick={handleReview}
                    disabled={!reviewAction || reviewing}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:bg-zinc-300 disabled:cursor-not-allowed"
                  >
                    {reviewing ? "提交中..." : "提交复核"}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50">
                  <h3 className="font-semibold text-zinc-900 text-sm">复核历史</h3>
                </div>
                {reviewLogs.length === 0 ? (
                  <div className="p-6 text-center">
                    <Clock className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-xs text-zinc-400">暂无复核记录</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                    {reviewLogs.map((log) => {
                      const stOld = STATUS_LABEL[log.old_status];
                      const stNew = STATUS_LABEL[log.new_status];
                      return (
                        <div
                          key={log.id}
                          className="border-l-2 border-zinc-200 pl-3 pb-3 last:pb-0"
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-zinc-400" />
                            <span className="text-sm font-medium text-zinc-700">
                              {log.operator}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {formatTime(log.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs">
                            <span
                              className={`px-1.5 py-0.5 rounded ${stOld?.color}`}
                            >
                              {stOld?.label}
                            </span>
                            <ArrowRight className="w-3 h-3 text-zinc-300" />
                            <span
                              className={`px-1.5 py-0.5 rounded ${stNew?.color}`}
                            >
                              {stNew?.label}
                            </span>
                          </div>
                          {log.reason && (
                            <div className="mt-1.5 text-xs text-zinc-600 flex items-start gap-1.5">
                              <MessageSquare className="w-3 h-3 text-zinc-400 mt-0.5 flex-shrink-0" />
                              <span className="leading-relaxed">{log.reason}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
