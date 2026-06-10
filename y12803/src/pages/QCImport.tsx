import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Upload, FileJson, FileSpreadsheet, AlertTriangle, CheckCircle, X, Loader2 } from "lucide-react";
import { useStore, type DuplicateConflict } from "@/store";
import { cn } from "@/lib/utils";

export default function QCImport() {
  const { qcSummary, duplicateConflicts, fetchQCSummary, importJSON, importCSV, resolveConflict } = useStore();
  const [activeTab, setActiveTab] = useState<"json" | "csv">("json");
  const [jsonText, setJsonText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchQCSummary();
  }, [fetchQCSummary]);

  const handleImportJSON = async () => {
    if (!jsonText.trim()) return;
    setImporting(true);
    try {
      const result = await importJSON(jsonText);
      setImportResult({ inserted: result.inserted, skipped: result.skipped });
      if (result.conflicts.length > 0) {
        // conflicts will be shown via store
      }
      setJsonText("");
      await fetchQCSummary();
    } catch {
      setImportResult({ inserted: 0, skipped: 0 });
    } finally {
      setImporting(false);
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) return;
    setImporting(true);
    try {
      const result = await importCSV(csvFile);
      setImportResult({ inserted: result.inserted, skipped: result.skipped });
      setCsvFile(null);
      await fetchQCSummary();
    } catch {
      setImportResult({ inserted: 0, skipped: 0 });
    } finally {
      setImporting(false);
    }
  };

  const handleResolve = async (index: number, strategy: "overwrite" | "skip" | "merge") => {
    const conflict = duplicateConflicts[index];
    if (!conflict) return;
    try {
      await resolveConflict(strategy, {
        plantId: conflict.plantId,
        batchNo: conflict.batchNo,
        measuredAt: conflict.measuredAt,
      });
      await fetchQCSummary();
    } catch {}
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      setCsvFile(file);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="heading-font mb-4 text-xl font-semibold text-primary-dark">质控概览</h2>
        {qcSummary ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard
                label="异常率"
                value={qcSummary.abnormalRate}
                color="accent"
                icon={<AlertTriangle className="h-5 w-5" />}
              />
              <MetricCard
                label="缺失率"
                value={qcSummary.missingRate}
                color="danger"
                icon={<AlertTriangle className="h-5 w-5" />}
              />
              <MetricCard
                label="标注完整性"
                value={qcSummary.annotationCompleteness}
                color="primary"
                icon={<CheckCircle className="h-5 w-5" />}
              />
            </div>

            <div className="rounded-2xl border border-surface-dark/60 bg-white p-5 shadow-sm">
              <h3 className="heading-font mb-3 text-base font-semibold text-primary-dark">月度趋势</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={qcSummary.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="abnormalRate" name="异常率" fill="#E09F3E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="missingRate" name="缺失率" fill="#E63946" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-info">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 加载质控数据...
          </div>
        )}
      </div>

      <div>
        <h2 className="heading-font mb-4 text-xl font-semibold text-primary-dark">数据导入</h2>
        <div className="rounded-2xl border border-surface-dark/60 bg-white shadow-sm">
          <div className="flex border-b border-surface-dark">
            <button
              onClick={() => setActiveTab("json")}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors",
                activeTab === "json"
                  ? "border-b-2 border-primary text-primary"
                  : "text-info hover:text-primary-dark"
              )}
            >
              <FileJson className="h-4 w-4" /> JSON导入
            </button>
            <button
              onClick={() => setActiveTab("csv")}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors",
                activeTab === "csv"
                  ? "border-b-2 border-primary text-primary"
                  : "text-info hover:text-primary-dark"
              )}
            >
              <FileSpreadsheet className="h-4 w-4" /> CSV导入
            </button>
          </div>

          <div className="p-5">
            {activeTab === "json" ? (
              <div className="space-y-4">
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="在此粘贴JSON数据（数组格式）..."
                  rows={8}
                  className="w-full rounded-xl border border-surface-dark bg-surface px-4 py-3 font-mono text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={handleImportJSON}
                  disabled={importing || !jsonText.trim()}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  导入JSON
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-surface-dark hover:border-primary/50"
                  )}
                >
                  <Upload className="mb-3 h-10 w-10 text-info" />
                  <p className="mb-1 text-sm font-medium text-primary-dark">
                    {csvFile ? csvFile.name : "拖拽CSV文件到此处"}
                  </p>
                  <p className="text-xs text-info">
                    {csvFile ? "文件已选择" : "或点击下方按钮选择文件"}
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                    className="mt-3 text-sm"
                  />
                </div>
                <button
                  onClick={handleImportCSV}
                  disabled={importing || !csvFile}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  导入CSV
                </button>
              </div>
            )}

            {importResult && (
              <div className="mt-4 flex items-center gap-4 rounded-xl bg-surface p-4">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="text-sm text-primary-dark">
                  导入完成: 插入 <strong>{importResult.inserted}</strong> 条, 跳过 <strong>{importResult.skipped}</strong> 条
                </span>
                <button onClick={() => setImportResult(null)} className="ml-auto text-info hover:text-primary-dark">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {duplicateConflicts.length > 0 && (
        <ConflictModal
          conflicts={duplicateConflicts}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: "primary" | "accent" | "danger";
  icon: React.ReactNode;
}) {
  const colorMap = {
    primary: { bg: "bg-primary/10", text: "text-primary", bar: "bg-primary" },
    accent: { bg: "bg-accent/10", text: "text-accent", bar: "bg-accent" },
    danger: { bg: "bg-danger/10", text: "text-danger", bar: "bg-danger" },
  };
  const c = colorMap[color];
  const displayValue = value > 1 ? value.toFixed(1) : (value * 100).toFixed(1);
  const pct = Math.min(Math.round(value > 1 ? value : value * 100), 100);

  return (
    <div className="rounded-2xl border border-surface-dark/60 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-info">{label}</span>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", c.bg, c.text)}>
          {icon}
        </div>
      </div>
      <div className="mb-2 text-2xl font-bold text-primary-dark">{displayValue}{value <= 1 ? "%" : ""}</div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-dark">
        <div className={cn("h-full rounded-full transition-all", c.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ConflictModal({
  conflicts,
  onResolve,
}: {
  conflicts: DuplicateConflict[];
  onResolve: (index: number, strategy: "overwrite" | "skip" | "merge") => void;
}) {
  const [idx, setIdx] = useState(0);
  const conflict = conflicts[idx];

  if (!conflict) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="heading-font text-lg font-semibold text-primary-dark">
            重复导入冲突 ({idx + 1}/{conflicts.length})
          </h3>
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
            重复记录
          </span>
        </div>

        <div className="mb-5 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="mb-2 text-sm font-medium text-primary-dark">检测到重复数据:</p>
          <div className="space-y-1 text-xs text-info">
            <div>样本编号: <span className="font-medium text-primary-dark">{conflict.plantId}</span></div>
            <div>试剂批号: <span className="font-medium text-primary-dark">{conflict.batchNo}</span></div>
            <div>测量时间: <span className="font-medium text-primary-dark">{conflict.measuredAt?.slice(0, 10)}</span></div>
            <div>已有记录ID: <span className="font-mono text-primary-dark">{conflict.existingId?.slice(0, 8)}...</span></div>
          </div>
        </div>

        <p className="mb-4 text-sm text-info">同一样本、同一批号、同一测量时间的记录已存在，请选择处理方式:</p>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="rounded-lg border border-surface-dark px-3 py-1.5 text-sm text-info hover:bg-surface disabled:opacity-40"
          >
            上一条
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onResolve(idx, "skip")}
              className="rounded-lg border border-surface-dark px-4 py-1.5 text-sm text-info hover:bg-surface"
            >
              跳过
            </button>
            <button
              onClick={() => onResolve(idx, "overwrite")}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
            >
              覆盖
            </button>
            <button
              onClick={() => onResolve(idx, "merge")}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
            >
              合并
            </button>
          </div>
          <button
            onClick={() => setIdx((i) => Math.min(conflicts.length - 1, i + 1))}
            disabled={idx >= conflicts.length - 1}
            className="rounded-lg border border-surface-dark px-3 py-1.5 text-sm text-info hover:bg-surface disabled:opacity-40"
          >
            下一条
          </button>
        </div>
      </div>
    </div>
  );
}
