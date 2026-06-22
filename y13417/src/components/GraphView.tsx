import { useStore } from '../store'
import type { GraphData } from '../types'

function GraphCanvas({ graph, cutVertices }: { graph: GraphData; cutVertices: string[] }) {
  const nodeMap = new Map(graph.nodes.map(n => [n.id, n]))
  const nodeW = 36
  const nodeH = 28

  return (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      {graph.edges.map((edge, i) => {
        const from = nodeMap.get(edge.from)
        const to = nodeMap.get(edge.to)
        if (!from || !to) return null
        return (
          <line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#52525b"
            strokeWidth={1.5}
          />
        )
      })}
      {graph.nodes.map(node => {
        const isCut = cutVertices.includes(node.id)
        const missingUnit = node.unit === undefined
        return (
          <g key={node.id}>
            <rect
              x={node.x - nodeW / 2}
              y={node.y - nodeH / 2}
              width={nodeW}
              height={nodeH}
              rx={6}
              fill={isCut ? '#f59e0b' : missingUnit ? '#7f1d1d' : '#27272a'}
              stroke={isCut ? '#fbbf24' : missingUnit ? '#ef4444' : '#52525b'}
              strokeWidth={isCut ? 2 : 1}
            />
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isCut ? '#1a1a2e' : missingUnit ? '#fca5a5' : '#e4e4e7'}
              fontSize={12}
              fontWeight={isCut ? 700 : 400}
              fontFamily="Source Code Pro, monospace"
            >
              {node.label}
            </text>
            {missingUnit && (
              <text
                x={node.x + nodeW / 2 + 2}
                y={node.y - nodeH / 2}
                fill="#ef4444"
                fontSize={8}
                fontFamily="Source Code Pro, monospace"
              >
                ⚠
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function GraphView() {
  const { problems, selectedProblemId, calcSteps } = useStore()
  const problem = problems.find(p => p.id === selectedProblemId)

  if (!problem) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
        请从左侧选择一道题目
      </div>
    )
  }

  const cutVertices = [...new Set(
    calcSteps
      .filter(s => s.problemId === problem.id && s.isCutCandidate)
      .map(s => s.currentNode)
  )]

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 border-b border-zinc-800">
        <h3 className="text-xs font-bold text-zinc-300 tracking-wider uppercase">图结构</h3>
      </div>
      <div className="flex-1 p-3 min-h-0">
        <GraphCanvas graph={problem.graph} cutVertices={cutVertices} />
      </div>
      <div className="px-4 py-2 border-t border-zinc-800 flex flex-wrap gap-3 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-amber-500 border border-amber-400" />
          <span className="text-zinc-400">割点</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-zinc-800 border border-zinc-600" />
          <span className="text-zinc-400">普通节点</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-red-900 border border-red-500" />
          <span className="text-zinc-400">缺单位</span>
        </div>
      </div>
    </div>
  )
}
