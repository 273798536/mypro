import { useState, useCallback } from "react";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  FileText,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { parseSalesCSV, parsePromoCSV, parseInventoryCSV, parseOOSCSV, readFileAsText } from "@/utils/csvParser";
import type { DataSourceStatus, VersionDiff, ConflictItem } from "@/types";

const ICON_MAP: Record<DataSourceStatus["id"], React.ReactNode> = {
  sales: <FileSpreadsheet className="w-5 h-5" />,
  promo: <Database className="w-5 h-5" />,
  inventory: <FileText className="w-5 h-5" />,
  oos: <AlertTriangle className="w-5 h-5" />,
};

const DIFF_TYPE_BADGE: Record<VersionDiff["diffType"], { label: string; badge: string }> = {
  added: { label: "新增", badge: "badge-success" },
  modified: { label: "变更", badge: "badge-warning" },
  deleted: { label: "删除", badge: "badge-danger" },
};

const SEVERITY_STYLE: Record<ConflictItem["severity"], { bg: string; border: string; badge: string }> = {
  high: { bg: "bg-danger/5", border: "border-danger/30", badge: "badge-danger" },
  medium: { bg: "bg-amber/5", border: "border-amber/30", badge: "badge-warning" },
  low: { bg: "bg-steel/5", border: "border-steel/30", badge: "badge-info" },
};

function DataSourceCard({ ds }: { ds: DataSourceStatus }) {
  const { setDataSourceLoading, setDataSourceLoaded, setSalesHistory, setPromoCalendarV2, setInventorySnapshot, setOutOfStockRecords } = useStore();

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      setDataSourceLoading(ds.id, true);
      try {
        const text = await readFileAsText(file);
        let rowCount = 0;
        if (ds.id === "sales") {
          const records = parseSalesCSV(text);
          setSalesHistory(records);
          rowCount = records.length;
        } else if (ds.id === "promo") {
          const records = parsePromoCSV(text);
          setPromoCalendarV2(records);
          rowCount = records.length;
        } else if (ds.id === "inventory") {
          const records = parseInventoryCSV(text);
          setInventorySnapshot(records);
          rowCount = records.length;
        } else if (ds.id === "oos") {
          const records = parseOOSCSV(text);
          setOutOfStockRecords(records);
          rowCount = records.length;
        }
        setDataSourceLoaded(ds.id, rowCount, file.name);
      } catch {
        setDataSourceLoading(ds.id, false);
      }
    },
    [ds.id, setDataSourceLoading, setDataSourceLoaded, setSalesHistory, setPromoCalendarV2, setInventorySnapshot, setOutOfStockRecords]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  return (
    <div className="card-hover flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-primary">
          {ICON_MAP[ds.id]}
          <span className="font-medium">{ds.name}</span>
        </div>
        {ds.loaded ? (
          <span className="badge-success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            已加载
          </span>
        ) : ds.loading ? (
          <span className="badge-info">加载中...</span>
        ) : (
          <span className="badge-warning">未加载</span>
        )}
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-base-200 hover:border-steel/50 transition-colors duration-200 py-6 cursor-pointer"
      >
        {ds.loaded ? (
          <>
            <FileText className="w-6 h-6 text-steel" />
            <span className="text-sm text-text-secondary">{ds.fileName}</span>
            <span className="mono text-xs text-steel">{ds.rowCount} 行</span>
          </>
        ) : (
          <>
            <Upload className="w-6 h-6 text-text-tertiary" />
            <span className="text-sm text-text-tertiary">拖拽文件到此处上传</span>
          </>
        )}
      </div>
    </div>
  );
}

function VersionDiffPanel({ diffs }: { diffs: VersionDiff[] }) {
  if (diffs.length === 0) return null;

  return (
    <div className="card animate-fade-in">
      <h3 className="text-base font-medium text-text-primary mb-4">促销日历版本对比</h3>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="rounded-md bg-base-100/50 p-2 text-center text-xs text-text-secondary">
          旧版本
        </div>
        <div className="rounded-md bg-steel/10 p-2 text-center text-xs text-steel">新版本</div>
      </div>
      <div className="flex flex-col gap-2">
        {diffs.map((diff, i) => (
          <div
            key={i}
            className={`grid grid-cols-[1fr_1fr_auto] gap-4 items-center rounded-md px-3 py-2 ${
              diff.diffType === "modified"
                ? "bg-amber/5 border border-amber/20"
                : diff.diffType === "added"
                ? "bg-emerald/5 border border-emerald/20"
                : "bg-danger/5 border border-danger/20"
            }`}
          >
            <span className="mono text-sm text-text-secondary">{diff.oldValue}</span>
            <span className="mono text-sm text-text-primary">{diff.newValue}</span>
            <span className={DIFF_TYPE_BADGE[diff.diffType].badge}>
              {diff.field} · {DIFF_TYPE_BADGE[diff.diffType].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConflictBanner({ conflicts }: { conflicts: ConflictItem[] }) {
  const [expanded, setExpanded] = useState(false);

  if (conflicts.length === 0) return null;

  const highCount = conflicts.filter((c) => c.severity === "high").length;
  const mediumCount = conflicts.filter((c) => c.severity === "medium").length;
  const lowCount = conflicts.filter((c) => c.severity === "low").length;

  return (
    <div className="card animate-slide-in border-danger/30">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-danger" />
          <span className="font-medium text-danger">数据冲突警告</span>
          <span className="mono text-sm text-text-secondary">共 {conflicts.length} 项</span>
        </div>
        <div className="flex items-center gap-3">
          {highCount > 0 && (
            <span className="badge-danger">高风险 {highCount}</span>
          )}
          {mediumCount > 0 && (
            <span className="badge-warning">中风险 {mediumCount}</span>
          )}
          {lowCount > 0 && (
            <span className="badge-info">低风险 {lowCount}</span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-text-tertiary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 flex flex-col gap-2 animate-fade-in">
          {conflicts.map((c, i) => {
            const style = SEVERITY_STYLE[c.severity];
            return (
              <div
                key={i}
                className={`rounded-md border px-4 py-3 ${style.bg} ${style.border}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="mono text-sm font-medium text-text-primary">
                    {c.skuId}
                  </span>
                  <span className={style.badge}>
                    {c.severity === "high" ? "高风险" : c.severity === "medium" ? "中风险" : "低风险"}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mb-2">{c.description}</p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-text-tertiary">销售结论：</span>
                    <span className="text-text-primary">{c.salesConclusion}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary">库存结论：</span>
                    <span className="text-text-primary">{c.inventoryConclusion}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  const { dataSources, versionDiffs, conflicts, loadSampleData, sampleLoaded } = useStore();
  const promoLoaded = dataSources.find((d) => d.id === "promo")?.loaded ?? false;
  const anyLoaded = dataSources.some((d) => d.loaded);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">数据导入台</h1>
        <button
          onClick={loadSampleData}
          disabled={sampleLoaded}
          className={`flex items-center gap-2 ${
            sampleLoaded ? "btn-secondary opacity-50 cursor-not-allowed" : "btn-primary"
          }`}
        >
          <Database className="w-4 h-4" />
          {sampleLoaded ? "样例已加载" : "加载样例数据"}
        </button>
      </div>

      {anyLoaded && <ConflictBanner conflicts={conflicts} />}

      <div className="grid grid-cols-2 gap-4">
        {dataSources.map((ds) => (
          <DataSourceCard key={ds.id} ds={ds} />
        ))}
      </div>

      {promoLoaded && <VersionDiffPanel diffs={versionDiffs} />}
    </div>
  );
}
