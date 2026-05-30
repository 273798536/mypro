import { useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const levelData = useGameStore(s => s.levelData)
  const detectedObstacles = useGameStore(s => s.detectedObstacles)
  const phase = useGameStore(s => s.phase)
  const selectedPath = useGameStore(s => s.selectedPath)
  const pathOptions = useGameStore(s => s.pathOptions)
  const waveAnimations = useGameStore(s => s.waveAnimations)
  const updateWaveAnimations = useGameStore(s => s.updateWaveAnimations)

  const CANVAS_W = 800
  const CANVAS_H = 560

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !levelData) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#060E1A'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.strokeStyle = 'rgba(0, 100, 150, 0.08)'
    ctx.lineWidth = 1
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

    ctx.font = '10px JetBrains Mono'
    ctx.fillStyle = 'rgba(0, 100, 150, 0.2)'
    for (let x = 0; x < CANVAS_W; x += 80) {
      ctx.fillText(`${x}`, x + 2, 12)
    }
    for (let y = 80; y < CANVAS_H; y += 80) {
      ctx.fillText(`${y}`, 2, y - 2)
    }

    levelData.paths.forEach((path, idx) => {
      const isSelected = selectedPath === idx
      const showPaths = phase === 'pathSelect' || phase === 'result'

      if (showPaths) {
        ctx.beginPath()
        ctx.strokeStyle = isSelected
          ? path.isSafe ? '#00FF88' : '#FF6B35'
          : 'rgba(0, 212, 255, 0.25)'
        ctx.lineWidth = isSelected ? 3 : 1.5
        ctx.setLineDash(isSelected ? [] : [8, 6])

        if (path.waypoints.length > 0) {
          ctx.moveTo(path.waypoints[0].x, path.waypoints[0].y)
          for (let i = 1; i < path.waypoints.length; i++) {
            ctx.lineTo(path.waypoints[i].x, path.waypoints[i].y)
          }
        }
        ctx.stroke()
        ctx.setLineDash([])

        if (showPaths) {
          const lastWp = path.waypoints[path.waypoints.length - 1]
          ctx.fillStyle = isSelected
            ? path.isSafe ? '#00FF88' : '#FF6B35'
            : 'rgba(0, 212, 255, 0.4)'
          ctx.font = `${isSelected ? '13' : '11'}px Noto Sans SC`
          const label = `${path.direction === 'left' ? '← 左' : path.direction === 'right' ? '右 →' : '↑ 中'}`
          ctx.fillText(label, lastWp.x - 15, lastWp.y - 12)

          if (isSelected) {
            const conf = pathOptions[idx]?.confidence || 0
            ctx.font = '11px JetBrains Mono'
            ctx.fillStyle = 'rgba(255,255,255,0.7)'
            ctx.fillText(`${conf}%`, lastWp.x - 10, lastWp.y + 4)
          }
        }
      }
    })

    const goal = levelData.goalPosition
    const goalGlow = ctx.createRadialGradient(goal.x, goal.y, 0, goal.x, goal.y, 20)
    goalGlow.addColorStop(0, 'rgba(0, 255, 136, 0.3)')
    goalGlow.addColorStop(1, 'rgba(0, 255, 136, 0)')
    ctx.fillStyle = goalGlow
    ctx.beginPath()
    ctx.arc(goal.x, goal.y, 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#00FF88'
    ctx.beginPath()
    ctx.arc(goal.x, goal.y, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = '10px JetBrains Mono'
    ctx.fillStyle = '#00FF88'
    ctx.fillText('GOAL', goal.x - 15, goal.y + 20)

    detectedObstacles.forEach(det => {
      const detected = det.detectedPosition !== null
      if (!detected) return

      const pos = det.detectedPosition!
      const obstacle = levelData.obstacles.find(o => o.id === det.id)
      if (!obstacle) return

      const colorMap = { rock: '#5a7a9a', mine: '#FF6B35', current: '#00D4FF' }
      const baseColor = colorMap[obstacle.type]
      const alpha = Math.min(0.9, det.confidence / 100)

      if (det.isCorrectlyDetected) {
        ctx.strokeStyle = baseColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, obstacle.size / 2 + 5, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.fillStyle = baseColor + Math.round(alpha * 255).toString(16).padStart(2, '0')
      if (obstacle.type === 'rock') {
        ctx.beginPath()
        const r = obstacle.size / 2
        for (let i = 0; i < 7; i++) {
          const angle = (i / 7) * Math.PI * 2
          const jitter = 0.8 + Math.random() * 0.4
          const px = pos.x + Math.cos(angle) * r * jitter
          const py = pos.y + Math.sin(angle) * r * jitter
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
      } else if (obstacle.type === 'mine') {
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, obstacle.size / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#FF3355'
        ctx.lineWidth = 1.5
        const s = obstacle.size / 2 + 5
        ctx.beginPath()
        ctx.moveTo(pos.x - s, pos.y)
        ctx.lineTo(pos.x + s, pos.y)
        ctx.moveTo(pos.x, pos.y - s)
        ctx.lineTo(pos.x, pos.y + s)
        ctx.stroke()
      } else {
        ctx.setLineDash([4, 3])
        ctx.strokeStyle = baseColor + Math.round(alpha * 255).toString(16).padStart(2, '0')
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, obstacle.size / 2, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      if (det.confidence > 0 && det.confidence < 60) {
        ctx.font = '9px JetBrains Mono'
        ctx.fillStyle = 'rgba(255, 107, 53, 0.8)'
        ctx.fillText(`${Math.round(det.confidence)}%`, pos.x + obstacle.size / 2 + 3, pos.y + 3)
      }
    })

    waveAnimations.forEach(wave => {
      ctx.beginPath()
      ctx.strokeStyle = `rgba(0, 255, 136, ${wave.opacity * 0.5})`
      ctx.lineWidth = 2
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.beginPath()
      ctx.strokeStyle = `rgba(0, 255, 136, ${wave.opacity * 0.2})`
      ctx.lineWidth = 1
      ctx.arc(wave.x, wave.y, wave.radius * 0.7, 0, Math.PI * 2)
      ctx.stroke()
    })

    const sub = levelData.subStartPosition
    const subGlow = ctx.createRadialGradient(sub.x, sub.y, 0, sub.x, sub.y, 25)
    subGlow.addColorStop(0, 'rgba(0, 212, 255, 0.3)')
    subGlow.addColorStop(1, 'rgba(0, 212, 255, 0)')
    ctx.fillStyle = subGlow
    ctx.beginPath()
    ctx.arc(sub.x, sub.y, 25, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#00D4FF'
    ctx.beginPath()
    ctx.moveTo(sub.x + 14, sub.y)
    ctx.lineTo(sub.x - 8, sub.y - 7)
    ctx.lineTo(sub.x - 5, sub.y)
    ctx.lineTo(sub.x - 8, sub.y + 7)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#00D4FF'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(sub.x, sub.y, 12, -0.3, 0.3)
    ctx.stroke()

    ctx.font = '10px JetBrains Mono'
    ctx.fillStyle = '#00D4FF'
    ctx.fillText('YOU', sub.x - 10, sub.y + 22)

    const depthBarX = CANVAS_W - 20
    ctx.fillStyle = 'rgba(0, 50, 80, 0.5)'
    ctx.fillRect(depthBarX - 6, 20, 12, CANVAS_H - 40)
    ctx.fillStyle = 'rgba(0, 150, 200, 0.4)'
    ctx.fillRect(depthBarX - 4, 22, 8, (CANVAS_H - 44) * (sub.y / CANVAS_H))
    ctx.font = '8px JetBrains Mono'
    ctx.fillStyle = 'rgba(0, 212, 255, 0.5)'
    ctx.fillText('D', depthBarX - 4, 16)
    ctx.fillText(`${Math.round(sub.y / CANVAS_H * 200)}m`, depthBarX - 14, CANVAS_H - 8)
  }, [levelData, detectedObstacles, phase, selectedPath, pathOptions, waveAnimations])

  useEffect(() => {
    const animId = setInterval(() => {
      updateWaveAnimations()
    }, 50)
    return () => clearInterval(animId)
  }, [updateWaveAnimations])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="rounded-lg border border-cyan-900/30"
      />
      {phase === 'echo' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="text-sonar-green text-lg font-mono glow-green animate-ping-slow">
            回声接收中...
          </div>
        </div>
      )}
    </div>
  )
}
