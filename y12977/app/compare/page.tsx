"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  GitCompare,
  Download,
  ArrowRight,
  Plus,
  Minus,
  RefreshCw,
  Database,
  FileText,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import type { BackupRecord, ScanBatch } from "@/lib/types";

interface CompareResult {
  table: string;
  checksumA: string;
  checksumB: string;
  countA: number;
  countB: number;
  added: any[];
  removed: any[];
  modified: { key: string; old: any; new: any; diffs: string[] }[];
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const backupAParam = searchParams.get("backup_a");
  const backupBParam = searchParams.get("backup_b");
  const batchAParam = searchParams.get("batch_a");
  const batchBParam = searchParams.get("batch_b");

  const [backupsA, setBackupsA] = useState<BackupRecord[]>([]);
  const [backupsB, setBackupsB] = useState<BackupRecord[]>([]);
  const [selectedA, setSelectedA] = useState<number | null>(
    backupAParam ? Number(backupAParam) : null
  );
  const [selectedB, setSelectedB] = useState<number | null>(
    backupBParam ? Number(backupBParam) : null
  );
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<ScanBatch[]>([]);
  const [selectedBatchA, setSelectedBatchA] = useState<string>(batchAParam || "");
  const [selectedBatchB, setSelectedBatchB] = useState<string>("");
  const [diffTab, setDiffTab] = useState<"added" | "removed" | "modified" | "all">("all");

  useEffect(() => {
    fetch("/api/batches?limit=50")
      .then((r) => r.json())
      .then((data) => {
        setBatches(data.list);
      });
  }, []);

  useEffect(() => {
    if (selectedBatchA) {
      fetch(`/api/backups?batch_id=${selectedBatchA}`)
        .then((r) => r.json())
        .then((data) => {
          setBackupsA(data.list);
          if (data.list.length > 0 && !selectedA) {
            setSelectedA(data.list[0].id);
          }
        });
    }
  }, [selectedBatchA]);

  useEffect(() => {
    if (selectedBatchB) {
      fetch(`/api/backups?batch_id=${selectedBatchB}`)
        .then((r) => r.json())
        .then((data) => {
          setBackupsB(data.list);
          if (data.list.length > 0 && !selectedB) {
            setSelectedB(data.list[0].id);
          }
        });
    }
  }, [selectedBatchB]);

