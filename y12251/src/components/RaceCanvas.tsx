import { useRef, useEffect, useCallback } from "react"
import { useGameStore } from "@/store/gameStore"
import type { MagneticBoard, TargetGate, Point, Particle } from "@/types"
import { calculateLorentzForce, calculateTrajectoryRadius, calculateCircleCenter } from "@/utils/physics"

const CANVAS_W = 700
const CANVAS_H = 520

export default function RaceCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phase = useGameStore((s) => s.phase)
  const boards = useGameStore((s) => s.boards)
  const bars = useGameStore((s) => s.bars)
  const gates = useGameStore((s) => s.gates)
  const particle = useGameStore((s) => s.particle)
  const aimAngle = useGameStore((s) => s.aimAngle)
  const predictedTrajectory = useGameStore((s) => s.predictedTrajectory)
  const trajectoryPoints = useGameStore((s) => s.trajectoryPoints)
  const forceDirection = useGameStore((s) => s.forceDirection)
  const setAimAngle = useGameStore((s) => s.setAimAngle)
  const passed = useGameStore((s) => s.passed)

  const drawBoard = useCallback((ctx: CanvasRenderingContext2D, board: MagneticBoard) => {
    ctx.save()
    ctx.strokeStyle = "rgba(0, 229, 255, 0.15)"
    ctx.lineWidth = 1
    ctx.strokeRect(board.x, board.y, board.width, board.height)

    ctx.fillStyle = "rgba(0, 229, 255, 0.04)"
    ctx.fillRect(board.x, board.y, board.width, board.height)

    const spacing = 40
    const symbolSize = 6
    for (let gx = board.x + spacing / 2; gx < board.x + board.width; gx += spacing) {
      for (let gy = board.y + spacing / 2; gy < board.y + board.height; gy += spacing) {
        ctx.strokeStyle = "rgba(0, 229, 255, 0.35)"
        ctx.lineWidth = 1
        if (board.direction === "into") {
          ctx.beginPath()
          ctx.arc(gx, gy, symbolSize, 0, Math.PI * 2)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(gx - symbolSize * 0.6, gy - symbolSize * 0.6)
          ctx.lineTo(gx + symbolSize * 0.6, gy + symbolSize * 0.6)
          ctx.moveTo(gx + symbolSize * 0.6, gy - symbolSize * 0.6)
          ctx.lineTo(gx - symbolSize * 0.6, gy + symbolSize * 0.6)
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.arc(gx, gy, symbolSize, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = "rgba(0, 229, 255, 0.4)"
          ctx.beginPath()
          ctx.arc(gx, gy, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    ctx.restore()
  }, [])

  const drawBar = useCallback((ctx: CanvasRenderingContext2D, bar: { x: number; y: number; current: number; direction: string }) => {
    ctx.save()
    const barH = 60
    ctx.strokeStyle = "rgba(255, 171, 0, 0.7)"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(bar.x, bar.y - barH / 2)
    ctx.lineTo(bar.x, bar.y + barH / 2)
    ctx.stroke()

    const arrowY = bar.direction === "up" ? bar.y - barH / 2 - 8 : bar.y + barH / 2 + 8
    const arrowDir = bar.direction === "up" ? -1 : 1
    ctx.fillStyle = "rgba(255, 171, 0, 0.9)"
    ctx.beginPath()
    ctx.moveTo(bar.x, arrowY)
    ctx.lineTo(bar.x - 6, arrowY + arrowDir * 10)
    ctx.lineTo(bar.x + 6, arrowY + arrowDir * 10)
    ctx.closePath()
    ctx.fill()

    ctx.font = "11px 'Noto Sans SC'"
    ctx.fillStyle = "rgba(255, 171, 0, 0.8)"
    ctx.textAlign = "left"
    ctx.fillText(`I=${bar.current}A`, bar.x + 10, bar.y + 4)
    ctx.restore()
  }, [])

  const drawGate = useCallback((ctx: CanvasRenderingContext2D, gate: TargetGate, didPass: boolean) => {
    ctx.save()
    const gateH = 30
    const color = didPass ? "rgba(0, 230, 118, 0.9)" : "rgba(255, 171, 0, 0.8)"
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.shadowColor = color
    ctx.shadowBlur = 8

    ctx.beginPath()
    ctx.moveTo(gate.x - gate.width / 2, gate.y - gateH / 2)
    ctx.lineTo(gate.x - gate.width / 2, gate.y + gateH / 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(gate.x + gate.width / 2, gate.y - gateH / 2)
    ctx.lineTo(gate.x + gate.width / 2, gate.y + gateH / 2)
    ctx.stroke()

    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(gate.x - gate.width / 2, gate.y)
    ctx.lineTo(gate.x + gate.width / 2, gate.y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.shadowBlur = 0
    ctx.restore()
  }, [])

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, p: Point, isGhost: boolean) => {
    ctx.save()
    const color = isGhost ? "rgba(0, 229, 255, 0.3)" : "rgba(0, 229, 255, 0.95)"
    ctx.fillStyle = color
    ctx.shadowColor = isGhost ? "rgba(0, 229, 255, 0.2)" : "rgba(0, 229, 255, 0.8)"
    ctx.shadowBlur = isGhost ? 4 : 12
    ctx.beginPath()
    ctx.arc(p.x, p.y, isGhost ? 4 : 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.restore()
  }, [])

  const drawTrajectory = useCallback((ctx: CanvasRenderingContext2D, points: Point[], color: string, isDashed: boolean) => {
    if (points.length < 2) return
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    if (isDashed) ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }, [])

  const drawForceArrow = useCallback((ctx: CanvasRenderingContext2D, origin: Point, force: Point) => {
    const mag = Math.sqrt(force.x * force.x + force.y * force.y)
    if (mag === 0) return
    const len = 50
    const nx = force.x / mag
    const ny = force.y / mag
    const ex = origin.x + nx * len
    const ey = origin.y + ny * len

    ctx.save()
    ctx.strokeStyle = "rgba(255, 23, 68, 0.9)"
    ctx.lineWidth = 2.5
    ctx.shadowColor = "rgba(255, 23, 68, 0.6)"
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y)
    ctx.lineTo(ex, ey)
    ctx.stroke()

    const angle = Math.atan2(ny, nx)
    const headLen = 10
    ctx.fillStyle = "rgba(255, 23, 68, 0.9)"
    ctx.beginPath()
    ctx.moveTo(ex, ey)
    ctx.lineTo(ex - headLen * Math.cos(angle - 0.4), ey - headLen * Math.sin(angle - 0.4))
    ctx.lineTo(ex - headLen * Math.cos(angle + 0.4), ey - headLen * Math.sin(angle + 0.4))
    ctx.closePath()
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.font = "bold 12px 'Noto Sans SC'"
    ctx.fillStyle = "rgba(255, 23, 68, 0.9)"
    ctx.textAlign = "left"
    ctx.fillText("F", ex + 8, ey - 4)
    ctx.restore()
  }, [])

  const drawAimArc = useCallback((ctx: CanvasRenderingContext2D, origin: Point, angle: number) => {
    ctx.save()
    ctx.strokeStyle = "rgba(0, 229, 255, 0.5)"
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.arc(origin.x, origin.y, 40, 0, angle, angle < 0)
    ctx.stroke()
    ctx.setLineDash([])

    const lineLen = 60
    const ex = origin.x + Math.cos(angle) * lineLen
    const ey = origin.y + Math.sin(angle) * lineLen
    ctx.strokeStyle = "rgba(0, 230, 118, 0.7)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y)
    ctx.lineTo(ex, ey)
    ctx.stroke()

    ctx.fillStyle = "rgba(0, 230, 118, 0.8)"
    ctx.font = "10px 'Orbitron'"
    ctx.textAlign = "left"
    const deg = ((angle * 180) / Math.PI).toFixed(1)
    ctx.fillText(`${deg}°`, ex + 6, ey - 2)
    ctx.restore()
  }, [])

  const drawTrajectoryInfo = useCallback((ctx: CanvasRenderingContext2D, p: Particle, board: MagneticBoard) => {
    ctx.save()
    const r = calculateTrajectoryRadius(p, board)
    const center = calculateCircleCenter(p, board)
    ctx.strokeStyle = "rgba(0, 229, 255, 0.12)"
    ctx.lineWidth = 1
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = "rgba(0, 229, 255, 0.4)"
    ctx.beginPath()
    ctx.arc(center.x, center.y, 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.font = "10px 'Orbitron'"
    ctx.fillStyle = "rgba(0, 229, 255, 0.5)"
    ctx.textAlign = "left"
    ctx.fillText(`r=${r.toFixed(1)}`, center.x + 6, center.y - 6)
    ctx.restore()
  }, [calculateTrajectoryRadius, calculateCircleCenter])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.fillStyle = "#0a0e1a"
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.strokeStyle = "rgba(0, 229, 255, 0.06)"
    ctx.lineWidth = 0.5
    for (let x = 0; x < CANVAS_W; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_H)
      ctx.stroke()
    }
    for (let y = 0; y < CANVAS_H; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(CANVAS_W, y)
      ctx.stroke()
    }

    boards.forEach((b) => drawBoard(ctx, b))
    bars.forEach((b) => drawBar(ctx, b))
    gates.forEach((g) => drawGate(ctx, g, passed))

    if (particle) {
      if (predictedTrajectory.length > 0 && (phase === "aiming" || phase === "running" || phase === "finished")) {
        drawTrajectory(ctx, predictedTrajectory, "rgba(0, 229, 255, 0.2)", true)
      }
      if (trajectoryPoints.length > 0 && (phase === "running" || phase === "finished")) {
        drawTrajectory(ctx, trajectoryPoints, "rgba(0, 230, 118, 0.7)", false)
      }

      if (boards[0] && phase === "aiming") {
        drawTrajectoryInfo(ctx, particle, boards[0])
      }

      drawParticle(ctx, particle, phase === "finished")

      if (phase === "aiming") {
        drawAimArc(ctx, particle, aimAngle)
      }

      if (forceDirection && (phase === "aiming" || phase === "running" || phase === "finished")) {
        drawForceArrow(ctx, particle, forceDirection)
      }
    }

    ctx.save()
    ctx.fillStyle = "rgba(0, 229, 255, 0.4)"
    ctx.font = "10px 'Noto Sans SC'"
    ctx.textAlign = "right"
    const phaseLabels: Record<string, string> = {
      board_arrival: "磁场板到达",
      current_arrival: "电流条到达",
      gate_arrival: "靶门到达",
      aiming: "瞄准中",
      running: "运行中",
      judging: "判定中",
      finished: passed ? "通过 ✓" : "未通过 ✗",
    }
    ctx.fillText(phaseLabels[phase] || phase, CANVAS_W - 12, 18)
    ctx.restore()
  }, [
    phase, boards, bars, gates, particle, aimAngle,
    predictedTrajectory, trajectoryPoints, forceDirection, passed,
    drawBoard, drawBar, drawGate, drawParticle, drawTrajectory,
    drawForceArrow, drawAimArc, drawTrajectoryInfo,
  ])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== "aiming" || !particle) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    const dx = mx - particle.x
    const dy = my - particle.y
    const angle = Math.atan2(dy, dx)
    setAimAngle(angle)
  }, [phase, particle, setAimAngle])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      onClick={handleCanvasClick}
      className="rounded-lg border border-cyan-900/40 shadow-[0_0_30px_rgba(0,229,255,0.1)] cursor-crosshair w-full"
      style={{ maxWidth: CANVAS_W, aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
    />
  )
}
