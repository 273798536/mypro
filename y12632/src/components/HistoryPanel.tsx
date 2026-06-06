import { useAnnotationStore } from "@/store/useAnnotationStore";
import { ANNOTATION_COLORS, ANNOTATION_LABELS } from "@/types";
import type { Annotation } from "@/types";
import {
  History,
  Clock,
  Edit3,
  Trash2,
  Plus,
  RotateCw,
  Ruler,
  Download,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const typeLabelMap: Record<Annotation["type"], string> = {
  rectangle: "矩形",
  circle: "圆形",
  polygon: "多边形",
  freehand: "手绘",
};

const opIconMap: Record<string, typeof Plus> = {
  add: Plus,
  update: Edit3,
  delete: Trash2,
  flip: RotateCw,
  scale: Ruler,
  import: Download,
};

export function HistoryPanel() {
  const {
    record,
    selectedId,
    setSelectedId,
    updateAnnotation,
    deleteAnnotation,
  } = useAnnotationStore();

  const sortedOps = [...record.operations].reverse();
  const sortedAnns = [...record.annotations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      <div className="panel p-3 flex-shrink-0">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3 px-1 flex items-center gap-1.5">
          <Edit3 className="w-4 h-4" />
          标注列表
          <span className="ml-auto text-xs font-normal text-neutral-400">
            {record.annotations.length} 个
          </span>
        </h3>
        <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
          {sortedAnns.length === 0 ? (
            <div className="text-center py-6 text-neutral-400 text-xs">
              暂无标注，请在画布上绘制
            </div>
          ) : (
            sortedAnns.map((ann, idx) => (
              <div
                key={ann.id}
                className={cn(
                  "group p-2 rounded-lg cursor-pointer transition-all",
                  selectedId === ann.id
                    ? "bg-medical-50 ring-1 ring-medical-200"
                    : "hover:bg-neutral-50"
                )}
                onClick={() => setSelectedId(ann.id)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ann.color }}
                  />
                  <span className="text-xs font-medium text-neutral-700 flex-1 truncate">
                    标注 {record.annotations.length - idx}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAnnotation(ann.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-500 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-1.5 pl-4 flex-wrap">
                  <span className="tag-info text-[10px]">{typeLabelMap[ann.type]}</span>
                  {ann.label && (
                    <span className="tag bg-neutral-100 text-neutral-600 text-[10px]">
                      {ann.label}
                    </span>
                  )}
                  {ann.isSnapped && (
                    <span className="tag-success text-[10px]">已吸附</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedId && (
        <div className="panel p-3 flex-shrink-0 animate-slide-up">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3 px-1 flex items-center gap-1.5">
            <ChevronRight className="w-4 h-4 text-medical-600" />
            标注属性
          </h3>
          {(() => {
            const ann = record.annotations.find((a) => a.id === selectedId);
            if (!ann) return null;
            return (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-500 block mb-1">颜色</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {ANNOTATION_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateAnnotation(ann.id, { color: c })}
                        className={cn(
                          "w-6 h-6 rounded-md transition-all hover:scale-110",
                          ann.color === c
                            ? "ring-2 ring-offset-1 ring-medical-500"
                            : ""
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-neutral-500 block mb-1">标签</label>
                  <div className="flex flex-wrap gap-1">
                    {ANNOTATION_LABELS.map((l) => (
                      <button
                        key={l}
                        onClick={() =>
                          updateAnnotation(ann.id, { label: ann.label === l ? "" : l })
                        }
                        className={cn(
                          "px-2 py-0.5 text-xs rounded-full transition-all",
                          ann.label === l
                            ? "bg-medical-600 text-white"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-neutral-100 space-y-1">
                  <div className="text-xs text-neutral-500 flex justify-between">
                    <span>创建时间</span>
                    <span className="text-neutral-700">
                      {new Date(ann.createdAt).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 flex justify-between">
                    <span>坐标点数</span>
                    <span className="text-neutral-700">{ann.coordinates.length}</span>
                  </div>
                  {ann.isSnapped && (
                    <div className="text-xs text-success-600 flex items-center gap-1">
                      <span>✓ 坐标已吸附到网格</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div className="panel p-3 flex-1 overflow-hidden flex flex-col">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3 px-1 flex items-center gap-1.5 flex-shrink-0">
          <History className="w-4 h-4" />
          操作历史
          <span className="ml-auto text-xs font-normal text-neutral-400">
            {record.operations.length} 条
          </span>
        </h3>
        <div className="space-y-0 overflow-y-auto flex-1 pr-1">
          {sortedOps.length === 0 ? (
            <div className="text-center py-6 text-neutral-400 text-xs">
              暂无操作记录
            </div>
          ) : (
            sortedOps.map((op) => {
              const Icon = opIconMap[op.type] || Edit3;
              return (
                <div
                  key={op.id}
                  className="flex gap-2 py-2 px-1 border-b border-neutral-50 last:border-0"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center mt-0.5">
                    <Icon className="w-3 h-3 text-neutral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-neutral-700 leading-tight">
                      {op.description}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(op.timestamp).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