  const handleCompare = useCallback(() => {
    if (!selectedA || !selectedB) return;
    setLoading(true);
    fetch(`/api/backups?backup_a=${selectedA}&backup_b=${selectedB}`)
      .then((r) => r.json())
      .then((data) => {
        setCompareResult(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedA, selectedB]);

  useEffect(() => {
    if (selectedA && selectedB) {
      handleCompare();
    }
  }, [selectedA, selectedB, handleCompare]);

  const handleExport = () => {
    if (!selectedA || !selectedB) return;
    const params = new URLSearchParams();
    params.set("type", "compare");
    params.set("backup_a", String(selectedA));
    params.set("backup_b", String(selectedB));

    fetch(`/api/export?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const blob = new Blob([data.content], { type: "text/plain;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.file_name;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const backupA = backupsA.find((b) => b.id === selectedA);
  const backupB = backupsB.find((b) => b.id === selectedB);

  const renderRowData = (row: any, highlightFields?: string[]) => {
    const entries = Object.entries(row);
    return (
      <div className="space-y-1">
        {entries.map(([k, v]) => {
          const isHighlight = highlightFields?.includes(k);
          return (
            <div key={k} className="flex gap-2 text-xs">
              <span className="text-zinc-500 font-mono w-24 flex-shrink-0">{k}:</span>
              <span
                className={`font-mono truncate ${
                  isHighlight ? "bg-yellow-100 text-yellow-900 px-1 rounded font-medium" : "text-zinc-700"
                }`}
              >
                {String(v ?? "null")}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const tabs = [
    { key: "all", label: "全部", count: compareResult ? compareResult.added.length + compareResult.removed.length + compareResult.modified.length : 0 },
    { key: "added", label: "新增", count: compareResult?.added.length ?? 0 },
    { key: "removed", label: "删除", count: compareResult?.removed.length ?? 0 },
    { key: "modified", label: "修改", count: compareResult?.modified.length ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">备份对比</h1>
          <p className="text-sm text-zinc-500 mt-1">
            新旧备份并排对比，差异一目了然。支持导出对比报告，便于安全审计追溯。
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={!compareResult}
          className="flex items-center gap-2 bg-white border border-zinc-200 px-4 py-2 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          导出对比报告
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <GitCompare className="w-5 h-5 text-indigo-500" />
          <span className="font-semibold text-zinc-900">选择对比版本</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">A 版本 · 旧</label>
              <select
                value={selectedBatchA}
                onChange={(e) => {
                  setSelectedBatchA(e.target.value);
                  setSelectedA(null);
                }}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              >
                <option value="">选择批次...</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_no} ({b.scan_mode === "full" ? "全量" : "增量"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">备份表</label>
              <select
                value={selectedA ?? ""}
                onChange={(e) => setSelectedA(Number(e.target.value))}
                disabled={backupsA.length === 0}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:bg-zinc-50 disabled:text-zinc-400"
              >
                <option value="">选择备份...</option>
                {backupsA.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.source_table} ({b.row_count} 行)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <div className="bg-indigo-100 p-3 rounded-full">
              <ArrowRight className="w-5 h-5 text-indigo-600" />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">B 版本 · 新</label>
              <select
                value={selectedBatchB}
                onChange={(e) => {
                  setSelectedBatchB(e.target.value);
                  setSelectedB(null);
                }}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              >
                <option value="">选择批次...</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_no} ({b.scan_mode === "full" ? "全量" : "增量"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">备份表</label>
              <select
                value={selectedB ?? ""}
                onChange={(e) => setSelectedB(Number(e.target.value))}
                disabled={backupsB.length === 0}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:bg-zinc-50 disabled:text-zinc-400"
              >
                <option value="">选择备份...</option>
                {backupsB.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.source_table} ({b.row_count} 行)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-5">
          <button
            onClick={handleCompare}
            disabled={!selectedA || !selectedB || loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <GitCompare className="w-4 h-4" />
            )}
            {loading ? "对比中..." : "开始对比"}
          </button>
        </div>
      </div>

      {compareResult && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Database className="w-4 h-4" />
                <span>对比表</span>
              </div>
              <p className="text-lg font-bold text-zinc-900 mt-1">{compareResult.table}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <Plus className="w-4 h-4" />
                <span>新增记录</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                +{compareResult.added.length}
              </p>
            </div>
            <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
              <div className="flex items-center gap-2 text-sm text-rose-600">
                <Minus className="w-4 h-4" />
                <span>删除记录</span>
              </div>
              <p className="text-2xl font-bold text-rose-700 mt-1">
                -{compareResult.removed.length}
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <RefreshCw className="w-4 h-4" />
                <span>修改记录</span>
              </div>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                ~{compareResult.modified.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-zinc-900 text-sm">A 版本 · 旧</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">checksum: {compareResult.checksumA}</p>
                </div>
                <span className="text-xs bg-zinc-200 text-zinc-600 px-2 py-1 rounded">
                  {compareResult.countA} 行
                </span>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden">
              <div className="p-4 border-b border-indigo-100 bg-indigo-50 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-zinc-900 text-sm">B 版本 · 新</h3>
                  <p className="text-xs text-indigo-500 mt-0.5">checksum: {compareResult.checksumB}</p>
                </div>
                <span className="text-xs bg-indigo-200 text-indigo-700 px-2 py-1 rounded">
                  {compareResult.countB} 行
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="flex border-b border-zinc-100">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDiffTab(tab.key as any)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                    diffTab === tab.key
                      ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      diffTab === tab.key
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-4 max-h-[500px] overflow-y-auto">
              {diffTab === "all" || diffTab === "added" ? (
                <div className="space-y-3">
                  {compareResult.added.length === 0 && diffTab === "added" ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">无新增记录</p>
                    </div>
                  ) : (
                    compareResult.added.map((row, i) => (
                      <div
                        key={`added-${i}`}
                        className="border border-emerald-200 bg-emerald-50/30 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            <Plus className="w-3 h-3" />
                            新增
                          </span>
                          <span className="text-xs text-zinc-500">
                            key: {row.id ?? row.pk ?? String(i)}
                          </span>
                        </div>
                        {renderRowData(row)}
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              {diffTab === "all" || diffTab === "removed" ? (
                <div className="space-y-3 mt-3">
                  {compareResult.removed.length === 0 && diffTab === "removed" ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">无删除记录</p>
                    </div>
                  ) : (
                    compareResult.removed.map((row, i) => (
                      <div
                        key={`removed-${i}`}
                        className="border border-rose-200 bg-rose-50/30 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                            <Minus className="w-3 h-3" />
                            删除
                          </span>
                          <span className="text-xs text-zinc-500">
                            key: {row.id ?? row.pk ?? String(i)}
                          </span>
                        </div>
                        {renderRowData(row)}
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              {diffTab === "all" || diffTab === "modified" ? (
                <div className="space-y-3 mt-3">
                  {compareResult.modified.length === 0 && diffTab === "modified" ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">无修改记录</p>
                    </div>
                  ) : (
                    compareResult.modified.map((m, i) => (
                      <div
                        key={`mod-${i}`}
                        className="border border-amber-200 bg-amber-50/30 rounded-lg overflow-hidden"
                      >
                        <div className="bg-amber-100/50 px-3 py-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-200 px-2 py-0.5 rounded">
                            <RefreshCw className="w-3 h-3" />
                            修改
                          </span>
                          <span className="text-xs text-zinc-600">
                            key: {m.key}
                          </span>
                          <span className="text-xs text-zinc-500">
                            变更字段: {m.diffs.join(", ")}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-amber-200">
                          <div className="p-3">
                            <p className="text-xs text-zinc-500 mb-2 font-medium">旧值 (A)</p>
                            {renderRowData(m.old, m.diffs)}
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-zinc-500 mb-2 font-medium">新值 (B)</p>
                            {renderRowData(m.new, m.diffs)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-zinc-900">使用提示</h4>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  备份记录被改动后，可通过对比功能快速定位差异范围。
                  建议将脏行检测结果与备份对比结合使用：先在「脏行明细」中发现权限越权问题，
                  再到「备份对比」中查看对应数据的历史变更，评估影响范围。
                  导出的对比报告文件名包含两个批次号，可区分不同次运行的结果。
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {!compareResult && !loading && (
        <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center">
          <GitCompare className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-sm text-zinc-500">请选择两个备份版本进行对比</p>
          <p className="text-xs text-zinc-400 mt-1">支持按批次筛选备份表</p>
        </div>
      )}
    </div>
  );
}
