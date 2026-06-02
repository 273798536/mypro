import { useState } from 'react'
import { ChevronRight, ChevronDown, ArrowDown, ArrowUp } from 'lucide-react'
import { useBayesianStore } from '@/store/bayesianStore'
import type { TraceNode } from '@/types'
import { cn } from '@/lib/utils'

function TraceTreeNode({ node, depth = 0 }: { node: TraceNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2)

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 rounded text-xs cursor-pointer hover:bg-zinc-800/50 transition-colors",
          depth === 0 && "font-medium"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {node.children.length > 0 && (
          expanded ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />
        )}
        {node.children.length === 0 && <span className="w-3" />}

        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px]",
          node.type === 'alarm' ? "bg-amber-500/15 text-amber-400" :
          node.type === 'maintenance' ? "bg-emerald-500/15 text-emerald-400" :
          node.type === 'report' ? "bg-sky-500/15 text-sky-400" :
          "bg-purple-500/15 text-purple-400"
        )}>
          {node.type === 'alarm' ? '报警' : node.type === 'maintenance' ? '维修' : node.type === 'report' ? '报告' : '结果'}
        </span>

        <span className="text-zinc-300">{node.label}</span>

        {node.sensorSerial && (
          <span className="text-zinc-500 font-mono text-[10px]">SN: {node.sensorSerial}</span>
        )}

        {node.timestamp && (
          <span className="text-zinc-600 font-mono text-[10px]">
            {new Date(node.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child, idx) => (
            <TraceTreeNode key={`${child.id}-${idx}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TraceLinkView() {
  const traceLinks = useBayesianStore(s => s.traceLinks)
  const [mode, setMode] = useState<'forward' | 'backward'>('forward')
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)

  if (traceLinks.length === 0) {
    return (
      <div className="text-center text-zinc-500 text-sm py-8">
        暂无追溯数据，请先录入证据
      </div>
    )
  }

  const selected = traceLinks.find(l => {
    const firstForward = l.forwardPath[0]
    return firstForward?.id === selectedComponent
  }) ?? traceLinks[0]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode('forward')}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded text-xs transition-colors",
            mode === 'forward'
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-zinc-800/40 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800/60"
          )}
        >
          <ArrowDown size={12} /> 正向: 报警→结果
        </button>
        <button
          onClick={() => setMode('backward')}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded text-xs transition-colors",
            mode === 'backward'
              ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
              : "bg-zinc-800/40 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800/60"
          )}
        >
          <ArrowUp size={12} /> 反向: 结果→传感器
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {traceLinks.map(link => {
          const node = link.forwardPath[0]
          return (
            <button
              key={node.id}
              onClick={() => setSelectedComponent(node.id)}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                (selectedComponent ?? traceLinks[0]?.forwardPath[0]?.id) === node.id
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-zinc-800/40 text-zinc-400 border border-zinc-700/30 hover:bg-zinc-800/60"
              )}
            >
              {node.label}
            </button>
          )
        })}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-700/30 rounded p-2 max-h-64 overflow-y-auto">
        {(mode === 'forward' ? selected.forwardPath : selected.backwardPath).map((node, idx) => (
          <TraceTreeNode key={`${node.id}-${idx}`} node={node} />
        ))}
      </div>
    </div>
  )
}
