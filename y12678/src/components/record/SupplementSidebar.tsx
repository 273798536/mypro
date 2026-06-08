import { X, History, User, Clock, FileEdit, ArrowRight } from "lucide-react";
import type { MeasurementRecord, SupplementRecord } from "@/types";
import CoordBadge from "./CoordBadge";

interface Props {
  record: MeasurementRecord | null;
  supplements: SupplementRecord[];
  onClose: () => void;
  onJumpToTrace?: (recordId: string) => void;
}

const fieldLabels: Record<string, string> = {
  x: "X 坐标",
  y: "Y 坐标",
  status: "状态",
  imageName: "图片名",
  coordinateSystem: "坐标系",
  sourceNote: "来源备注",
};

const statusLabels: Record<string, string> = {
  normal: "正常",
  "out-of-bounds": "越界",
  pending: "待确认",
};

export default function SupplementSidebar({ record, supplements, onClose, onJumpToTrace }: Props) {
  if (!record) return null;

  return (
    <div className="flex h-full w-96 flex-col border-l border-ocean-200 bg-white/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-ocean-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-lavender-500" />
          <h3 className="font-song text-base font-semibold text-ocean-800">补录记录详情</h3>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded text-ocean-400 transition-colors hover:bg-ocean-50 hover:text-ocean-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="space-y-4 p-4">
          <div className="eng-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-song text-sm font-semibold text-ocean-800">
                    {record.cageId}
                  </span>
                  <span className="rounded bg-ocean-100 px-1.5 py-0.5 font-mono-num text-[10px] text-ocean-600">
                    原始行号 {record.originalRowNumber}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 font-mono-num">{record.imageName}</p>
              </div>
              <CoordBadge system={record.coordinateSystem} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">X 坐标</span>
                <p className="font-mono-num text-ocean-700">{record.x}</p>
              </div>
              <div>
                <span className="text-gray-400">Y 坐标</span>
                <p className="font-mono-num text-ocean-700">{record.y}</p>
              </div>
            </div>

            <div className="mt-3 rounded bg-ocean-50 px-3 py-2">
              <p className="text-[11px] text-ocean-600">
                <span className="font-semibold">来源备注：</span>
                {record.sourceNote}
              </p>
            </div>

            {onJumpToTrace && (
              <button
                onClick={() => onJumpToTrace(record.id)}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded border border-ocean-200 bg-white py-1.5 text-xs font-song text-ocean-600 transition-colors hover:bg-ocean-50"
              >
                <ArrowRight className="h-3 w-3" />
                追溯此记录的处理链路
              </button>
            )}
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 font-song text-sm font-semibold text-ocean-700">
              <FileEdit className="h-4 w-4 text-lavender-500" />
              补录历史（{supplements.length} 次）
            </h4>

            {supplements.length === 0 ? (
              <div className="eng-card p-6 text-center">
                <p className="text-xs text-gray-400">暂无补录记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {supplements.map((supp, idx) => (
                  <div
                    key={supp.id}
                    className="eng-card relative overflow-hidden p-4 animate-fade-in-up"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className="absolute left-0 top-0 h-full w-1 bg-lavender-400" />

                    <div className="mb-3 flex items-center justify-between">
                      <span className="rounded bg-lavender-100 px-2 py-0.5 text-[10px] font-semibold text-lavender-700 font-mono-num">
                        补录 #{supplements.length - idx}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span className="font-mono-num">{supp.operatedAt}</span>
                      </div>
                    </div>

                    <div className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      <span>{supp.operator}</span>
                    </div>

                    <div className="mb-3 rounded bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                      <span className="font-semibold">补录原因：</span>
                      {supp.reason}
                    </div>

                    <div className="space-y-1.5">
                      {Object.entries(supp.diffFields).map(([field, val]) => (
                        <div
                          key={field}
                          className="flex items-center gap-2 rounded bg-gray-50 px-2 py-1.5 text-[11px]"
                        >
                          <span className="w-16 shrink-0 font-medium text-gray-500">
                            {fieldLabels[field] || field}
                          </span>
                          <span className="font-mono-num text-coral-600 line-through">
                            {String(val.old ?? "（空）")}
                          </span>
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                          <span className="font-mono-num text-seaweed-600 font-semibold">
                            {field === "status"
                              ? statusLabels[String(val.new)] || String(val.new)
                              : String(val.new)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
