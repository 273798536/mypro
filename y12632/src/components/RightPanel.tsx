import { useState } from "react";
import {
  History,
  Trash2,
  MapPin,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Ruler,
  Layers,
} from "lucide-react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import type { Annotation } from "@/types";
import { cn } from "@/lib/utils";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function RightPanel() {
  const {
    record,
    selectedId,
    setSelectedId,
    deleteAnnotation,
    updateAnnotation,
    getFilteredAnnotations,
  } = useAnnotationStore();

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedOps, setExpandedOps] = useState(true);
  const [expandedAnns, setExpandedAnns] = useState(true);
  const [activeTab, setActiveTab] = useState<"operations" | "annotations">("operations");

  const filtered = getFilteredAnnotations();

  const handleCopyCoords = (ann: Annotation, idx: number) => {
    const text = ann.originalCoords
      .map((p, i) => `点${i + 1}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) px`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="flex h-full w-80 flex-col border-l border-gray-200 bg-white">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("operations")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 border-b-2 px-3 py-2.5 text-sm transition",
            activeTab === "operations"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <History className="h-4 w-4" />
          操作历史
          <span className="rounded-full bg-gray-100 px-1.5 text-xs text-gray-500">
            {record.operations.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("annotations")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 border-b-2 px-3 py-2.5 text-sm transition",
            activeTab === "annotations"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <Layers className="h-4 w-4" />
          标注列表
          <span className="rounded-full bg-gray-100 px-1.5 text-xs text-gray-500">
            {filtered.length}
          </span>
        </button>
      </div>

      {activeTab === "operations" ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <button
            onClick={() => setExpandedOps(!expandedOps)}
            className="flex items-center gap-1 border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            {expandedOps ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            操作时间线（共 {record.operations.length} 条）
          </button>

          <div className="flex-1 overflow-y-auto">
            {record.operations.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                <History className="mx-auto mb-2 h-8 w-8 opacity-40" />
                暂无操作记录
                <div className="mt-1 text-xs">描绘病灶后会自动记录</div>
              </div>
            ) : (
              <ol className="relative border-l border-gray-100 px-3 py-2">
                {[...record.operations].reverse().map((op, revIdx) => {
                  const idx = record.operations.length - 1 - revIdx;
                  const colors: Record<string, string> = {
                    add: "bg-green-500",
                    update: "bg-blue-500",
                    delete: "bg-red-500",
                    flip: "bg-orange-500",
                    scale: "bg-purple-500",
                    import: "bg-gray-500",
                  };
                  return (
                    <li key={op.id} className="mb-3 ml-4">
                      <span
                        className={cn(
                          "absolute -left-1.5 mt-1 flex h-3 w-3 items-center justify-center rounded-full ring-2 ring-white",
                          colors[op.type] || "bg-gray-400"
                        )}
                      />
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <div className="text-xs font-medium text-gray-800">{op.description}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400">
                          <span className="rounded bg-white px-1 py-0.5">
                            {op.type}
                          </span>
                          <span>#{idx + 1}</span>
                          <span>{formatTime(op.timestamp)}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <button
            onClick={() => setExpandedAnns(!expandedAnns)}
            className="flex items-center gap-1 border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            {expandedAnns ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            病灶标注（共 {filtered.length} 处）
          </button>

          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                <MapPin className="mx-auto mb-2 h-8 w-8 opacity-40" />
                暂无标注
                <div className="mt-1 text-xs">在画布上绘制以添加病灶标注</div>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((ann, idx) => (
                  <div
                    key={ann.id}
                    onClick={() => setSelectedId(ann.id)}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3 transition",
                      selectedId === ann.id
                        ? "border-blue-400 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: ann.color }}
                        />
                        <span className="text-sm font-medium text-gray-800">
                          标注 {idx + 1}
                        </span>
                        {ann.label && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                            {ann.label}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("删除该标注？")) deleteAnnotation(ann.id);
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-gray-500">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5">
                        {{ rectangle: "矩形", circle: "圆形", polygon: "多边形", freehand: "手绘" }[ann.type]}
                      </span>
                      {ann.isSnapped && (
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">
                          吸附网格
                        </span>
                      )}
                      <span className="rounded bg-gray-100 px-1.5 py-0.5">
                        {ann.coordinates.length} 点
                      </span>
                    </div>

                    {selectedId === ann.id && (
                      <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                        <div>
                          <div className="mb-1 text-[11px] font-medium text-gray-500">标签</div>
                          <input
                            value={ann.label}
                            onChange={(e) => updateAnnotation(ann.id, { label: e.target.value })}
                            className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs"
                            placeholder="病灶标签"
                          />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-gray-500">
                            <span className="flex items-center gap-1">
                              <Ruler className="h-3 w-3" />
                              底图原始坐标
                            </span>
                            <button
                              onClick={() => handleCopyCoords(ann, idx)}
                              className="flex items-center gap-0.5 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-gray-50"
                            >
                              {copiedIdx === idx ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              {copiedIdx === idx ? "已复制" : "复制"}
                            </button>
                          </div>
                          <div className="max-h-28 overflow-y-auto rounded border border-gray-100 bg-gray-50 p-2 text-[11px] text-gray-600">
                            {ann.originalCoords.map((p, i) => (
                              <div key={i} className="leading-5">
                                点{i + 1}: ({p.x.toFixed(1)}, {p.y.toFixed(1)}) px
                                {record.scale.value > 0 && (
                                  <span className="ml-1 text-gray-400">
                                    ≈ ({(p.x / record.scale.value).toFixed(2)}, {(p.y / record.scale.value).toFixed(2)}) mm
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          创建时间：{formatTime(ann.createdAt)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
