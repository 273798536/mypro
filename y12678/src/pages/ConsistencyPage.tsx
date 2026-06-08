import { useState, useMemo } from "react";
import { ShieldCheck, AlertTriangle, FileText, Copy, RefreshCw, CheckCircle, Download } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import DuplicateCompareCard from "@/components/consistency/DuplicateCompareCard";
import { useAppStore } from "@/store/useAppStore";
import type { ConflictType } from "@/types";

type FilterKey = "all" | ConflictType | "pending" | "resolved";

export default function ConsistencyPage() {
  const { dataConflicts, resolveConflict, measurementRecords, supplementRecords } = useAppStore();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [scanning, setScanning] = useState(false);

  const stats = useMemo(() => ({
    total: dataConflicts.length,
    pending: dataConflicts.filter((c) => c.status === "pending").length,
    duplicate: dataConflicts.filter((c) => c.conflictType === "duplicate").length,
    supplement: dataConflicts.filter((c) => c.conflictType === "supplement-conflict").length,
    mismatch: dataConflicts.filter((c) => c.conflictType === "coordinate-mismatch").length,
  }), [dataConflicts]);

  const filtered = useMemo(() => {
    if (filter === "all") return dataConflicts;
    if (filter === "pending" || filter === "resolved") {
      return dataConflicts.filter((c) => c.status === filter);
    }
    return dataConflicts.filter((c) => c.conflictType === filter);
  }, [filter, dataConflicts]);

  const filters: { k: FilterKey; label: string; icon: any; count: number }[] = [
    { k: "all", label: "全部", icon: ShieldCheck, count: stats.total },
    { k: "pending", label: "待处理", icon: AlertTriangle, count: stats.pending },
    { k: "duplicate", label: "重复导入", icon: Copy, count: stats.duplicate },
    { k: "supplement-conflict", label: "补录冲突", icon: FileText, count: stats.supplement },
    { k: "coordinate-mismatch", label: "坐标系混用", icon: AlertTriangle, count: stats.mismatch },
    { k: "resolved", label: "已裁决", icon: CheckCircle, count: stats.total - stats.pending },
  ];

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 1500);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="数据一致性校验"
        subtitle="提交运维组前核验 · 重复导入检测 · 补录冲突识别"
      >
        <button className="btn-secondary" onClick={handleScan}>
          <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "扫描中..." : "重新扫描"}
        </button>
        <button className="btn-secondary">
          <Download className="h-4 w-4" />
          导出校验报告
        </button>
      </PageHeader>

      <div className="flex-1 space-y-5 p-6">
        {stats.pending > 0 && (
          <div className="rounded border border-coral-200 bg-gradient-to-r from-coral-50 to-amber-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-coral-500" />
              <div>
                <p className="text-sm font-semibold text-coral-800 font-song">
                  待处理数据冲突 {stats.pending} 条
                </p>
                <p className="text-[11px] text-coral-700">
                  提交运维组前请确认所有冲突已裁决，避免同一件事出现多份结论
                </p>
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => setFilter("pending")}
                  className="btn-danger"
                >
                  立即处理
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="eng-card p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="h-4 w-4 text-ocean-500" />
              <span>总记录</span>
            </div>
            <p className="mt-1 font-mono-num text-2xl font-bold text-ocean-700">{measurementRecords.length}</p>
          </div>
          <div className="eng-card p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText className="h-4 w-4 text-lavender-500" />
              <span>补录次数</span>
            </div>
            <p className="mt-1 font-mono-num text-2xl font-bold text-lavender-600">{supplementRecords.length}</p>
          </div>
          <div className="eng-card p-4 border-l-4 border-l-coral-500">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Copy className="h-4 w-4 text-coral-500" />
              <span>疑似重复</span>
            </div>
            <p className="mt-1 font-mono-num text-2xl font-bold text-coral-600">{stats.duplicate}</p>
          </div>
          <div className="eng-card p-4 border-l-4 border-l-lavender-500">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText className="h-4 w-4 text-lavender-500" />
              <span>补录冲突</span>
            </div>
            <p className="mt-1 font-mono-num text-2xl font-bold text-lavender-600">{stats.supplement}</p>
          </div>
          <div className="eng-card p-4 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>坐标混用</span>
            </div>
            <p className="mt-1 font-mono-num text-2xl font-bold text-amber-600">{stats.mismatch}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.k}
                onClick={() => setFilter(f.k)}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-song transition-colors ${
                  filter === f.k
                    ? "bg-ocean-500 text-white shadow-sm"
                    : "bg-white border border-ocean-200 text-ocean-600 hover:bg-ocean-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
                <span
                  className={`ml-1 rounded px-1.5 py-px font-mono-num text-[10px] ${
                    filter === f.k
                      ? "bg-white/20 text-white"
                      : "bg-ocean-100 text-ocean-700"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
          <span className="ml-2 text-xs text-gray-400">
            共 {filtered.length} 条
          </span>
        </div>

        <div className="space-y-4">
          {filtered.map((c, idx) => (
            <DuplicateCompareCard
              key={c.id}
              conflict={c}
              index={idx}
              onResolve={resolveConflict}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="eng-card flex flex-col items-center justify-center py-20">
            <CheckCircle className="mb-3 h-12 w-12 text-seaweed-300" />
            <p className="font-song text-ocean-500">数据一致性良好</p>
            <p className="mt-1 text-xs text-gray-400">当前筛选范围无冲突或异常</p>
          </div>
        )}
      </div>
    </div>
  );
}
