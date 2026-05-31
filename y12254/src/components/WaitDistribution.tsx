import { useRef, useEffect } from 'react'

interface Props {
  distribution: number[]
}

export default function WaitDistribution({ distribution }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || distribution.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 20, right: 20, bottom: 40, left: 40 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    ctx.clearRect(0, 0, width, height)

    const maxVal = Math.max(...distribution, 1)
    const barWidth = chartW / distribution.length

    ctx.fillStyle = '#FFF8F0'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#C8956C33'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    distribution.forEach((val, i) => {
      const barH = (val / maxVal) * chartH
      const x = padding.left + i * barWidth + barWidth * 0.1
      const y = padding.top + chartH - barH
      const w = barWidth * 0.8

      const gradient = ctx.createLinearGradient(x, y, x, y + barH)
      gradient.addColorStop(0, '#C8956C')
      gradient.addColorStop(1, '#FFD09A')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.roundRect(x, y, w, barH, [4, 4, 0, 0])
      ctx.fill()

      ctx.fillStyle = '#5D3A1A'
      ctx.font = '10px "Noto Sans SC"'
      ctx.textAlign = 'center'
      if (val > 0) {
        ctx.fillText(String(val), x + w / 2, y - 4)
      }

      ctx.fillStyle = '#8B5E3C'
      ctx.fillText(`${i + 1}`, x + w / 2, padding.top + chartH + 16)
    })

    ctx.fillStyle = '#5D3A1A'
    ctx.font = '11px "Noto Sans SC"'
    ctx.textAlign = 'center'
    ctx.fillText('等待时间区间', width / 2, height - 4)

    ctx.save()
    ctx.translate(12, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('人数', 0, 0)
    ctx.restore()
  }, [distribution])

  return (
    <div className="card">
      <h3 className="font-bold text-milk-700 text-sm mb-2">📊 等待时间分布</h3>
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: 220 }}
      />
    </div>
  )
}
