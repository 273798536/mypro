import { Eye, AlertTriangle, Clock, FileImage } from "lucide-react";
import type { MeasurementRecord } from "@/types";
import CoordBadge from "./CoordBadge";
import { cn } from "@/lib/utils";

interface Props {
  records: MeasurementRecord[];
  onSelectRecord: (record: MeasurementRecord) => void;
  selectedId: string | null;
  hasCoordMismatch: (r: MeasurementRecord) => boolean;
}

const statusConfig = {
  normal: { label: "正常", cls: "bg-seaweed-50 text-seaweed-700" },
  "out-of-bounds": { label: "越界", cls: "bg-coral-50 text-coral-700" },
  pending: { label: "待确认", cls: "bg-amber-50 text-amber-700" },
};

export default function RecordTable({ records, onSelectRecord, selectedId, hasCoordMismatch }: Props) {
  return (
    <div className="eng-card overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="eng-table">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 w-20 bg-ocean-50 text-center">原始行号</th>
              <th className="w-28">网箱编号</th>
              <th>图片名 / 来源备注</th>
              <th className="w-32">坐标系</th>
              <th className="w-28 text-right">X 坐标</th>
              <th className="w-28 text-right">Y 坐标</th>
              <th className="w-20">状态</th>
              <th className="w-24">操作人</th>
              <th className="w-40">录入时间</th>
              <th className="w-16 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const st = statusConfig[r.status];
              const mismatch = hasCoordMismatch(r);
              const isSelected = selectedId === r.id;

              return (
                <tr
                  key={r.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    r.isSupplemented && "bg-lavender-50/40",
                    isSelected && "bg-ocean-100/60"
                  )}
                  onClick={() => onSelectRecord(r)}
                >
                  <td className="sticky left-0 z-10 text-center bg-inherit">
                    <span className="font-mono-num font-semibold text-ocean-700">{r.originalRowNumber}</span>
                    {r.isSupplemented && (
                      <div className="mt-0.5">
                        <span className="rounded bg-lavender-100 px-1 py-px text-[9px] font-medium text-lavender-700 font-mono-num">
                          补
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="font-mono-num font-semibold text-ocean-800">{r.cageId}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <FileImage className="h-3.5 w-3.5 text-ocean-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-mono-num text-xs text-gray-700 truncate">{r.imageName}</p>
                        <p className="text-[10px] text-gray-400 truncate">{r.sourceNote}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <CoordBadge system={r.coordinateSystem} hasMismatch={mismatch} />
                  </td>
                  <td className="text-right font-mono-num text-gray-700">{r.x}</td>
                  <td className="text-right font-mono-num text-gray-700">{r.y}</td>
                  <td>
                    <span className={cn("badge", st.cls)}>
                      {r.status === "out-of-bounds" && <AlertTriangle className="h-3 w-3" />}
                      {r.status === "pending" && <Clock className="h-3 w-3" />}
                      {st.label}
                    </span>
                  </td>
                  <td className="text-xs text-gray-600">{r.createdBy}</td>
                  <td>
                    <span className="font-mono-num text-xs text-gray-500">{r.createdAt}</span>
                  </td>
                  <td className="text-center">
                    <button
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-ocean-500 transition-colors hover:bg-ocean-100 hover:text-ocean-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRecord(r);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {records.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <FileImage className="mb-2 h-10 w-10 text-ocean-200" />
          <p className="text-sm text-gray-400">暂无测量记录</p>
        </div>
      )}
    </div>
  );
}
