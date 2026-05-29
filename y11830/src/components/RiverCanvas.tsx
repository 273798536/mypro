import { useRef, useEffect, useCallback } from 'react'

interface RiverCanvasProps {
  upstreamLevel: number
  reservoirCapacity: number
  gateOpenPercent: number
  downstreamFlow: number
  downstreamSafeThreshold: number
}

function getWaterColor(ratio: number): string {
  if (ratio < 0.6) return 'rgb(30,100,200)'
  if (ratio < 0.85) return 'rgb(220,160,30)'
  return 'rgb(210,50,40)'
}

function drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#8B7355'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = '#A0522D'
  ctx.beginPath()
  ctx.moveTo(x - 4, y)
  ctx.lineTo(x + w / 2, y - h * 0.6)
  ctx.lineTo(x + w + 4, y)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(x + w * 0.3, y + h * 0.4, w * 0.2, h * 0.3)
}

export default function RiverCanvas({
  upstreamLevel,
  reservoirCapacity,
  gateOpenPercent,
  downstreamFlow,
  downstreamSafeThreshold,
}: RiverCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const timeRef = useRef<number>(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const W = rect.width
    const H = rect.height
    const bankH = H * 0.15
    const waterTop = bankH
    const waterH = H - bankH * 2

    const ratio = Math.min(upstreamLevel / reservoirCapacity, 1)
    const waterFillH = waterH * ratio

    ctx.clearRect(0, 0, W, H)

    // 上方河岸
    ctx.fillStyle = '#4A7C3F'
    ctx.fillRect(0, 0, W, bankH)
    ctx.fillStyle = '#5A8C4F'
    ctx.fillRect(0, bankH - 6, W, 6)

    // 下方河岸
    ctx.fillStyle = '#4A7C3F'
    ctx.fillRect(0, H - bankH, W, bankH)
    ctx.fillStyle = '#5A8C4F'
    ctx.fillRect(0, H - bankH, W, 6)

    const gateX = W * 0.48
    const gateW = W * 0.04

    // 上游水库水面
    const upstreamWaterY = waterTop + waterH - waterFillH
    ctx.fillStyle = getWaterColor(ratio)
    ctx.fillRect(0, upstreamWaterY, gateX, waterTop + waterH - upstreamWaterY)

    // 上游水面波浪
    ctx.beginPath()
    ctx.moveTo(0, upstreamWaterY)
    const t = timeRef.current
    for (let x = 0; x <= gateX; x += 2) {
      const wave = Math.sin(x * 0.03 + t * 2) * 4 + Math.sin(x * 0.07 + t * 3) * 2
      ctx.lineTo(x, upstreamWaterY + wave)
    }
    ctx.lineTo(gateX, waterTop + waterH)
    ctx.lineTo(0, waterTop + waterH)
    ctx.closePath()
    ctx.fillStyle = getWaterColor(ratio)
    ctx.fill()

    // 闸门
    const gateMaxH = waterH
    const gateClosedH = gateMaxH * (1 - gateOpenPercent / 100)
    const gateTopY = waterTop + (gateMaxH - gateClosedH)

    ctx.fillStyle = '#555'
    ctx.fillRect(gateX - 2, waterTop - 4, gateW + 4, 8)
    ctx.fillRect(gateX + gateW + 1, waterTop - 4, 3, waterH + 8)
    ctx.fillRect(gateX - 3, waterTop - 4, 3, waterH + 8)

    ctx.fillStyle = '#888'
    ctx.fillRect(gateX, gateTopY, gateW, gateClosedH)
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 1
    ctx.strokeRect(gateX, gateTopY, gateW, gateClosedH)

    // 闸门开启部分的水流
    if (gateOpenPercent > 0) {
      const flowRatio = Math.min(downstreamFlow / (downstreamSafeThreshold * 2), 1)
      const downstreamColor = flowRatio < 0.5
        ? 'rgba(30,100,200,0.7)'
        : flowRatio < 0.8
          ? 'rgba(220,160,30,0.7)'
          : 'rgba(210,50,40,0.7)'

      const flowH = waterH * (gateOpenPercent / 100)
      const flowY = waterTop + waterH - flowH

      ctx.fillStyle = downstreamColor
      ctx.fillRect(gateX + gateW, flowY, W - gateX - gateW, flowH)

      // 下游波浪
      ctx.beginPath()
      ctx.moveTo(gateX + gateW, flowY)
      for (let x = gateX + gateW; x <= W; x += 2) {
        const wave = Math.sin(x * 0.04 + t * 2.5) * 3 + Math.sin(x * 0.09 + t * 1.8) * 1.5
        ctx.lineTo(x, flowY + wave)
      }
      ctx.lineTo(W, flowY + flowH)
      ctx.lineTo(gateX + gateW, flowY + flowH)
      ctx.closePath()
      ctx.fillStyle = downstreamColor
      ctx.fill()
    }

    // 下游危险区域着色
    const riskRatio = downstreamSafeThreshold > 0 ? downstreamFlow / downstreamSafeThreshold : 0
    if (riskRatio > 1) {
      ctx.fillStyle = `rgba(210,50,40,${Math.min((riskRatio - 1) * 0.3, 0.35)})`
      ctx.fillRect(gateX + gateW, H - bankH, W - gateX - gateW, bankH)
    } else if (riskRatio > 0.7) {
      ctx.fillStyle = `rgba(220,160,30,${(riskRatio - 0.7) * 0.4})`
      ctx.fillRect(gateX + gateW, H - bankH, W - gateX - gateW, bankH)
    }

    // 下游房屋
    const houseY = H - bankH - 22
    const houseCount = 4
    const startX = gateX + gateW + (W - gateX - gateW) * 0.3
    const spacing = (W - gateX - gateW) * 0.4 / houseCount
    for (let i = 0; i < houseCount; i++) {
      drawHouse(ctx, startX + i * spacing, houseY, 16, 20)
    }

    // 上游水库标签
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`水库 ${Math.round(ratio * 100)}%`, gateX / 2, waterTop + 20)
    ctx.font = '11px sans-serif'
    ctx.fillText(`水位 ${upstreamLevel.toFixed(1)} / ${reservoirCapacity}`, gateX / 2, waterTop + 36)

    // 闸门标签
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText(`闸门 ${gateOpenPercent}%`, gateX + gateW / 2, waterTop - 12)

    // 下游标签
    const dsLabelX = gateX + gateW + (W - gateX - gateW) / 2
    const dsRisk = riskRatio > 1 ? '危险' : riskRatio > 0.7 ? '警告' : '安全'
    ctx.fillStyle = riskRatio > 1 ? '#ff4444' : riskRatio > 0.7 ? '#ddaa22' : '#44cc44'
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText(`下游 ${dsRisk}`, dsLabelX, H - bankH + 18)
    ctx.fillStyle = '#fff'
    ctx.font = '11px sans-serif'
    ctx.fillText(`流量 ${Math.round(downstreamFlow)} / 阈值 ${downstreamSafeThreshold}`, dsLabelX, H - bankH + 34)
  }, [upstreamLevel, reservoirCapacity, gateOpenPercent, downstreamFlow, downstreamSafeThreshold])

  useEffect(() => {
    const loop = () => {
      timeRef.current += 0.016
      draw()
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
