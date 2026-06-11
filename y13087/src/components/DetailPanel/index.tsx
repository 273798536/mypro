import { useState } from 'react'
import { X, MapPin, Lightbulb, Send, AlertTriangle } from 'lucide-react'
import { useReviewStore } from '@/store/useReviewStore'
import { STATUS_LABELS, STATUS_COLORS } from '@/types'
import type { LightPointStatus } from '@/types'
import { cn } from '@/lib/utils'

export function DetailPanel() {
  const selectedLightPoint = useReviewStore((s) => s.getSelectedLightPoint())
  const selectLightPoint = useReviewStore((s) => s.selectLightPoint)
  const getCommentsByLightPoint = useReviewStore((s) => s.getCommentsByLightPoint)
  const updateLightPointStatus = useReviewStore((s) => s.updateLightPointStatus)
  const addComment = useReviewStore((s) => s.addComment)
  const getAdjacentPairsByPoint = useReviewStore((s) => s.getAdjacentPairsByPoint)
  const lightPoints = useReviewStore((s) => s.lightPoints)
  const [newComment, setNewComment] = useState('')

  if (!selectedLightPoint) {
    return (
      <div className="w-80 p-6 flex flex-col items-center justify-center text-slate-500">
        <Lightbulb size={48} className="mb-4 opacity-30" />
        <p className="text-sm">点击3D场景中的灯光点位</p>
        <p className="text-xs mt-1">查看详细信息与评审批注</p>
      </div>
    )
  }

  const comments = getCommentsByLightPoint(selectedLightPoint.id)
  const adjacentPairs = getAdjacentPairsByPoint(selectedLightPoint.id)
  const statusColor = STATUS_COLORS[selectedLightPoint.status]

  const handleStatusChange = (status: LightPointStatus) => {
    updateLightPointStatus(selectedLightPoint.id, status)
  }

  const handleSubmitComment = () => {
    if (!newComment.trim()) return
    addComment(selectedLightPoint.id, newComment.trim(), '当前用户')
    setNewComment('')
  }

  const getPointName = (id: string) => {
    return lightPoints.find((lp) => lp.id === id)?.name || id
  }

  return (
    <div className="w-80 flex flex-col h-full bg-slate-900/90 backdrop-blur-md border-l border-white/10">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-white font-semibold">点位明细</h3>
        <button
          onClick={() => selectLightPoint(null)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: statusColor, boxShadow: `0 0 10px ${statusColor}` }}
              />
              <span className="text-white font-medium">{selectedLightPoint.name}</span>
            </div>
            <div className="text-xs text-slate-500">ID: {selectedLightPoint.id}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">状态</div>
              <div className="text-sm font-medium" style={{ color: statusColor }}>
                {STATUS_LABELS[selectedLightPoint.status]}
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">光束角</div>
              <div className="text-sm font-medium text-white">
                {selectedLightPoint.beamAngle}°
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">强度</div>
              <div className="text-sm font-medium text-white">
                {selectedLightPoint.intensity} lm
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">点位组</div>
              <div className="text-sm font-medium text-white">
                {selectedLightPoint.groupId}
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <MapPin size={14} />
              <span>空间坐标</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-red-400 font-mono text-sm">
                  {selectedLightPoint.position.x.toFixed(2)}
                </div>
                <div className="text-xs text-slate-600">X</div>
              </div>
              <div>
                <div className="text-green-400 font-mono text-sm">
                  {selectedLightPoint.position.y.toFixed(2)}
                </div>
                <div className="text-xs text-slate-600">Y</div>
              </div>
              <div>
                <div className="text-blue-400 font-mono text-sm">
                  {selectedLightPoint.position.z.toFixed(2)}
                </div>
                <div className="text-xs text-slate-600">Z</div>
              </div>
            </div>
          </div>

          {adjacentPairs.length > 0 && (
            <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-2">
                <AlertTriangle size={16} />
                <span>相邻点位异常</span>
              </div>
              {adjacentPairs.map((ap) => (
                <div key={ap.id} className="text-xs text-slate-400 space-y-1">
                  <div className="text-red-300">
                    {getPointName(ap.pointAId)} ↔ {getPointName(ap.pointBId)}
                  </div>
                  <div>{ap.description}</div>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="text-sm text-slate-400 mb-2">状态流转</div>
            <div className="flex gap-2">
              {(['normal', 'pending_material', 'manual_review'] as LightPointStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                      selectedLightPoint.status === status
                        ? 'text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    )}
                    style={{
                      backgroundColor:
                        selectedLightPoint.status === status
                          ? STATUS_COLORS[status]
                          : undefined,
                    }}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-white/10">
          <div className="text-sm text-slate-400 mb-3">评审批注</div>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-4">暂无批注</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white">{comment.reviewer}</span>
                    <span className="text-xs text-slate-500">{comment.createdAt}</span>
                  </div>
                  <p className="text-sm text-slate-300">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="添加批注..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
          />
          <button
            onClick={handleSubmitComment}
            className="p-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg text-white transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
