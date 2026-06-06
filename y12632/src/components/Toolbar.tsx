import { useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  MousePointer2,
  Square,
  Circle,
  Pentagon,
  PenTool,
  Hand,
  Undo2,
  Redo2,
  Trash2,
  Upload,
  Download,
  Filter,
  FileText,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Grid3X3,
  Ruler,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import {
  ANNOTATION_COLORS,
  ANNOTATION_LABELS,
  type AnnotationType,
  type FlipType,
  type ToolMode,
  type TrajectoryRecord,
} from "@/types";
import {
  exportAsJSON,
  importFromJSON,
  checkDuplicate,
  saveToLocalStorage,
} from "@/utils/dataIO";
import {
  generateReportText,
  downloadFile,
} from "@/utils/reportGenerator";
import { getFlipExplanation } from "@/utils/flipExplanations";

interface ToolbarProps {
  onRequestReport: () => void;
  onDuplicateFound: (existing: TrajectoryRecord, incoming: TrajectoryRecord) => void;
}

const TOOL_ITEMS: { mode: ToolMode; icon: ComponentType<{ className?: string }>; label: string }[] = [
  { mode: "select", icon: MousePointer2, label: "选择" },
  { mode: "rectangle", icon: Square, label: "矩形" },
  { mode: "circle", icon: Circle, label: "圆形" },
  { mode: "polygon", icon: Pentagon, label: "多边形" },
  { mode: "freehand", icon: PenTool, label: "手绘" },
  { mode: "pan", icon: Hand, label: "平移" },
];

export default function Toolbar({ onRequestReport, onDuplicateFound }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showScale, setShowScale] = useState(false);
  const [showFlip, setShowFlip] = useState(false);

  const {
    toolMode,
    setToolMode,
    currentColor,
    setCurrentColor,
    currentLabel,
    setCurrentLabel,
    filter,
    setFilter,
    record,
    updateGridConfig,
    updateScale,
    applyFlip,
    undo,
    redo,
    canUndo,
    canRedo,
    deleteAllAnnotations,
    loadRecord,
    updateRecordName,
  } = useAnnotationStore();

  const handleExportJSON = () => {
    saveToLocalStorage(record);
    downloadFile(
      exportAsJSON(record),
      `${record.name || "轨迹"}-${Date.now()}.json`,
      "application/json"
    );
  };

  const handleExportTXT = () => {
    saveToLocalStorage(record);
    downloadFile(
      generateReportText(record),
      `${record.name || "轨迹"}-报告-${Date.now()}.txt`,
      "text/plain"
    );
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = importFromJSON(text);
    if (!parsed) {
      alert("文件格式错误，请检查轨迹 JSON 文件");
      return;
    }
    const dup = checkDuplicate(parsed);
    if (dup.isDuplicate && dup.existing) {
      onDuplicateFound(dup.existing, parsed);
    } else {
      loadRecord(parsed);
      saveToLocalStorage(parsed);
    }
    e.target.value = "";
  };

  const handleCopyFlipExplanation = () => {
    if (record.flipExplanation) {
      navigator.clipboard.writeText(record.flipExplanation);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const toggleTypeFilter = (t: AnnotationType) => {
    const has = filter.types.includes(t);
    setFilter({
      types: has ? filter.types.filter((x) => x !== t) : [...filter.types, t],
    });
  };

  const toggleColorFilter = (c: string) => {
    const has = filter.colors.includes(c);
    setFilter({
      colors: has ? filter.colors.filter((x) => x !== c) : [...filter.colors, c],
    });
  };

  const toggleLabelFilter = (l: string) => {
    const has = filter.labels.includes(l);
    setFilter({
      labels: has ? filter.labels.filter((x) => x !== l) : [...filter.labels, l],
    });
  };

  const explanation = record.flipType ? getFlipExplanation(record.flipType) : null;

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-4">
        <input
          value={record.name}
          onChange={(e) => updateRecordName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white"
        />
        <div className="mt-2 text-xs text-gray-500">
          标注数：{record.annotations.length} · 操作：{record.operations.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            绘制工具
          </div>
          <div className="grid grid-cols-3 gap-1">
            {TOOL_ITEMS.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setToolMode(mode)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs transition",
                  toolMode === mode
                    ? "border-blue-500 bg-blue-50 text-blue-600 shadow-sm"
                    : "border-transparent text-gray-600 hover:bg-gray-50"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3">
          <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            标注颜色
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {ANNOTATION_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setCurrentColor(c)}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition",
                  currentColor === c ? "border-gray-800 scale-110" : "border-white shadow"
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div className="p-3">
          <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            病灶标签
          </div>
          <div className="flex flex-wrap gap-1 p-1">
            {ANNOTATION_LABELS.map((l) => (
              <button
                key={l}
                onClick={() => setCurrentLabel(currentLabel === l ? "" : l)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition",
                  currentLabel === l
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3">
          <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            画布配置
          </div>
          <div className="space-y-2">
            <button
              onClick={() => setShowScale(!showScale)}
              className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Ruler className="h-4 w-4" />
              比例尺：{record.scale.value} px/{record.scale.unit}
            </button>
            {showScale && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="mb-2 text-xs text-gray-500">
                  像素 / 单位（如 1mm = 10px，则填 10）
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.1"
                  value={record.scale.value}
                  onChange={(e) => updateScale({ value: parseFloat(e.target.value) || 1 })}
                  className="mb-2 w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm"
                />
                <input
                  type="text"
                  value={record.scale.unit}
                  onChange={(e) => updateScale({ unit: e.target.value })}
                  className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm"
                  placeholder="单位，如 mm"
                />
              </div>
            )}

            <button
              onClick={() =>
                updateGridConfig({ enabled: !record.gridConfig.enabled })
              }
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                record.gridConfig.enabled
                  ? "border-green-300 bg-green-50 text-green-700"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              )}
            >
              <Grid3X3 className="h-4 w-4" />
              网格吸附：{record.gridConfig.enabled ? "开启" : "关闭"}
            </button>
            {record.gridConfig.enabled && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <label className="mb-1 block text-xs text-gray-500">
                  网格大小：{record.gridConfig.size} px
                </label>
                <input
                  type="range"
                  min="5"
                  max="80"
                  value={record.gridConfig.size}
                  onChange={(e) =>
                    updateGridConfig({ size: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            )}

            <button
              onClick={() => setShowFlip(!showFlip)}
              className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RotateCw className="h-4 w-4" />
              坐标翻转 / 旋转
            </button>
            {showFlip && (
              <div className="space-y-1 rounded-lg border border-gray-100 bg-gray-50 p-2">
                {([
                  { t: "horizontal", label: "水平翻转", icon: FlipHorizontal },
                  { t: "vertical", label: "垂直翻转", icon: FlipVertical },
                  { t: "rotation_90", label: "顺转 90°" },
                  { t: "rotation_180", label: "旋转 180°" },
                  { t: "rotation_270", label: "逆转 90°" },
                ] as { t: FlipType; label: string; icon?: ComponentType<{ className?: string }> }[]).map(({ t, label, icon: Icon }) => (
                  <button
                    key={t}
                    onClick={() => t && applyFlip(t, "训练员操作")}
                    className={cn(
                      "flex w-full items-center gap-2 rounded border px-3 py-1.5 text-xs transition",
                      record.flipType === t
                        ? "border-orange-300 bg-orange-50 text-orange-700"
                        : "border-transparent text-gray-600 hover:bg-white"
                    )}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {label}
                  </button>
                ))}
              </div>
            )}

            {record.isFlipped && explanation && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <div className="mb-1 text-xs font-semibold text-orange-700">
                  ⚠️ {explanation.title}
                </div>
                <div className="mb-2 text-xs leading-relaxed text-orange-800">
                  {explanation.detail}
                </div>
                <button
                  onClick={handleCopyFlipExplanation}
                  className="flex w-full items-center justify-center gap-1 rounded border border-orange-300 bg-white px-2 py-1 text-xs text-orange-700 hover:bg-orange-100"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "已复制" : "复制普通话解释"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-3">
          <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            筛选
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            筛选标注
            {(filter.types.length > 0 ||
              filter.colors.length > 0 ||
              filter.labels.length > 0) && (
              <span className="ml-auto rounded-full bg-blue-500 px-1.5 text-xs text-white">
                {filter.types.length + filter.colors.length + filter.labels.length}
              </span>
            )}
          </button>
          {showFilter && (
            <div className="mt-2 space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div>
                <div className="mb-1 text-xs text-gray-500">按类型</div>
                <div className="flex flex-wrap gap-1">
                  {(["rectangle", "circle", "polygon", "freehand"] as AnnotationType[]).map(
                    (t) => (
                      <button
                        key={t}
                        onClick={() => toggleTypeFilter(t)}
                        className={cn(
                          "rounded border px-2 py-0.5 text-xs transition",
                          filter.types.includes(t)
                            ? "border-blue-400 bg-blue-50 text-blue-600"
                            : "border-gray-200 text-gray-500"
                        )}
                      >
                        {{ rectangle: "矩形", circle: "圆形", polygon: "多边形", freehand: "手绘" }[t]}
                      </button>
                    )
                  )}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-gray-500">按颜色</div>
                <div className="flex flex-wrap gap-1.5">
                  {ANNOTATION_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleColorFilter(c)}
                      className={cn(
                        "h-5 w-5 rounded-full border-2 transition",
                        filter.colors.includes(c)
                          ? "border-gray-800 scale-110"
                          : "border-white shadow"
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-gray-500">按标签</div>
                <div className="flex flex-wrap gap-1">
                  {ANNOTATION_LABELS.map((l) => (
                    <button
                      key={l}
                      onClick={() => toggleLabelFilter(l)}
                      className={cn(
                        "rounded border px-2 py-0.5 text-xs transition",
                        filter.labels.includes(l)
                          ? "border-blue-400 bg-blue-50 text-blue-600"
                          : "border-gray-200 text-gray-500"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-gray-100 p-3">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
            撤销
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Redo2 className="h-4 w-4" />
            重做
          </button>
        </div>

        <button
          onClick={() => {
            if (confirm("确定删除全部标注？此操作可撤销。")) deleteAllAnnotations();
          }}
          disabled={record.annotations.length === 0}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs text-red-600 hover:bg-red-100 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
          清空所有标注
        </button>

        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={handleImportClick}
            className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            导入
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            导出JSON
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={handleExportTXT}
            className="flex items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 text-xs text-blue-700 hover:bg-blue-100"
          >
            <FileText className="h-4 w-4" />
            文本报告
          </button>
          <button
            onClick={onRequestReport}
            className="flex items-center justify-center gap-1 rounded-lg border border-blue-500 bg-blue-500 px-2 py-2 text-xs text-white hover:bg-blue-600"
          >
            <FileText className="h-4 w-4" />
            HTML报告
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
