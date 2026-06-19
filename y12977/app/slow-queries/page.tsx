"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  Database,
  TrendingUp,
  Lightbulb,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import type { SlowQuery, ScanBatch } from "@/lib/types";

export default function SlowQueriesPage() {
  const searchParams = useSearchParams();
  const batchIdParam = searchParams.get("batch_id");

  const [queries, setQueries] = useState<SlowQuery[]>([]);
  const [batches, setBatches] = useState<ScanBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>(batchIdParam || "");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/batches?limit=50")
      .then((r) => r.json())
      .then((data) => {
        setBatches(data.list);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = selectedBatch
      ? `/api/slow-queries?batch_id=${selectedBatch}`
      : "/api/slow-queries";

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setQueries(data.list);
        setLoading(false);
      });
  }, [selectedBatch]);

  const selectedBatchData = batches.find((b) => b.id === Number(selectedBatch));

  const handleExport = () => {
    if (!selectedBatch) {
      alert("请先选择一个批次后再导出");
      return;
    }
    const params = new URLSearchParams();
    params.set("batch_id", selectedBatch);
    params.set("type", "slow_queries");

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

  const getDurationColor = (ms: number) => {
    if (ms >= 2000) return "text-rose-600 bg-rose-50";
    if (ms >= 1000) return "text-amber-600 bg-amber-50";
    return "text-emerald-600 bg-emerald-50";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">慢查询归因</h1>
          <p className="text-sm text-zinc-500 mt-1">
            与脏行检测共用同一批处理记录，确保数据同源。提供归因分析和优化建议。
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={!selectedBatch}
          className="flex items-center gap-2 bg-white border border-zinc-200 px-4 py-2 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          导出 CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-700">筛选</span>
          <span className="text-xs text-zinc-400">共 {queries.length} 条慢查询</span>
          {selectedBatchData && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
              批次: {selectedBatchData.batch_no}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 min-w-[280px]"
          >
            <option value="">全部批次</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batch_no} - {b.scan_mode === "full" ? "全量" : "增量"} ({b.slow_queries} 条慢查询)
              </option>
            ))}
          </select>

          {selectedBatch && (
            <Link
              href={`/dirty-rows?batch_id=${selectedBatch}`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 rounded-lg"
            >
              <FileText className="w-4 h-4" />
              查看同批次脏行
            </Link>
          )}
        </div>
      </div>

      {selectedBatch && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Clock className="w-4 h-4" />
              <span>慢查询数</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 mt-1">{queries.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <TrendingUp className="w-4 h-4" />
              <span>最长耗时</span>
            </div>
            <p className="text-2xl font-bold text-rose-600 mt-1">
              {queries.length > 0
                ? `${Math.max(...queries.map((q) => q.duration_ms))}ms`
                : "-"}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Database className="w-4 h-4" />
              <span>涉及表数</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              {new Set(queries.map((q) => q.table_involved)).size}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <p className="text-sm text-zinc-500">加载中...</p>
        </div>
      ) : queries.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center">
          <Clock className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-sm text-zinc-500">暂无慢查询数据</p>
          <p className="text-xs text-zinc-400 mt-1">请选择批次或运行扫描</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queries.map((q) => {
            const isExpanded = expandedId === q.id;
            return (
              <div
                key={q.id}
                className="bg-white rounded-xl border border-zinc-200 overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-zinc-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${getDurationColor(
                        q.duration_ms
                      )}`}
                    >
                      {q.duration_ms}ms
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                          {q.table_involved}
                        </span>
                        <span className="text-xs text-zinc-400">批次 #{q.batch_id}</span>
                        <span className="text-xs text-zinc-400">
                          {formatTime(q.captured_at)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-800">{q.attribution}</p>
                      <p className="text-xs text-zinc-500 mt-1 font-mono truncate">
                        {q.query_signature}
                      </p>
                    </div>
                    <button className="text-zinc-400 hover:text-zinc-600">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-zinc-100 p-4 bg-zinc-50 space-y-4">
                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5" />
                        示例 SQL
                      </h4>
                      <pre className="text-xs bg-white p-3 rounded-lg border border-zinc-200 font-mono text-zinc-700 overflow-x-auto">
                        {q.sample_sql}
                      </pre>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        优化建议
                      </h4>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800">{q.recommendation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <div className="flex items-start gap-3">
          <div className="bg-white p-2 rounded-lg">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-zinc-900">数据同源说明</h4>
            <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
              本页面的慢查询数据与「脏行明细」「备份对比」「导出报告」均来自同一批次扫描记录。
              每个批次号关联一次完整的扫描，包括：备份快照、脏行检测、慢查询采集。
              安全审计员可从一条慢查询追溯到同批次的脏行和备份，完整分析性能与数据质量问题。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
