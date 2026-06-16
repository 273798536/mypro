import { useMemo } from "react";
import {
  MapPin,
  User,
  Clock,
  Camera,
  AlertTriangle,
  Database,
  Copy,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import {
  RecordStatusTag,
  IntersectionErrorTag,
  BadDataTag,
} from "./tags";

export default function RecordList() {
  const {
    getFilteredRecords,
    selectedRecordId,
    selectRecord,
    badDataFlags,
    duplicateLinks,
    lastFlashRecordId,
  } = useAppStore();

  const records = useMemo(() => getFilteredRecords(), [getFilteredRecords]);

  const getBad = (id: string) => badDataFlags.filter((f) => f.record_id === id);
  const getDup = (id: string) =>
    duplicateLinks.find((d) => d.new_record_id === id);

  if (records.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-government-100 to-zinc-100 flex items-center justify-center">
            <Camera className="w-9 h-9 text-government-400" />
          </div>
          <p className="text-sm font-bold text-zinc-700 mb-1">
            暂无可展示的记录
          </p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            请在左侧面板执行 ① 导入巡检照片旧材料，或使用 ② 手动补录一条正常记录，开启复盘演示流程。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-zinc-100">
        {records.map((r, i) => {
          const bad = getBad(r.id);
          const dup = getDup(r.id);
          const selected = r.id === selectedRecordId;
          const flash = r.id === lastFlashRecordId;
          return (
            <div
              key={r.id}
              onClick={() => selectRecord(r.id)}
              className={`px-4 py-3 cursor-pointer transition-all group relative ${
                selected
                  ? "bg-government-50/70"
                  : i % 2
                  ? "bg-white"
                  : "bg-zinc-50/40"
              } ${
                r.is_intersection_error
                  ? "border-l-4 border-l-warning-400 border-y border-y-dashed border-y-warning-200 bg-warning-50/30"
                  : selected
                  ? "border-l-4 border-l-government-500"
                  : "border-l-4 border-l-transparent"
              } ${flash ? "animate-flash" : ""} hover:bg-government-50/40`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h4 className="text-sm font-bold text-zinc-800 truncate flex-1 min-w-0">
                      {r.title}
                    </h4>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <RecordStatusTag status={r.status} />
                      {r.is_intersection_error && <IntersectionErrorTag small />}
                      {bad.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-databad-200 bg-databad-50 text-databad-700 text-[10px] font-medium">
                          <Database className="w-2.5 h-2.5" />
                          {bad.length}项坏数据
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-600 line-clamp-2 mb-2 leading-relaxed">
                    {r.description || <span className="text-zinc-400 italic">（无描述）</span>}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-government-500" />
                      <span className="truncate max-w-[180px]">
                        {r.location_name || "-"}
                      </span>
                    </span>
                    {r.intersection && (
                      <span className="inline-flex items-center gap-1 max-w-[160px] truncate">
                        <AlertTriangle className="w-3 h-3 text-warning-500 flex-shrink-0" />
                        {r.intersection}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3 text-teal-500" />
                      {r.reporter || "匿名"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {r.report_time?.slice(0, 16) || "-"}
                    </span>
                  </div>

                  {(dup || bad.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {dup && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px]">
                          <Copy className="w-2.5 h-2.5" />
                          与指纹{dup.original_record_id.slice(-6)}重复
                        </span>
                      )}
                      {bad.slice(0, 3).map((b) => (
                        <BadDataTag key={b.id} type={b.issue_type} />
                      ))}
                      {bad.length > 3 && (
                        <span className="text-[10px] text-zinc-500">
                          +{bad.length - 3}项
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight
                  className={`w-4 h-4 flex-shrink-0 mt-1 transition-transform ${
                    selected
                      ? "text-government-600 translate-x-0"
                      : "text-zinc-300 -translate-x-1 group-hover:translate-x-0 group-hover:text-zinc-500"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
