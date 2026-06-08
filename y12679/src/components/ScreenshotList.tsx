import { Camera, Trash2, Edit3, Check, X, AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import { useState, useRef } from 'react'
import { useGameStore } from '@/store/gameStore'

interface ScreenshotListProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

const ScreenshotList = ({ canvasRef }: ScreenshotListProps) => {
  const { gameState, addScreenshot, removeScreenshot, updateScreenshotDescription } = useGameStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleCapture = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const imageData = canvas.toDataURL('image/png')
    addScreenshot(imageData, newDesc || `截图 #${gameState.screenshots.length + 1}`)
    setNewDesc('')
  }

  const startEdit = (id: string, currentDesc: string) => {
    setEditingId(id)
    setEditValue(currentDesc)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const saveEdit = (id: string) => {
    updateScreenshotDescription(id, editValue)
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          截图清单 ({gameState.screenshots.length})
        </h3>
      </div>

      <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="输入截图备注（可选）..."
            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
          />
          <button
            onClick={handleCapture}
            disabled={!canvasRef.current || gameState.status === 'idle'}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
          >
            <Camera size={16} />
            补录截图
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          <Plus size={12} className="inline mr-1" />
          截图补录后，碰撞检测结果会自动更新。所有截图将作为证据纳入最终报告。
        </p>
      </div>

      {gameState.screenshots.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Camera size={36} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">暂无截图记录</p>
          <p className="text-xs mt-1">游戏运行后可点击"补录截图"保存关键节点</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {gameState.screenshots.map((s, idx) => (
            <div
              key={s.id}
              className={`rounded-lg border overflow-hidden transition-all ${
                s.hasViolation
                  ? 'border-rose-300 bg-rose-50/30'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex gap-3 p-3">
                <div className="relative flex-shrink-0">
                  <img
                    src={s.imageData}
                    alt={s.description}
                    className="w-24 h-18 object-cover rounded border border-slate-200"
                  />
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingId === s.id ? (
                        <div className="flex gap-1">
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-cyan-400 rounded focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                          <button
                            onClick={() => saveEdit(s.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-slate-800 truncate">
                          {s.description}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(s.timestamp).toLocaleTimeString('zh-CN')}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(s.id, s.description)}
                        className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
                        title="编辑备注"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => removeScreenshot(s.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="删除截图"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    {s.hasViolation ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                        <AlertTriangle size={10} />
                        检测到越界
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={10} />
                        状态正常
                      </span>
                    )}
                    {s.detectedViolations.length > 0 && (
                      <span className="text-xs text-slate-500">
                        {s.detectedViolations.length} 项标注
                      </span>
                    )}
                  </div>

                  {s.detectedViolations.length > 0 && (
                    <div className="mt-1.5 text-xs text-rose-600 space-y-0.5">
                      {s.detectedViolations.slice(0, 2).map((v, i) => (
                        <div key={i} className="truncate">• {v}</div>
                      ))}
                      {s.detectedViolations.length > 2 && (
                        <div>...还有 {s.detectedViolations.length - 2} 项</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ScreenshotList
