import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as d3 from 'd3'
import { useStore } from '@/store'
import type { GraphNode, GraphEdge } from '@/types'
import { GitBranch, X, Eye, EyeOff, AlertTriangle, AlertCircle, FileWarning, ArrowRight } from 'lucide-react'

const PALETTE = ['#00d4aa', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

interface SimNode extends GraphNode {
  index?: number
  fx?: number | null
  fy?: number | null
  vx?: number
  vy?: number
}

interface SimEdge {
  source: SimNode | string
  target: SimNode | string
  weight: number
  index?: number
}

export default function GraphPage() {
  const navigate = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const graphNodes = useStore((s) => s.graphNodes)
  const graphEdges = useStore((s) => s.graphEdges)
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const showQualityOverlay = useStore((s) => s.showQualityOverlay)
  const qualityReport = useStore((s) => s.qualityReport)
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId)
  const setShowQualityOverlay = useStore((s) => s.setShowQualityOverlay)

  const hasData = graphNodes.length > 0

  const degreeMap = useCallback(() => {
    const deg = new Map<string, number>()
    for (const n of graphNodes) deg.set(n.id, 0)
    for (const e of graphEdges) {
      deg.set(e.source, (deg.get(e.source) ?? 0) + 1)
      deg.set(e.target, (deg.get(e.target) ?? 0) + 1)
    }
    return deg
  }, [graphNodes, graphEdges])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setDimensions({ width, height })
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!hasData || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const deg = degreeMap()
    const maxDeg = Math.max(1, ...deg.values())

    const simNodes: SimNode[] = graphNodes.map((n) => ({
      ...n,
      x: dimensions.width / 2 + (Math.random() - 0.5) * 200,
      y: dimensions.height / 2 + (Math.random() - 0.5) * 200,
    }))

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]))
    const simEdges: SimEdge[] = graphEdges
      .map((e) => ({ ...e, source: e.source, target: e.target }))
      .filter((e) => nodeMap.has(e.source as string) && nodeMap.has(e.target as string))

    const communityColorMap = new Map<string, string>()
    let ci = 0
    for (const n of simNodes) {
      if (!communityColorMap.has(n.community)) {
        communityColorMap.set(n.community, PALETTE[ci % PALETTE.length])
        ci++
      }
    }

    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    const linkSel = g.append('g').selectAll('line').data(simEdges).join('line')
      .attr('stroke', '#4a5580')
      .attr('stroke-opacity', (d) => Math.max(0.1, Math.min(0.8, d.weight)))
      .attr('stroke-width', 1)

    const nodeSel = g.append('g').selectAll('circle').data(simNodes).join('circle')
      .attr('r', (d) => 5 + ((deg.get(d.id) ?? 0) / maxDeg) * 10)
      .attr('fill', (d) => communityColorMap.get(d.community) ?? '#888')
      .attr('stroke', '#1a1f36')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => setSelectedNodeId(d.id === selectedNodeId ? null : d.id))

    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force('link', d3.forceLink<SimNode, SimEdge>(simEdges).id((d) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collide', d3.forceCollide<SimNode>().radius((d) => 5 + ((deg.get(d.id) ?? 0) / maxDeg) * 10 + 4))
      .on('tick', () => {
        linkSel
          .attr('x1', (d) => (d.source as SimNode).x!)
          .attr('y1', (d) => (d.source as SimNode).y!)
          .attr('x2', (d) => (d.target as SimNode).x!)
          .attr('y2', (d) => (d.target as SimNode).y!)
        nodeSel.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!)
      })

    const drag = d3.drag<SVGCircleElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })
    nodeSel.call(drag)

    return () => {
      simulation.stop()
    }
  }, [graphNodes, graphEdges, dimensions, hasData, degreeMap, selectedNodeId, setSelectedNodeId])

  useEffect(() => {
    if (!svgRef.current || !hasData) return
    const svg = d3.select(svgRef.current)
    const g = svg.select('g')
    if (g.empty()) return

    const deg = degreeMap()
    const maxDeg = Math.max(1, ...deg.values())

    const isolatedSet = new Set(qualityReport?.isolatedNodes ?? [])
    const noiseSet = new Set(qualityReport?.noiseNodes ?? [])
    const missingTagSet = new Set(qualityReport?.missingTagNodes ?? [])

    g.selectAll('.quality-overlay').remove()

    if (!showQualityOverlay) {
      g.selectAll('circle')
        .attr('stroke', selectedNodeId ? '#fff' : '#1a1f36')
        .attr('stroke-width', (d: SimNode) => d.id === selectedNodeId ? 3 : 1.5)
      return
    }

    const overlayG = g.append('g').attr('class', 'quality-overlay')

    const simNodes = g.selectAll<SVGCircleElement, SimNode>('circle').data()

    for (const n of simNodes) {
      const r = 5 + ((deg.get(n.id) ?? 0) / maxDeg) * 10
      if (isolatedSet.has(n.id)) {
        overlayG.append('circle')
          .attr('cx', n.x).attr('cy', n.y).attr('r', r + 4)
          .attr('fill', 'none').attr('stroke', '#ef4444').attr('stroke-width', 2.5)
          .attr('class', 'animate-pulse-danger')
      }
      if (noiseSet.has(n.id)) {
        overlayG.append('circle')
          .attr('cx', n.x).attr('cy', n.y).attr('r', r + 3)
          .attr('fill', 'none').attr('stroke', '#f59e0b').attr('stroke-width', 2)
      }
      if (missingTagSet.has(n.id)) {
        overlayG.append('circle')
          .attr('cx', n.x).attr('cy', n.y).attr('r', r + 3)
          .attr('fill', 'none').attr('stroke', '#8b95b0').attr('stroke-width', 2)
          .attr('stroke-dasharray', '3,3')
      }
    }

    g.selectAll<SVGCircleElement, SimNode>('circle')
      .attr('stroke', (d) => d.id === selectedNodeId ? '#fff' : '#1a1f36')
      .attr('stroke-width', (d) => d.id === selectedNodeId ? 3 : 1.5)
  }, [showQualityOverlay, qualityReport, selectedNodeId, hasData, graphNodes, degreeMap])

  const selectedNode = graphNodes.find((n) => n.id === selectedNodeId)

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4">
        <GitBranch className="w-12 h-12 text-muted" />
        <p className="text-muted text-lg">请先执行聚类分析</p>
        <button
          onClick={() => navigate('/cluster')}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-bg rounded-lg hover:bg-accent-dim transition-colors"
        >
          前往聚类 <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">可视化图</h1>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-sm text-muted">质量标注叠层</span>
          <button
            onClick={() => setShowQualityOverlay(!showQualityOverlay)}
            className={`relative w-10 h-5 rounded-full transition-colors ${showQualityOverlay ? 'bg-accent' : 'bg-bg-hover'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showQualityOverlay ? 'translate-x-5' : ''}`} />
          </button>
          {showQualityOverlay ? <Eye className="w-4 h-4 text-accent" /> : <EyeOff className="w-4 h-4 text-muted" />}
        </label>
      </div>

      <div ref={containerRef} className="relative bg-bg rounded-xl w-full" style={{ height: 'calc(100vh - 160px)' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full"
        />

        {selectedNode && (
          <div className="absolute right-4 top-4 w-72 bg-bg-card rounded-xl p-4 animate-fade-in border border-border-dim">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm truncate">{selectedNode.id}</h3>
              <button onClick={() => setSelectedNodeId(null)} className="text-muted hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted">所属社群</span>
                <p className="font-medium">{selectedNode.community}</p>
              </div>

              <div>
                <span className="text-muted">标签</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedNode.tags.length > 0
                    ? selectedNode.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 bg-bg-hover rounded text-xs">{t}</span>
                      ))
                    : <span className="text-muted text-xs">无标签</span>}
                </div>
              </div>

              <div>
                <span className="text-muted">活动记录</span>
                <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                  {selectedNode.activities.map((a, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{a.activityType}</span>
                      <span className="text-muted">{new Date(a.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {selectedNode.activities.length === 0 && <span className="text-muted text-xs">无记录</span>}
                </div>
              </div>

              {selectedNode.anomalies.length > 0 && (
                <div>
                  <span className="text-muted">异常标记</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedNode.anomalies.map((a, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                          a.type === 'isolated' ? 'bg-danger/20 text-danger' :
                          a.type === 'noise' ? 'bg-warn/20 text-warn' :
                          'bg-muted/20 text-muted'
                        }`}
                      >
                        {a.type === 'isolated' && <AlertCircle className="w-3 h-3" />}
                        {a.type === 'noise' && <AlertTriangle className="w-3 h-3" />}
                        {a.type === 'missing_tag' && <FileWarning className="w-3 h-3" />}
                        {a.type === 'isolated' ? '孤立' : a.type === 'noise' ? '噪声' : '缺标签'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
