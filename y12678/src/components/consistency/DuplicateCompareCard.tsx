import { ArrowRightLeft, Check, X, AlertTriangle, Copy, FileText } from "lucide-react";
import type { DataConflict, MeasurementRecord } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import CoordBadge from "@/components/record/CoordBadge";
import { cn } from "@/lib/utils";

interface Props {
  conflict: DataConflict;
  onResolve: (id: string) => void;
  index: number;
}

const typeConfig = {
  duplicate: { label: "重复导入", cls: "bg-coral-100 text-coral-700", icon: Copy },
  "supplement-conflict": { label: "补录冲突", cls: "bg-lavender-100 text-lavender-700", icon: FileText },
  "coordinate-mismatch": { label: "坐标系混用", cls: "bg-amber-100 text-amber-700", icon: AlertTriangle },
};

export default function DuplicateCompareCard({ conflict, onResolve, index }: Props) {
  const { measurementRecords } = useAppStore();
  const recA = measurementRecords.find((r) => r.id === conflict.recordIdA) as MeasurementRecord;
  const recB = measurementRecords.find((r) => r.id === conflict.recordIdB) as MeasurementRecord;
  const sameRecord = conflict.recordIdA === conflict.recordIdB;
  const cfg = typeConfig[conflict.conflictType];
  const TypeIcon = cfg.icon;

  if (!recA) return null;

  return (
    <div
      className="eng-card p-5 opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("badge", cfg.cls)}>
            <TypeIcon className="h-3 w-3" />
            {cfg.label}
          </span>
          <span
            className={cn(
              "badge",
              conflict.status === "resolved"
                ? "bg-seaweed-100 text-seaweed-700"
                : "bg-coral-100 text-coral-700"
            )}
          >
            {conflict.status === "resolved" ? "已裁决" : "待处理"}
          </span>
          <span className="text-[11px] text-gray-400 font-mono-num">
            相似度 {conflict.similarity}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="rounded border border-ocean-100 bg-ocean-50/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-song text-xs font-semibold text-ocean-700">
              {sameRecord ? "原始数据" : "记录 A"}
            </span>
            <span className="rounded bg-ocean-100 px-1.5 py-0.5 font-mono-num text-[10px] text-ocean-600">
              行{recA.originalRowNumber}
            </span>
          </div>
          <p className="font-mono-num text-sm font-semibold text-ocean-800">{recA.cageId}</p>
          <p className="font-mono-num text-[11px] text-gray-500">{recA.imageName}</p>
          <div className="mt-2 flex items-center gap-2">
            <CoordBadge system={recA.coordinateSystem} />
          </div>
          <div className="mt-2 space-y-0.5">
            {conflict.diffFields.map((f) => (
              <div key={f} className="flex items-center gap-1 text-[10px]">
                <span className="w-14 text-gray-400">{f}</span>
                <span className="font-mono-num text-coral-600 font-semibold">
                  {String((recA as any)[f] ?? "-")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex md:flex-col items-center justify-center gap-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ocean-100 text-ocean-500">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-mono-num text-ocean-500">
            {conflict.diffFields.length} 处差异
          </span>
        </div>

        <div
          className={cn(
            "rounded border p-3",
            sameRecord
              ? "border-lavender-200 bg-lavender-50/40"
              : "border-ocean-100 bg-ocean-50/40"
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-song text-xs font-semibold text-ocean-700">
              {sameRecord ? "补录数据" : "记录 B"}
            </span>
            {recB && (
              <span className="rounded bg-ocean-100 px-1.5 py-0.5 font-mono-num text-[10px] text-ocean-600">
                行{recB.originalRowNumber}
              </span>
            )}
          </div>
          {recB && !sameRecord ? (
            <>
              <p className="font-mono-num text-sm font-semibold text-ocean-800">{recB.cageId}</p>
              <p className="font-mono-num text-[11px] text-gray-500">{recB.imageName}</p>
              <div className="mt-2 flex items-center gap-2">
                <CoordBadge system={recB.coordinateSystem} />
              </div>
              <div className="mt-2 space-y-0.5">
                {conflict.diffFields.map((f) => (
                  <div key={f} className="flex items-center gap-1 text-[10px]">
                    <span className="w-14 text-gray-400">{f}</span>
                    <span className="font-mono-num text-seaweed-600 font-semibold">
                      {String((recB as any)[f] ?? "-")}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-lavender-700">
              该记录已被补录，新值已覆盖显示在测量记录表格中
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        {conflict.status === "pending" && (
          <>
            <button
              onClick={() => onResolve(conflict.id)}
              className="btn-secondary text-xs"
            >
              <X className="h-3.5 w-3.5" />
              标记为不同记录
            </button>
            <button
              onClick={() => onResolve(conflict.id)}
              className="btn-primary text-xs"
            >
              <Check className="h-3.5 w-3.5" />
              确认合并 / 裁决
            </button>
          </>
        )}
        {conflict.status === "resolved" && (
          <span className="flex items-center gap-1 text-xs text-seaweed-600">
            <Check className="h-4 w-4" />
            已处理
          </span>
        )}
      </div>
    </div>
  );
}
