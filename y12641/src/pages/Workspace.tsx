import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Undo2,
  RotateCcw,
  Grid3X3,
  Download,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  Info,
  ZoomIn,
} from 'lucide-react'
import { useAnnotationStore } from '../store/annotation'
import { downloadReport } from '../utils/exportReport'
import type { Cargo } from '../types'

const issueColor = (type?: string) => {
  switch (type) {
    case 'missing_unit':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/40'
    case 'duplicate_annotation':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/40'
    case 'wrong_coordinates':
      return 'bg-red-500/15 text-red-300 border-red-500/40'
    case 'supplementary':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/40'
    case 'old_note':
      return 'bg-slate-500/15 text-slate-300 border-slate-500/40'
    default:
      return 'bg-slate-500/15 text-slate-300 border-slate-500/40'
  }
}

const issueLabel = (type?: string) => {
  switch (type) {
    case 'missing_unit':
      return '漏填单位'
    case 'duplicate_annotation':
      return '重复标注'
    case 'wrong_coordinates':
      return '坐标过期'
    case 'supplementary':
      return '口头补录'
    case 'old_note':
      return '旧备注'
    default:
      return '问题'
  }
}

const Workspace = () => {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [toast, setToast] = useState<{ type: 'error' | 'success' | 'info'; msg: string } | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)

  const level = useAnnotationStore((s) => s.currentLevel)
  const placements = useAnnotationStore((s) => s.placements)
  const gridSnap = useAnnotationStore((s) => s.gridSnap)
  const selectedCargoId = useAnnotationStore((s) => s.selectedCargoId)
  const lastCollisionDiff = useAnnotationStore((s) => s.lastCollisionDiff)
  const undoCount = useAnnotationStore((s) => s.undoCount)
  const restartCount = useAnnotationStore((s) => s.restartCount)
  const boundaryFailures = useAnnotationStore((s) => s.boundaryFailures)
  const collisionEvents = useAnnotationStore((s) => s.collisionEvents)

  const selectCargo = useAnnotationStore((s) => s.selectCargo)
  const toggleGridSnap = useAnnotationStore((s) => s.toggleGridSnap)
  const placeCargo = useAnnotationStore((s) => s.placeCargo)
  const undo = useAnnotationStore((s) => s.undo)
  const restart = useAnnotationStore((s) => s.restart)
  const removePlacement = useAnnotationStore((s) => s.removePlacement)
  const generateReport = useAnnotationStore((s) => s.generateReport)
  const resetAll = useAnnotationStore((s) => s.resetAll)

  useEffect(() => {
    if (!level) navigate('/')
  }, [level, navigate])

  const showToast = (type: 'error' | 'success' | 'info', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3200)
  }

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !level) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height, gridSize, forbiddenZones, oldNotes } = level.deckConfig

    ctx.fillStyle = '#0e1a2b'
    ctx.fillRect(0, 0, width, height)

    // Deck hull outline
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.strokeRect(2, 2, width - 4, height - 4)

    // Grid
    if (gridSnap) {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.15)'
      ctx.lineWidth = 1
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }

    // Forbidden zones (boundary traps)
    forbiddenZones.forEach((fz) => {
      ctx.fillStyle = 'rgba(233, 69, 96, 0.18)'
      ctx.fillRect(fz.x, fz.y, fz.width, fz.height)
      ctx.strokeStyle = '#E94560'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(fz.x + 1, fz.y + 1, fz.width - 2, fz.height - 2)
      ctx.setLineDash([])
      ctx.fillStyle = '#E94560'
      ctx.font = '12px sans-serif'
      ctx.fillText('禁放 · ' + fz.name.split('（')[0], fz.x + 8, fz.y + 20)
    })

    // Old notes
    oldNotes.forEach((n) => {
      const colors: Record<string, string> = {
        coordinate_backlog: '#FFB830',
        screenshot_remark: '#16C79A',
        collision_misjudge: '#E94560',
      }
      const c = colors[n.source] ?? '#94a3b8'
      ctx.fillStyle = c + '33'
      ctx.fillRect(n.x - 4, n.y - 4, 260, 44)
      ctx.strokeStyle = c
      ctx.lineWidth = 1.5
      ctx.setLineDash([3, 3])
      ctx.strokeRect(n.x - 4, n.y - 4, 260, 44)
      ctx.setLineDash([])
      ctx.fillStyle = c
      ctx.font = '11px sans-serif'
      ctx.fillText(n.text, n.x, n.y + 14, 250)
    })

    // Last collision diff indicator
    if (lastCollisionDiff?.before && lastCollisionDiff?.after) {
      const b = lastCollisionDiff.before
      ctx.strokeStyle = 'rgba(255, 184, 48, 0.7)'
      ctx.setLineDash([5, 5])
      ctx.lineWidth = 2
      ctx.strokeRect(b.x, b.y, 60, 60)
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255, 184, 48, 0.9)'
      ctx.font = '11px sans-serif'
      ctx.fillText('吸附前位置', b.x, b.y - 4)
    }

    // Placed cargo
    placements.forEach((p) => {
      const cargo = level.cargoList.find((c) => c.id === p.cargoId)
      if (!cargo) return
      const hasIssue = !!cargo.hasIssue
      ctx.fillStyle = hasIssue ? 'rgba(233, 69, 96, 0.55)' : 'rgba(22, 199, 154, 0.55)'
      ctx.fillRect(p.x, p.y, cargo.width, cargo.height)
      ctx.strokeStyle = hasIssue ? '#E94560' : '#16C79A'
      ctx.lineWidth = 2
      ctx.strokeRect(p.x, p.y, cargo.width, cargo.height)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 11px sans-serif'
      const name = cargo.name.length > 10 ? cargo.name.slice(0, 9) + '…' : cargo.name
      ctx.fillText(name, p.x + 4, p.y + cargo.height / 2 + 4)
      if (p.gridSnapped) {
        ctx.fillStyle = '#60a5fa'
        ctx.font = '9px sans-serif'
        ctx.fillText('[吸附]', p.x + cargo.width - 30, p.y + 12)
      }
    })

    // Hover preview
    if (hoverPos && selectedCargoId) {
      const cargo = level.cargoList.find((c) => c.id === selectedCargoId)
      if (cargo) {
        let x = hoverPos.x
        let y = hoverPos.y
        if (gridSnap) {
          x = Math.round(x / gridSize) * gridSize
          y = Math.round(y / gridSize) * gridSize
        }
        ctx.fillStyle = 'rgba(96, 165, 250, 0.35)'
        ctx.fillRect(x, y, cargo.width, cargo.height)
        ctx.strokeStyle = '#60a5fa'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.strokeRect(x, y, cargo.width, cargo.height)
        ctx.setLineDash([])
      }
    }
  }, [level, placements, gridSnap, hoverPos, selectedCargoId, lastCollisionDiff])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  if (!level) return null

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedCargoId || !level) {
      showToast('info', '请先在左侧选择一件货物')
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const result = placeCargo(selectedCargoId, x, y)
    if (result.success) {
      const cargo = level.cargoList.find((c) => c.id === selectedCargoId)
      showToast('success', `已放置「${cargo?.name}」`)
    } else {
      showToast('error', result.message ?? '放置失败')
    }
  }

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !selectedCargoId) {
      setHoverPos(null)
      return
    }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    setHoverPos({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    })
  }

  const handleFinish = () => {
    const report = generateReport()
    if (!report) return
    navigate('/summary')
  }

  const handleExport = () => {
    const report = generateReport()
    if (!report) return
    downloadReport(report)
    showToast('success', '报告已导出')
  }

  const placedCargoIds = new Set(placements.map((p) => p.cargoId))

  return (
    <div className="h-screen flex flex-col bg-deck-surface text-gray-100">
      {/* Top bar */}
      <header className="bg-deck-panel border-b border-slate-700/50 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => { resetAll(); navigate('/') }} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3">
            <ArrowLeft className="w-4 h-4" /> 返回选关
          </button>
          <div>
            <h1 className="font-bold text-sm">{level.name}</h1>
            <p className="text-xs text-slate-400">{level.cargoList.length} 件货物 · {level.expectedIssues.length} 个预期问题</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={undo} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3" title="撤销上一步">
            <Undo2 className="w-4 h-4" /> 撤销 {undoCount > 0 && <span className="badge bg-blue-500/30 text-blue-200">{undoCount}</span>}
          </button>
          <button onClick={restart} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3" title="重开关卡">
            <RotateCcw className="w-4 h-4" /> 重开 {restartCount > 0 && <span className="badge bg-amber-500/30 text-amber-200">{restartCount}</span>}
          </button>
          <button
            onClick={toggleGridSnap}
            className={`flex items-center gap-1.5 text-sm py-1.5 px-3 rounded-lg transition-all border shadow-md ${gridSnap ? 'bg-deck-primary hover:bg-blue-700 text-white border-blue-500/50' : 'bg-deck-panel hover:bg-slate-700 text-white border-slate-600'}`}
          >
            <Grid3X3 className="w-4 h-4" /> {gridSnap ? '网格吸附: 开' : '网格吸附: 关'}
          </button>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3">
            <Download className="w-4 h-4" /> 导出报告
          </button>
          <button onClick={handleFinish} className="btn-success flex items-center gap-1.5 text-sm py-1.5 px-3">
            <FileCheck className="w-4 h-4" /> 完成并查看结算
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: cargo list */}
        <aside className="w-80 bg-deck-panel border-r border-slate-700/50 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-slate-700/50">
            <h2 className="font-semibold text-sm mb-1 flex items-center gap-2">
              <ZoomIn className="w-4 h-4 text-slate-400" /> 货物清单（点击选择后在画布上放置）
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">提示：标红货物带有材料问题，注意边界与碰撞。</p>
          </div>
          <div className="p-3 space-y-2">
            {level.cargoList.map((cargo: Cargo) => {
              const placed = placedCargoIds.has(cargo.id)
              const selected = selectedCargoId === cargo.id
              return (
                <button
                  key={cargo.id}
                  onClick={() => placed ? null : selectCargo(selected ? null : cargo.id)}
                  disabled={placed}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${placed ? 'bg-slate-800/40 border-slate-700/40 opacity-60 cursor-not-allowed' : selected ? 'bg-blue-500/15 border-blue-400/60 shadow-md ring-1 ring-blue-400/40' : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-semibold text-sm ${placed ? 'line-through text-slate-500' : ''}`}>{cargo.name}</span>
                    {placed ? <CheckCircle2 className="w-4 h-4 text-deck-success flex-shrink-0" /> : cargo.hasIssue ? <AlertTriangle className="w-4 h-4 text-deck-warning flex-shrink-0" /> : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    尺寸 {cargo.width}×{cargo.height}px · {cargo.weight ?? '?'} {cargo.unit ?? '(单位缺失)'}
                  </div>
                  {cargo.hasIssue && (
                    <div className="mt-2">
                      <span className={`badge border ${issueColor(cargo.issueType)}`}>{issueLabel(cargo.issueType)}</span>
                      {cargo.notes && <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{cargo.notes}</p>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        {/* Center: canvas */}
        <main className="flex-1 bg-deck-surface flex items-center justify-center p-6 overflow-auto relative">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={level.deckConfig.width}
              height={level.deckConfig.height}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMove}
              onMouseLeave={() => setHoverPos(null)}
              className={`rounded-lg shadow-2xl border border-slate-700 ${selectedCargoId ? 'cursor-crosshair' : 'cursor-default'}`}
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
            <div className="absolute top-2 left-2 text-xs text-slate-400 bg-deck-panel/80 px-2 py-1 rounded border border-slate-700">
              底图尺寸 {level.deckConfig.width} × {level.deckConfig.height} · 网格 {level.deckConfig.gridSize}px
            </div>
          </div>

          {toast && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-xl border text-sm max-w-md ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-200' : toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200' : 'bg-sky-500/20 border-sky-500/50 text-sky-200'}`}>
              <div className="flex items-start gap-2">
                {toast.type === 'error' ? <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <span className="leading-relaxed">{toast.msg}</span>
              </div>
            </div>
          )}
        </main>

        {/* Right: status */}
        <aside className="w-80 bg-deck-panel border-l border-slate-700/50 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-slate-700/50">
            <h2 className="font-semibold text-sm">状态面板</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                <div className="text-2xl font-bold text-deck-success">{placements.length}</div>
                <div className="text-xs text-slate-400 mt-0.5">已放置</div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                <div className="text-2xl font-bold text-deck-accent">{boundaryFailures}</div>
                <div className="text-xs text-slate-400 mt-0.5">边界失败</div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                <div className="text-2xl font-bold text-deck-warning">{collisionEvents}</div>
                <div className="text-xs text-slate-400 mt-0.5">碰撞事件</div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                <div className="text-2xl font-bold text-blue-400">{undoCount}</div>
                <div className="text-xs text-slate-400 mt-0.5">撤销次数</div>
              </div>
            </div>

            {lastCollisionDiff && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <p className="text-xs font-semibold text-amber-300 mb-1">吸附前后对比（最近一次）</p>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  吸附前: ({lastCollisionDiff.before?.x}, {lastCollisionDiff.before?.y})
                  <br />
                  吸附后: ({lastCollisionDiff.after?.x ?? '—'}, {lastCollisionDiff.after?.y ?? '—'})
                </p>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-slate-400 mb-2">已放置货物</h3>
              {placements.length === 0 ? (
                <p className="text-xs text-slate-500 italic">尚未放置任何货物</p>
              ) : (
                <div className="space-y-1.5">
                  {placements.map((p) => {
                    const c = level.cargoList.find((cc) => cc.id === p.cargoId)
                    return (
                      <div key={p.id} className="rounded-lg border border-slate-700 bg-slate-800/40 p-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{c?.name}</p>
                          <p className="text-xs text-slate-400">({p.x}, {p.y}) {p.gridSnapped && '·吸附'}</p>
                        </div>
                        <button onClick={() => removePlacement(p.id)} className="p-1 rounded hover:bg-red-500/20 text-red-300 flex-shrink-0" title="移除">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 mb-2">本轮复核材料</h3>
              <div className="space-y-1.5 text-xs">
                <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-amber-200">
                  <span className="font-semibold">底图坐标：</span>2019版，含旧备注
                </div>
                <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-200">
                  <span className="font-semibold">截图素材：</span>现场安全员手写圈注
                </div>
                <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-red-200">
                  <span className="font-semibold">碰撞边界：</span>上次标注误判 40cm
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Workspace
