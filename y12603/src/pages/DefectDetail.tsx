import { useEffect, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { useWorkshopStore } from "@/store/useWorkshopStore"
import { useDefectStore } from "@/store/useDefectStore"
import StatusBadge from "@/components/StatusBadge"
import MiniMap from "@/components/MiniMap"
import OpinionTimeline from "@/components/OpinionTimeline"

const STATUS_LABELS: Record<string, string> = {
  pending: "待确认",
  approved: "已通过",
  rejected: "已驳回",
  resolved: "已处理",
}

export default function DefectDetail() {
  const { workshopId, defectId } = useParams<{ workshopId: string; defectId: string }>()
  const navigate = useNavigate()
  const { currentWorkshop, fetchWorkshop } = useWorkshopStore()
  const {
    currentDefect, defects, loading,
    fetchDefect, fetchDefects, transitionStatus, addOpinion,
  } = useDefectStore()

  useEffect(() => {
    if (!workshopId) return
    fetchWorkshop(workshopId)
    if (defectId) fetchDefect(workshopId, defectId)
    fetchDefects(workshopId)
  }, [workshopId, defectId])

  const nearbyDefects = useMemo(() => {
    if (!currentDefect || !defects.length) return []
    return defects.filter((d) => {
      if (d.id === currentDefect.id || d.type !== currentDefect.type) return false
      const dx = d.posX - currentDefect.posX
      const dy = d.posY - currentDefect.posY
      return Math.sqrt(dx * dx + dy * dy) < 50
    })
  }, [currentDefect, defects])

  const handleTransition = async (toStatus: string) => {
    if (!workshopId || !defectId) return
    await transitionStatus(workshopId, defectId, toStatus, "current_user")
    fetchDefect(workshopId, defectId)
  }

  const handleAddOpinion = async (content: string, author: string) => {
    if (!workshopId || !defectId) return
    await addOpinion(workshopId, defectId, content, author)
  }

  if (loading || !currentDefect) {
    return <div className="py-12 text-center text-gray-400">加载中...</div>
  }

  const d = currentDefect
  const sourceInfo = d.source === "manual"
    ? "手动圈选"
    : `导入 · 批次 ${d.importBatchId?.slice(0, 6) ?? ""}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/defects/${workshopId}`)}
            className="text-gray-400 transition-colors hover:text-iron"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-sm text-gray-500">工作区</span>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-sm text-gray-500">{currentWorkshop?.name ?? workshopId}</span>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-800">{d.id.slice(0, 6)}</span>
        </div>
        <StatusBadge status={d.status} size="lg" />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-4" style={{ width: "70%" }}>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">基本信息</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoItem label="类型" value={d.type} />
              <InfoItem label="来源" value={sourceInfo} />
              <InfoItem label="位置" value={`(${d.posX}, ${d.posY})`} mono />
              <InfoItem label="尺寸" value={`${d.width}×${d.height}`} mono />
              <div className="col-span-2">
                <InfoItem label="描述" value={d.description || "无"} />
              </div>
            </div>
            {(d.isOfflineAsset || d.coordinateOffset) && (
              <div className="mt-3 flex gap-2">
                {d.isOfflineAsset && (
                  <span className="inline-flex items-center gap-1 rounded bg-warn/10 px-2 py-0.5 text-xs text-warn">
                    <AlertTriangle size={12} /> 离线素材缺失
                  </span>
                )}
                {d.coordinateOffset && (
                  <span className="inline-flex items-center gap-1 rounded bg-yellow-50 px-2 py-0.5 text-xs text-yellow-600">
                    <AlertTriangle size={12} /> 坐标偏移
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <OpinionTimeline opinions={d.opinions} onSubmit={handleAddOpinion} />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">状态操作</h3>
            <div className="flex gap-2">
              {d.status === "pending" && (
                <>
                  <button
                    onClick={() => handleTransition("approved")}
                    className="rounded bg-pass px-4 py-2 text-sm text-white transition-colors hover:bg-pass/90"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => handleTransition("rejected")}
                    className="rounded bg-danger px-4 py-2 text-sm text-white transition-colors hover:bg-danger/90"
                  >
                    驳回
                  </button>
                </>
              )}
              {(d.status === "approved" || d.status === "rejected") && (
                <button
                  onClick={() => handleTransition("resolved")}
                  className="rounded bg-muted px-4 py-2 text-sm text-white transition-colors hover:bg-muted/90"
                >
                  标记已处理
                </button>
              )}
              {d.status === "resolved" && (
                <span className="text-sm text-gray-400">该缺陷已处理完成</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4" style={{ width: "30%" }}>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="mb-2 text-xs font-medium text-gray-500">来源信息</h4>
            <div className="space-y-1.5 text-sm">
              <InfoItem label="来源" value={sourceInfo} />
              <InfoItem label="批次" value={d.importBatchId ?? "—"} />
              <InfoItem label="创建" value={new Date(d.createdAt).toLocaleString()} />
            </div>
          </div>

          <MiniMap defects={defects} currentId={d.id} />

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="mb-2 text-xs font-medium text-gray-500">状态变更</h4>
            {d.statusLogs.length === 0 ? (
              <p className="text-xs text-gray-400">无变更记录</p>
            ) : (
              <div className="relative ml-3 border-l-2 border-gray-200 pl-3">
                {d.statusLogs.map((log) => (
                  <div key={log.id} className="relative mb-3 last:mb-0">
                    <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-muted" />
                    <p className="text-xs text-gray-600">
                      {STATUS_LABELS[log.fromStatus] ?? log.fromStatus} → {STATUS_LABELS[log.toStatus] ?? log.toStatus}
                    </p>
                    <p className="text-xs text-gray-400">
                      {log.operator} · {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {nearbyDefects.length > 0 && (
            <div className="rounded-lg border border-warn/30 bg-warn/5 p-4">
              <h4 className="mb-2 flex items-center gap-1 text-xs font-medium text-warn">
                <AlertTriangle size={12} /> 重复检测
              </h4>
              <p className="mb-2 text-xs text-gray-600">
                发现 {nearbyDefects.length} 个附近同类缺陷
              </p>
              <div className="space-y-1">
                {nearbyDefects.map((nd) => (
                  <button
                    key={nd.id}
                    onClick={() => navigate(`/defects/${workshopId}/${nd.id}`)}
                    className="block w-full rounded px-2 py-1 text-left text-xs text-iron transition-colors hover:bg-warn/10"
                  >
                    {nd.id.slice(0, 6)} · ({nd.posX}, {nd.posY})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-gray-400">{label}：</span>
      <span className={`text-gray-700 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  )
}
