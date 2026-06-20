import { useQueueStore } from "@/store/queueStore"
import { formatCost, formatDuration } from "@/utils/export"
import { Badge } from "@/components/Badge"
import { X, ShieldAlert, CheckCircle2, RotateCcw, Trash2 } from "lucide-react"

export function DetailDrawer() {
  const detailId = useQueueStore(s => s.detailId)
  const records = useQueueStore(s => s.records)
  const setDetailId = useQueueStore(s => s.setDetailId)
  const confirmRecord = useQueueStore(s => s.confirmRecord)
  const withdrawRecord = useQueueStore(s => s.withdrawRecord)
  const toggleContamination = useQueueStore(s => s.toggleContamination)
  const deleteRecord = useQueueStore(s => s.deleteRecord)

  const record = records.find(r => r.id === detailId)

  if (!record) return null

  const statusLabel = {
    pending: "待复核",
    confirmed: "已处理",
    withdrawn: "已撤回",
  }[record.status]

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        onClick={() => setDetailId(null)}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-100 truncate">{record.taskName}</h3>
          <button
            onClick={() => setDetailId(null)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <InfoItem label="任务ID" value={record.taskId} mono />
            <InfoItem label="类型" value={record.type === "failure" ? "失败" : "正常"} />
            <InfoItem label="状态" value={statusLabel} />
            <InfoItem label="模型" value={record.model} />
            <InfoItem label="数据集" value={record.dataset} />
            <InfoItem label="GPU成本" value={formatCost(record.gpuCost)} />
            <InfoItem label="耗时" value={formatDuration(record.duration)} />
            <InfoItem label="污染标记" value={record.isContaminated ? "已标记" : "无"} />
          </div>

          {record.isContaminated && (
            <div className="bg-rose-950/30 border border-rose-800/40 rounded-lg p-3 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <div className="text-xs text-rose-300">
                此记录已被标记为验证集污染，可能影响训练结论的可靠性。排班评审时应重点关注此样本对指标的偏移影响。
              </div>
            </div>
          )}

          {record.failureLog && (
            <div>
              <h4 className="text-xs font-medium text-zinc-400 mb-2">失败日志</h4>
              <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-amber-300/90 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
                {record.failureLog}
              </pre>
            </div>
          )}

          {record.statusHistory.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-zinc-400 mb-2">状态变更记录</h4>
              <div className="space-y-2">
                {record.statusHistory.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500 font-mono">{new Date(h.timestamp).toLocaleString("zh-CN")}</span>
                    <span className="text-zinc-600">→</span>
                    <Badge variant="sky">{statusLabel}</Badge>
                    {h.note && <span className="text-zinc-400 ml-1">{h.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-medium text-zinc-400 mb-1">时间信息</h4>
            <div className="text-xs text-zinc-500 space-y-1">
              <div>创建: {new Date(record.createdAt).toLocaleString("zh-CN")}</div>
              <div>更新: {new Date(record.updatedAt).toLocaleString("zh-CN")}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 px-5 py-4 flex items-center gap-2">
          <button
            onClick={() => toggleContamination(record.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              record.isContaminated
                ? "bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 border border-rose-800/50"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            {record.isContaminated ? "取消污染" : "标记污染"}
          </button>
          {(record.status === "pending" || record.status === "withdrawn") ? (
            <button
              onClick={() => confirmRecord(record.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 border border-emerald-800/50 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              确认
            </button>
          ) : (
            <button
              onClick={() => withdrawRecord(record.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-amber-950/40 text-amber-400 hover:bg-amber-900/40 border border-amber-800/50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              撤回
            </button>
          )}
          <button
            onClick={() => { deleteRecord(record.id) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 border border-zinc-700 transition-colors ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        </div>
      </div>
    </>
  )
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-sm text-zinc-200 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  )
}
