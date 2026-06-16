import {
  ChevronUp,
  ChevronDown,
  Clock,
  FileText,
  Copy,
  AlertTriangle,
  Database,
  Sparkles,
  TrendingUp,
  GitCommit,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { ChangeTypeTag } from "./tags";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const iconMap = {
  add: <Sparkles className="w-3.5 h-3.5 text-teal-600" />,
  duplicate: <Copy className="w-3.5 h-3.5 text-zinc-500" />,
  intersection_error: (
    <AlertTriangle className="w-3.5 h-3.5 text-warning-600" />
  ),
  bad_data: <Database className="w-3.5 h-3.5 text-databad-600" />,
  update: <TrendingUp className="w-3.5 h-3.5 text-government-600" />,
};

export default function AnomalyQueue() {
  const {
    expandedQueue,
    toggleQueue,
    setQueueExpanded,
    batches,
    changeLogs,
    selectRecord,
  } = useAppStore();

  const logsByBatch = batches
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((b) => ({
      batch: b,
      logs: changeLogs
        .filter((c) => c.batch_id === b.id)
        .sort((a, b) => (a.created_at < b.created_at ? -1 : 1)),
    }))
    .filter((g) => g.logs.length > 0);

  const totalChanges = changeLogs.length;

  if (!expandedQueue) {
    return (
      <div className="bg-white border-t border-zinc-200">
        <button
          onClick={toggleQueue}
          className="w-full px-4 py-2 flex items-center justify-between hover:bg-zinc-50 transition group"
        >
          <div className="flex items-center gap-3">
            <GitCommit className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-700">
              异常队列 · 变化追踪时间线
            </span>
            {totalChanges > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-government-100 text-government-700 text-[10px] font-bold">
                {totalChanges} 条变化
              </span>
            )}
            <span className="text-[10px] text-zinc-400">
              · 按批次分组 · 说清每次导入带来的变化
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-government-600 font-medium group-hover:text-government-700">
            展开查看详情
            <ChevronUp className="w-4 h-4" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-zinc-300 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] flex flex-col"
         style={{ maxHeight: "38vh" }}>
      <div className="px-4 py-2 border-b border-zinc-200 flex items-center justify-between bg-gradient-to-r from-zinc-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-government-500 to-government-700 flex items-center justify-center shadow-sm">
            <GitCommit className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-800">
              异常队列 · 按批次变化追踪
            </p>
            <p className="text-[10px] text-zinc-500">
              复盘前的真实节奏：①导入旧材料 → ②补正常记录 → ③看异常队列变化说明
            </p>
          </div>
          <div className="ml-4 flex items-center gap-2">
            {[
              {
                k: "add",
                label: "新增",
                cls: "bg-teal-50 text-teal-700 border-teal-200",
              },
              {
                k: "duplicate",
                label: "重复",
                cls: "bg-zinc-50 text-zinc-700 border-zinc-300",
              },
              {
                k: "intersection_error",
                label: "合错",
                cls: "bg-warning-50 text-warning-700 border-warning-200",
              },
              {
                k: "bad_data",
                label: "坏数据",
                cls: "bg-databad-50 text-databad-700 border-databad-200",
              },
            ].map((t) => (
              <span
                key={t.k}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border ${t.cls}`}
              >
                {t.label} {changeLogs.filter(l => l.change_type === t.k).length}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => setQueueExpanded(false)}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 px-2 py-1 rounded transition"
        >
          收起
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {logsByBatch.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center py-8">
            <div>
              <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
              <p className="text-xs font-medium text-zinc-500">
                暂无变化记录
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                点击左侧面板 ① 导入巡检照片旧材料 开始追踪
              </p>
            </div>
          </div>
        ) : (
          <div className="relative pl-5 space-y-6">
            <div className="absolute left-1.5 top-1 bottom-1 w-px bg-gradient-to-b from-government-300 via-warning-200 to-databad-200" />
            {logsByBatch.map(({ batch, logs }, bi) => (
              <div key={batch.id} className="relative">
                <div className="absolute -left-[26px] top-1 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center shadow-sm"
                     style={{
                       borderColor:
                         batch.type === "manual"
                           ? "#0d9488"
                           : "#1d4ed8",
                     }}>
                  <FileText
                    className="w-2 h-2"
                    style={{
                      color:
                        batch.type === "manual"
                          ? "#0d9488"
                          : "#1d4ed8",
                    }}
                  />
                </div>
                <div className="mb-2 flex items-center gap-2 flex-wrap">
                  <div
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm ${
                      batch.type === "manual"
                        ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white"
                        : "bg-gradient-to-r from-government-600 to-government-700 text-white"
                    }`}
                  >
                    批次{batches.length - bi}: {batch.name}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {formatDate(batch.created_at)}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                      提交{batch.record_count}条
                    </span>
                    {batch.duplicate_count > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                        重复{batch.duplicate_count}条
                      </span>
                    )}
                    {batch.intersection_error_count > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-warning-100 text-warning-700">
                        合错{batch.intersection_error_count}组
                      </span>
                    )}
                    {batch.bad_data_count > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-databad-100 text-databad-700">
                        坏数据{batch.bad_data_count}项
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {logs.map((log, li) => (
                    <div
                      key={log.id}
                      onClick={() => selectRecord(log.record_id)}
                      className={`group flex items-start gap-2 px-3 py-2 rounded-lg bg-white border border-zinc-100 hover:shadow-sm hover:border-government-200 cursor-pointer transition ${
                        log.change_type === "duplicate"
                          ? "opacity-75"
                          : ""
                      }`}
                      style={{ marginLeft: `${li * 6}px` }}
                    >
                      <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded bg-zinc-50 border border-zinc-100 flex items-center justify-center group-hover:bg-government-50 group-hover:border-government-200">
                        {iconMap[log.change_type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <ChangeTypeTag type={log.change_type} />
                          <span className="text-[10px] text-zinc-400 font-mono">
                            #{log.record_id.slice(-8)}
                          </span>
                          <span className="text-[10px] text-zinc-400 ml-auto">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-700 leading-relaxed line-clamp-2 group-hover:text-zinc-900">
                          {log.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
