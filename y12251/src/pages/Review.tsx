import { useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useGameStore, loadSnapshotsFromStorage } from "@/store/gameStore"
import { BUILTIN_RULES } from "@/utils/physics"
import { simulateTrajectory, createParticleFromAngle } from "@/utils/physics"
import { ArrowLeft, GitCompare, RotateCcw } from "lucide-react"
import { useRef } from "react"
import type { ParameterSnapshot, Point, RuleViolation } from "@/types"

const CANVAS_W = 400
const CANVAS_H = 300

function drawMiniCanvas(
  canvas: HTMLCanvasElement,
  snapshot: ParameterSnapshot,
  highlightViolations: RuleViolation[]
) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.fillStyle = "#0a0e1a"
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  const scaleX = CANVAS_W / 700
  const scaleY = CANVAS_H / 520

  ctx.save()
  ctx.scale(scaleX, scaleY)

  snapshot.boards.forEach((board) => {
    ctx.strokeStyle = "rgba(0, 229, 255, 0.15)"
    ctx.lineWidth = 1
    ctx.strokeRect(board.x, board.y, board.width, board.height)
    const spacing = 40
    for (let gx = board.x + spacing / 2; gx < board.x + board.width; gx += spacing) {
      for (let gy = board.y + spacing / 2; gy < board.y + board.height; gy += spacing) {
        ctx.fillStyle = board.direction === "into" ? "rgba(0, 229, 255, 0.15)" : "rgba(0, 229, 255, 0.2)"
        ctx.beginPath()
        ctx.arc(gx, gy, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })

  snapshot.gates.forEach((gate) => {
    ctx.strokeStyle = "rgba(255, 171, 0, 0.5)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(gate.x - gate.width / 2, gate.y - 15)
    ctx.lineTo(gate.x - gate.width / 2, gate.y + 15)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(gate.x + gate.width / 2, gate.y - 15)
    ctx.lineTo(gate.x + gate.width / 2, gate.y + 15)
    ctx.stroke()
  })

  if (snapshot.trajectoryPoints.length > 1) {
    ctx.strokeStyle = "rgba(0, 230, 118, 0.6)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(snapshot.trajectoryPoints[0].x, snapshot.trajectoryPoints[0].y)
    for (let i = 1; i < snapshot.trajectoryPoints.length; i++) {
      ctx.lineTo(snapshot.trajectoryPoints[i].x, snapshot.trajectoryPoints[i].y)
    }
    ctx.stroke()
  }

  ctx.restore()

  const ts = new Date(snapshot.timestamp).toLocaleString("zh-CN")
  ctx.fillStyle = "rgba(0, 229, 255, 0.4)"
  ctx.font = "9px sans-serif"
  ctx.textAlign = "left"
  ctx.fillText(ts, 6, 14)
}

export default function Review() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const snapshots = useGameStore((s) => s.snapshots)
  const violations = useGameStore((s) => s.violations)
  const boards = useGameStore((s) => s.boards)
  const bars = useGameStore((s) => s.bars)
  const currentLevelId = useGameStore((s) => s.currentLevelId)
  const rerunWithSnapshot = useGameStore((s) => s.rerunWithSnapshot)

  const beforeCanvasRef = useRef<HTMLCanvasElement>(null)
  const afterCanvasRef = useRef<HTMLCanvasElement>(null)

  const levelSnapshots = [
    ...snapshots,
    ...loadSnapshotsFromStorage().filter((ss) => !snapshots.find((s) => s.id === ss.id)),
  ].filter((s) => s.levelId === id)

  const beforeSnapshot = levelSnapshots.length >= 2 ? levelSnapshots[levelSnapshots.length - 2] : null
  const afterSnapshot = levelSnapshots.length >= 2 ? levelSnapshots[levelSnapshots.length - 1] : levelSnapshots[0] || null

  useEffect(() => {
    if (beforeSnapshot && beforeCanvasRef.current) {
      drawMiniCanvas(beforeCanvasRef.current, beforeSnapshot, violations)
    }
    if (afterSnapshot && afterCanvasRef.current) {
      drawMiniCanvas(afterCanvasRef.current, afterSnapshot, [])
    }
  }, [beforeSnapshot, afterSnapshot, violations])

  const forceRules = BUILTIN_RULES.filter((r) => r.category === "force_direction")
  const trajRules = BUILTIN_RULES.filter((r) => r.category === "trajectory")
  const energyRules = BUILTIN_RULES.filter((r) => r.category === "energy")

  const violatedRuleIds = new Set(violations.map((v) => v.ruleId))

  const paramDiff = () => {
    if (!beforeSnapshot || !afterSnapshot) return []
    const diffs: { label: string; before: string; after: string }[] = []

    beforeSnapshot.boards.forEach((b, i) => {
      const a = afterSnapshot.boards[i]
      if (a) {
        if (b.direction !== a.direction) diffs.push({ label: "磁场方向", before: b.direction === "into" ? "⊗ 向里" : "⊙ 向外", after: a.direction === "into" ? "⊗ 向里" : "⊙ 向外" })
        if (b.strength !== a.strength) diffs.push({ label: "磁场强度", before: b.strength.toFixed(3) + "T", after: a.strength.toFixed(3) + "T" })
      }
    })

    beforeSnapshot.bars.forEach((b, i) => {
      const a = afterSnapshot.bars[i]
      if (a) {
        if (b.current !== a.current) diffs.push({ label: "电流大小", before: b.current + "A", after: a.current + "A" })
        if (b.direction !== a.direction) diffs.push({ label: "电流方向", before: b.direction === "up" ? "↑" : "↓", after: a.direction === "up" ? "↑" : "↓" })
      }
    })

    return diffs
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-gray-100 flex flex-col">
      <header className="border-b border-cyan-900/30 bg-[#060a14]/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(`/race/${id}`)}
            className="p-1.5 rounded border border-cyan-800/40 text-cyan-400 hover:bg-cyan-900/30 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-sm font-bold font-['Orbitron'] text-cyan-300 tracking-wider">复盘对比</h1>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div>
            <div className="text-xs font-bold text-gray-400 mb-2 font-['Orbitron']">修改前</div>
            <canvas
              ref={beforeCanvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="rounded-lg border border-cyan-900/30 w-full"
              style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
            />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 mb-2 font-['Orbitron']">修改后</div>
            <canvas
              ref={afterCanvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="rounded-lg border border-cyan-900/30 w-full"
              style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
            />
          </div>
        </div>

        {paramDiff().length > 0 && (
          <div className="rounded-lg border border-amber-700/30 bg-amber-950/10 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <GitCompare size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-300">参数差异</span>
            </div>
            <div className="space-y-2">
              {paramDiff().map((d, i) => (
                <div key={i} className="flex items-center gap-4 text-[10px]">
                  <span className="text-gray-400 w-16">{d.label}</span>
                  <span className="text-amber-400">{d.before}</span>
                  <span className="text-gray-600">→</span>
                  <span className="text-cyan-400">{d.after}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-cyan-800/30 bg-[#0d1220] p-5 mb-6">
          <h3 className="text-xs font-bold text-cyan-400 mb-4 font-['Orbitron'] tracking-wider">规则复盘</h3>

          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-bold text-red-400 mb-2">力方向规则</div>
              {forceRules.map((r) => (
                <div
                  key={r.id}
                  className={`text-[10px] py-1.5 px-3 rounded mb-1 ${
                    violatedRuleIds.has(r.id)
                      ? "bg-red-950/30 text-red-300 border-l-2 border-red-500"
                      : "text-gray-500 border-l-2 border-gray-800"
                  }`}
                >
                  <span className="font-bold">[{r.id}]</span> {r.description}
                  {violatedRuleIds.has(r.id) && (
                    <span className="ml-2 text-red-400 font-bold">← 违反</span>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div className="text-[10px] font-bold text-cyan-400 mb-2">轨迹规则</div>
              {trajRules.map((r) => (
                <div
                  key={r.id}
                  className={`text-[10px] py-1.5 px-3 rounded mb-1 ${
                    violatedRuleIds.has(r.id)
                      ? "bg-red-950/30 text-red-300 border-l-2 border-red-500"
                      : "text-gray-500 border-l-2 border-gray-800"
                  }`}
                >
                  <span className="font-bold">[{r.id}]</span> {r.description}
                  {violatedRuleIds.has(r.id) && (
                    <span className="ml-2 text-red-400 font-bold">← 违反</span>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div className="text-[10px] font-bold text-amber-400 mb-2">能量规则</div>
              {energyRules.map((r) => (
                <div
                  key={r.id}
                  className={`text-[10px] py-1.5 px-3 rounded mb-1 ${
                    violatedRuleIds.has(r.id)
                      ? "bg-red-950/30 text-red-300 border-l-2 border-red-500"
                      : "text-gray-500 border-l-2 border-gray-800"
                  }`}
                >
                  <span className="font-bold">[{r.id}]</span> {r.description}
                  {violatedRuleIds.has(r.id) && (
                    <span className="ml-2 text-red-400 font-bold">← 违反</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {beforeSnapshot && (
          <button
            onClick={() => {
              rerunWithSnapshot(beforeSnapshot.id)
              navigate(`/race/${id}`)
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded border border-amber-600/40 text-[10px] font-bold text-amber-400 hover:bg-amber-900/30 transition-colors"
          >
            <RotateCcw size={12} />
            用修改前参数重跑
          </button>
        )}
      </main>
    </div>
  )
}
