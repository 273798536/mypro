import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ParticleSystem } from '@/utils/particles'
import type { CrossSection, ViolationType, Obstacle } from '@/types'

interface GameCanvasProps {
  width?: number
  height?: number
}

interface HoverInfo {
  type: 'crossSection' | 'obstacle' | 'airflow' | null
  data: CrossSection | Obstacle | null
  x: number
  y: number
}

const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ width = 800, height = 500 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const particleSystemRef = useRef(new ParticleSystem())
    const animationFrameRef = useRef<number>()
    const lastTimeRef = useRef<number>(0)
    const [hoverInfo, setHoverInfo] = useState<HoverInfo>({ type: null, data: null, x: 0, y: 0 })

    const { currentSample, crossSections, gameState, tick } = useGameStore()

    useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement)

    useEffect(() => {
      if (currentSample) {
        particleSystemRef.current.setPaths(currentSample.airflowData.paths)
        particleSystemRef.current.reset()
      }
    }, [currentSample])

    useEffect(() => {
      if (gameState.status === 'idle') {
        particleSystemRef.current.reset()
      }
    }, [gameState.status])

    const getViolationColor = (type: ViolationType): string => {
      switch (type) {
        case 'critical':
          return '#ef4444'
        case 'warning':
          return '#f59e0b'
        default:
          return '#10b981'
      }
    }

    const drawGrid = (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)'
      ctx.lineWidth = 1
      const gridSize = 40
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

    const drawSafeBoundaries = (ctx: CanvasRenderingContext2D) => {
      if (!currentSample) return
      const { minX, maxX, minY, maxY } = currentSample.layoutData.safeBoundaries

      ctx.fillStyle = 'rgba(239, 68, 68, 0.06)'
      ctx.fillRect(0, 0, width, minY)
      ctx.fillRect(0, maxY, width, height - maxY)
      ctx.fillRect(0, minY, minX, maxY - minY)
      ctx.fillRect(maxX, minY, width - maxX, maxY - minY)

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 4])
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY)
      ctx.setLineDash([])

      ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'
      ctx.font = '11px sans-serif'
      ctx.fillText('安全边界外', minX + 4, minY + 14)
    }

    const drawObstacles = (ctx: CanvasRenderingContext2D) => {
      if (!currentSample) return
      currentSample.layoutData.obstacles.forEach((obs) => {
        const isServer = obs.type === 'server'
        const isCooler = obs.type === 'cooler'

        const grad = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height)
        if (isServer) {
          grad.addColorStop(0, '#64748b')
          grad.addColorStop(1, '#475569')
        } else if (isCooler) {
          grad.addColorStop(0, '#0ea5e9')
          grad.addColorStop(1, '#0284c7')
        } else {
          grad.addColorStop(0, '#94a3b8')
          grad.addColorStop(1, '#64748b')
        }

        ctx.fillStyle = grad
        ctx.beginPath()
        const radius = 6
        ctx.moveTo(obs.x + radius, obs.y)
        ctx.lineTo(obs.x + obs.width - radius, obs.y)
        ctx.quadraticCurveTo(obs.x + obs.width, obs.y, obs.x + obs.width, obs.y + radius)
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height - radius)
        ctx.quadraticCurveTo(obs.x + obs.width, obs.y + obs.height, obs.x + obs.width - radius, obs.y + obs.height)
        ctx.lineTo(obs.x + radius, obs.y + obs.height)
        ctx.quadraticCurveTo(obs.x, obs.y + obs.height, obs.x, obs.y + obs.height - radius)
        ctx.lineTo(obs.x, obs.y + radius)
        ctx.quadraticCurveTo(obs.x, obs.y, obs.x + radius, obs.y)
        ctx.closePath()
        ctx.fill()

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(obs.label, obs.x + obs.width / 2, obs.y + obs.height / 2)
        ctx.textAlign = 'start'
        ctx.textBaseline = 'alphabetic'
      })
    }

    const drawAirflowPaths = (ctx: CanvasRenderingContext2D) => {
      if (!currentSample) return

      currentSample.airflowData.paths.forEach((path) => {
        if (path.pathNodes.length < 2) return

        ctx.beginPath()
        ctx.moveTo(path.pathNodes[0].x, path.pathNodes[0].y)
        for (let i = 1; i < path.pathNodes.length; i++) {
          ctx.lineTo(path.pathNodes[i].x, path.pathNodes[i].y)
        }
        ctx.strokeStyle = path.color
        ctx.lineWidth = 3
        ctx.globalAlpha = 0.7
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
        ctx.globalAlpha = 1

        ctx.beginPath()
        ctx.arc(path.startX, path.startY, 6, 0, Math.PI * 2)
        ctx.fillStyle = path.color
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(path.endX, path.endY, 6, 0, Math.PI * 2)
        ctx.fillStyle = path.color
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      })
    }

    const drawCrossSections = (ctx: CanvasRenderingContext2D, time: number) => {
      crossSections.forEach((cs) => {
        const rad = (cs.angle * Math.PI) / 180
        const halfWidth = cs.width / 2
        const x1 = cs.positionX - Math.cos(rad) * halfWidth
        const y1 = cs.positionY - Math.sin(rad) * halfWidth
        const x2 = cs.positionX + Math.cos(rad) * halfWidth
        const y2 = cs.positionY + Math.sin(rad) * halfWidth

        const color = getViolationColor(cs.violationType)
        const isFlashing = cs.violationType === 'critical'
        const alpha = isFlashing ? 0.5 + Math.sin(time * 0.006) * 0.5 : 1

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = color
        ctx.globalAlpha = alpha
        ctx.lineWidth = cs.isViolated ? 5 : 3
        if (cs.violationType === 'warning') {
          ctx.setLineDash([10, 6])
        }
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1

        ctx.beginPath()
        ctx.arc(cs.positionX, cs.positionY, 9, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = alpha
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.globalAlpha = 1
        ctx.stroke()

        ctx.fillStyle = '#fff'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const match = cs.name.match(/#(\d+)/)
        ctx.fillText(match ? match[1] : '?', cs.positionX, cs.positionY)
        ctx.textAlign = 'start'
        ctx.textBaseline = 'alphabetic'

        if (cs.violations.length > 0) {
          cs.violations.forEach((v) => {
            ctx.beginPath()
            ctx.arc(v.position.x, v.position.y, 8, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'
            ctx.fill()
            ctx.strokeStyle = '#ef4444'
            ctx.lineWidth = 2
            ctx.globalAlpha = 0.5 + Math.sin(time * 0.008) * 0.5
            ctx.stroke()
            ctx.globalAlpha = 1
          })
        }
      })
    }

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const render = (time: number) => {
        const deltaTime = time - (lastTimeRef.current || time)
        lastTimeRef.current = time

        if (gameState.status === 'running') {
          tick(deltaTime)
          particleSystemRef.current.update(deltaTime, time)
        }

        ctx.fillStyle = '#0f172a'
        ctx.fillRect(0, 0, width, height)

        const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 1.2)
        bgGrad.addColorStop(0, '#1e293b')
        bgGrad.addColorStop(1, '#0f172a')
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, width, height)

        drawGrid(ctx)
        drawSafeBoundaries(ctx)
        drawObstacles(ctx)
        drawAirflowPaths(ctx)
        particleSystemRef.current.render(ctx)
        drawCrossSections(ctx, time)

        animationFrameRef.current = requestAnimationFrame(render)
      }

      animationFrameRef.current = requestAnimationFrame(render)

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    }, [currentSample, crossSections, gameState.status, width, height])

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !currentSample) return
      const rect = canvasRef.current.getBoundingClientRect()
      const scaleX = width / rect.width
      const scaleY = height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      for (const cs of crossSections) {
        const dist = Math.sqrt((x - cs.positionX) ** 2 + (y - cs.positionY) ** 2)
        if (dist < 20) {
          setHoverInfo({ type: 'crossSection', data: cs, x: e.clientX - rect.left, y: e.clientY - rect.top })
          return
        }
      }

      for (const obs of currentSample.layoutData.obstacles) {
        if (x >= obs.x && x <= obs.x + obs.width && y >= obs.y && y <= obs.y + obs.height) {
          setHoverInfo({ type: 'obstacle', data: obs, x: e.clientX - rect.left, y: e.clientY - rect.top })
          return
        }
      }

      setHoverInfo({ type: null, data: null, x: 0, y: 0 })
    }

    return (
      <div className="relative bg-white rounded-xl shadow-lg border border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            机房气流路径可视化
          </h3>
          {currentSample && (
            <span className="text-xs text-slate-500">
              网格: {currentSample.layoutData.gridWidth}×{currentSample.layoutData.gridHeight}px
            </span>
          )}
        </div>
        <div className="relative rounded-lg overflow-hidden border border-slate-700 shadow-inner" style={{ width: '100%' }}>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverInfo({ type: null, data: null, x: 0, y: 0 })}
            className="block w-full h-auto cursor-crosshair"
            style={{ aspectRatio: `${width}/${height}` }}
          />

          {hoverInfo.type === 'crossSection' && hoverInfo.data && 'violationType' in hoverInfo.data && (
            <div
              className="absolute z-10 bg-slate-900/95 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-xs pointer-events-none"
              style={{ left: hoverInfo.x + 15, top: hoverInfo.y + 15 }}
            >
              <div className="font-semibold mb-1">{hoverInfo.data.name}</div>
              <div className="text-slate-300">位置: ({hoverInfo.data.positionX}, {hoverInfo.data.positionY})</div>
              <div className="text-slate-300">角度: {hoverInfo.data.angle}° | 宽度: {hoverInfo.data.width}px</div>
              <div className={`mt-1 ${
                hoverInfo.data.violationType === 'critical' ? 'text-rose-400' :
                hoverInfo.data.violationType === 'warning' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                状态: {
                  hoverInfo.data.violationType === 'critical' ? '严重越界' :
                  hoverInfo.data.violationType === 'warning' ? '警告级越界' : '正常'
                }
              </div>
              {hoverInfo.data.violations.length > 0 && (
                <div className="mt-1 pt-1 border-t border-slate-700 text-slate-300">
                  检测到 {hoverInfo.data.violations.length} 项问题
                </div>
              )}
            </div>
          )}

          {hoverInfo.type === 'obstacle' && hoverInfo.data && 'label' in hoverInfo.data && (
            <div
              className="absolute z-10 bg-slate-900/95 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none"
              style={{ left: hoverInfo.x + 15, top: hoverInfo.y + 15 }}
            >
              <div className="font-semibold">{hoverInfo.data.label}</div>
              <div className="text-slate-300">
                类型: {hoverInfo.data.type === 'server' ? '服务器机柜' : hoverInfo.data.type === 'cooler' ? '空调设备' : '墙体'}
              </div>
              <div className="text-slate-300">尺寸: {hoverInfo.data.width}×{hoverInfo.data.height}px</div>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500 text-center">
          💡 将鼠标悬停在剖切面或设备上可查看详细信息
        </p>
      </div>
    )
  }
)

GameCanvas.displayName = 'GameCanvas'

export default GameCanvas
