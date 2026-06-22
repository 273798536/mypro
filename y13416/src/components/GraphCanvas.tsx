import { useRef, useEffect, useCallback } from 'react'
import type { GraphNode, GraphEdge } from '@/types'

interface GraphCanvasProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  cutVertices: string[]
  onNodeDrag: (id: string, x: number, y: number) => void
  onNodeClick?: (id: string) => void
  selectedNode?: string | null
  width?: number
  height?: number
}

export default function GraphCanvas({
  nodes, edges, cutVertices, onNodeDrag, onNodeClick, selectedNode,
  width = 600, height = 450,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#0f0f1a'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#1e3a5f'
    ctx.lineWidth = 0.5
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke()
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
    }

    edges.forEach(edge => {
      const src = nodes.find(n => n.id === edge.source)
      const tgt = nodes.find(n => n.id === edge.target)
      if (!src || !tgt) return

      ctx.beginPath()
      ctx.moveTo(src.x, src.y)
      ctx.lineTo(tgt.x, tgt.y)
      ctx.strokeStyle = '#3a4a6a'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })

    nodes.forEach(node => {
      const isCut = cutVertices.includes(node.id)
      const isSelected = selectedNode === node.id
      const radius = isCut ? 22 : 18

      if (isSelected) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2)
        ctx.strokeStyle = '#00d4aa'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      if (isCut) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius + 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 60, 60, 0.15)'
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      const gradient = ctx.createRadialGradient(node.x - 4, node.y - 4, 2, node.x, node.y, radius)
      if (isCut) {
        gradient.addColorStop(0, '#ff6b6b')
        gradient.addColorStop(1, '#c0392b')
      } else {
        gradient.addColorStop(0, '#4a9eff')
        gradient.addColorStop(1, '#2563eb')
      }
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.strokeStyle = isCut ? '#ff4444' : '#60a5fa'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 13px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.label || node.id, node.x, node.y)

      if (isCut) {
        ctx.fillStyle = '#f0a500'
        ctx.font = '10px "JetBrains Mono", monospace'
        ctx.fillText('CUT', node.x, node.y + radius + 12)
      }
    })

    ctx.fillStyle = '#64748b'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`${nodes.length} 节点 · ${edges.length} 边 · ${cutVertices.length} 割点`, 12, height - 24)
  }, [nodes, edges, cutVertices, selectedNode, width, height])

  useEffect(() => {
    draw()
  }, [draw])

  const getCanvasPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const findNode = (x: number, y: number) => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      const dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2)
      if (dist <= 22) return n
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e)
    const node = findNode(pos.x, pos.y)
    if (node) {
      dragRef.current = { nodeId: node.id, offsetX: pos.x - node.x, offsetY: pos.y - node.y }
      onNodeClick?.(node.id)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return
    const pos = getCanvasPos(e)
    onNodeDrag(
      dragRef.current.nodeId,
      Math.max(20, Math.min(width - 20, pos.x - dragRef.current.offsetX)),
      Math.max(20, Math.min(height - 20, pos.y - dragRef.current.offsetY))
    )
  }

  const handleMouseUp = () => {
    dragRef.current = null
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, cursor: dragRef.current ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="rounded-lg border border-slate-700/50"
    />
  )
}
