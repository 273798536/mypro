import { useRef, useEffect } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { COLORS, CANVAS_CONFIG } from '../../utils/constants'
import type { Track, Cart, Junction, Station } from '../../types/game'

const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  const {
    status,
    tracks,
    carts,
    junctions,
    stations,
    updateGame,
    switchJunction,
  } = useGameStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }

      const deltaTime = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      if (status === 'playing') {
        updateGame(deltaTime)
      }

      drawGame(ctx)
      animationRef.current = requestAnimationFrame(gameLoop)
    }

    const drawGame = (ctx: CanvasRenderingContext2D) => {
      const { WIDTH, HEIGHT } = CANVAS_CONFIG

      ctx.fillStyle = COLORS.BACKGROUND
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      drawStarfield(ctx)
      drawGrid(ctx)
      tracks.forEach((track) => drawTrack(ctx, track))
      stations.forEach((station) => drawStation(ctx, station))
      junctions.forEach((junction) => drawJunction(ctx, junction))
      carts.forEach((cart) => drawCart(ctx, cart))
    }

    const drawStarfield = (ctx: CanvasRenderingContext2D) => {
      const { WIDTH, HEIGHT } = CANVAS_CONFIG
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      for (let i = 0; i < 100; i++) {
        const x = (i * 137.5) % WIDTH
        const y = (i * 97.3) % HEIGHT
        const size = (i % 3) * 0.5 + 0.5
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawGrid = (ctx: CanvasRenderingContext2D) => {
      const { WIDTH, HEIGHT, GRID_SIZE } = CANVAS_CONFIG
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)'
      ctx.lineWidth = 1

      for (let x = 0; x <= WIDTH; x += GRID_SIZE) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, HEIGHT)
        ctx.stroke()
      }

      for (let y = 0; y <= HEIGHT; y += GRID_SIZE) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(WIDTH, y)
        ctx.stroke()
      }
    }

    const drawTrack = (ctx: CanvasRenderingContext2D, track: Track) => {
      const gradient = ctx.createLinearGradient(
        track.from.x,
        track.from.y,
        track.to.x,
        track.to.y
      )

      if (track.blocked) {
        gradient.addColorStop(0, COLORS.TRACK_BLOCKED)
        gradient.addColorStop(1, COLORS.TRACK_BLOCKED)
      } else {
        gradient.addColorStop(0, COLORS.PRIMARY)
        gradient.addColorStop(1, COLORS.PRIMARY_DARK)
      }

      ctx.strokeStyle = gradient
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      ctx.shadowColor = track.blocked ? COLORS.TRACK_BLOCKED : COLORS.PRIMARY
      ctx.shadowBlur = track.blocked ? 15 : 10

      ctx.beginPath()
      ctx.moveTo(track.from.x, track.from.y)
      ctx.lineTo(track.to.x, track.to.y)
      ctx.stroke()

      ctx.shadowBlur = 0
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(track.from.x, track.from.y)
      ctx.lineTo(track.to.x, track.to.y)
      ctx.stroke()

      if (track.blocked) {
        const midX = (track.from.x + track.to.x) / 2
        const midY = (track.from.y + track.to.y) / 2

        ctx.fillStyle = COLORS.TRACK_BLOCKED
        ctx.beginPath()
        ctx.arc(midX, midY, 15, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(midX - 8, midY - 8)
        ctx.lineTo(midX + 8, midY + 8)
        ctx.moveTo(midX + 8, midY - 8)
        ctx.lineTo(midX - 8, midY + 8)
        ctx.stroke()
      }
    }

    const drawJunction = (ctx: CanvasRenderingContext2D, junction: Junction) => {
      const { NODE_RADIUS } = CANVAS_CONFIG

      ctx.shadowColor = COLORS.SECONDARY
      ctx.shadowBlur = 20
      ctx.fillStyle = COLORS.SECONDARY
      ctx.beginPath()
      ctx.arc(junction.position.x, junction.position.y, NODE_RADIUS + 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowBlur = 0
      ctx.fillStyle = COLORS.SURFACE
      ctx.beginPath()
      ctx.arc(junction.position.x, junction.position.y, NODE_RADIUS, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = COLORS.SUCCESS
      ctx.beginPath()
      ctx.arc(junction.position.x, junction.position.y, NODE_RADIUS - 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('⚙', junction.position.x, junction.position.y)

      ctx.fillStyle = COLORS.TEXT_MUTED
      ctx.font = '10px monospace'
      ctx.fillText(
        `切换到: ${junction.activeTrack}`,
        junction.position.x,
        junction.position.y + 25
      )
    }

    const drawStation = (ctx: CanvasRenderingContext2D, station: Station) => {
      const { NODE_RADIUS } = CANVAS_CONFIG

      let stationColor = COLORS.PRIMARY
      let stationIcon = '📦'

      switch (station.type) {
        case 'ore':
          stationColor = COLORS.WARNING
          stationIcon = '⛏'
          break
        case 'energy':
          stationColor = COLORS.SUCCESS
          stationIcon = '⚡'
          break
        case 'warehouse':
          stationColor = COLORS.PRIMARY
          stationIcon = '🏭'
          break
      }

      ctx.shadowColor = stationColor
      ctx.shadowBlur = 20
      ctx.fillStyle = stationColor
      ctx.beginPath()
      ctx.arc(station.position.x, station.position.y, NODE_RADIUS + 8, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowBlur = 0
      ctx.fillStyle = COLORS.SURFACE
      ctx.beginPath()
      ctx.arc(station.position.x, station.position.y, NODE_RADIUS + 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = stationColor
      ctx.beginPath()
      ctx.arc(station.position.x, station.position.y, NODE_RADIUS, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(stationIcon, station.position.x, station.position.y)

      ctx.fillStyle = COLORS.TEXT
      ctx.font = '10px monospace'
      ctx.fillText(
        `${station.current}/${station.capacity}`,
        station.position.x,
        station.position.y + 28
      )
    }

    const drawCart = (ctx: CanvasRenderingContext2D, cart: Cart) => {
      const { CART_RADIUS } = CANVAS_CONFIG

      ctx.shadowColor = cart.color
      ctx.shadowBlur = 15
      ctx.fillStyle = cart.color
      ctx.beginPath()
      ctx.arc(cart.position.x, cart.position.y, CART_RADIUS, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowBlur = 0
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cart.position.x, cart.position.y, CART_RADIUS, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🚂', cart.position.x, cart.position.y)

      if (cart.cargo > 0) {
        const cargoProgress = cart.cargo / cart.maxCargo
        ctx.fillStyle = COLORS.WARNING
        ctx.fillRect(
          cart.position.x - 15,
          cart.position.y - 22,
          30 * cargoProgress,
          4
        )
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(cart.position.x - 15, cart.position.y - 22, 30, 4)
      }

      ctx.fillStyle = COLORS.TEXT_MUTED
      ctx.font = '9px monospace'
      ctx.fillText(
        `${cart.cargo}/${cart.maxCargo}`,
        cart.position.x,
        cart.position.y + 22
      )
    }

    const handleCanvasClick = (e: MouseEvent) => {
      if (status !== 'playing') return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      for (const junction of junctions) {
        const distance = Math.sqrt(
          Math.pow(x - junction.position.x, 2) + Math.pow(y - junction.position.y, 2)
        )
        if (distance < CANVAS_CONFIG.NODE_RADIUS + 10) {
          switchJunction(junction.id)
          return
        }
      }
    }

    canvas.addEventListener('click', handleCanvasClick)

    animationRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      canvas.removeEventListener('click', handleCanvasClick)
    }
  }, [status, tracks, carts, junctions, stations, updateGame, switchJunction])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_CONFIG.WIDTH}
        height={CANVAS_CONFIG.HEIGHT}
        className="rounded-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 cursor-pointer"
      />
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-cyan-500/30">
        <p className="text-xs text-cyan-400">💡 点击岔口（⚙）切换轨道方向</p>
      </div>
    </div>
  )
}

export default GameCanvas
