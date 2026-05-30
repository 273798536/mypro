import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { ReasoningNode as ReasoningNodeType, NodeStatus } from '@/data/scenarios'

const statusStyles: Record<NodeStatus, { bg: string; border: string; text: string; pulse: boolean }> = {
  unexplored: { bg: 'bg-ink-800', border: 'border-ink-400', text: 'text-ink-400', pulse: false },
  confirmed: { bg: 'bg-success/20', border: 'border-success', text: 'text-success-light', pulse: true },
  conflict: { bg: 'bg-danger/20', border: 'border-danger', text: 'text-danger-light', pulse: true },
}

interface ReasoningChainProps {
  nodes: ReasoningNodeType[]
}

export default function ReasoningChain({ nodes }: ReasoningChainProps) {
  const prevStatusRef = useRef<Record<string, NodeStatus>>({})

  useEffect(() => {
    const current: Record<string, NodeStatus> = {}
    nodes.forEach((n) => { current[n.id] = n.status })
    prevStatusRef.current = current
  }, [nodes])

  function shouldPulse(node: ReasoningNodeType): boolean {
    const style = statusStyles[node.status]
    if (!style.pulse) return false
    return prevStatusRef.current[node.id] !== node.status
  }

  return (
    <div className="overflow-x-auto scrollbar-thin py-2">
      <div className="flex items-center gap-0 min-w-max px-2">
        {nodes.map((node, i) => {
          const style = statusStyles[node.status]
          const pulsing = shouldPulse(node)

          return (
            <div key={node.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-serif font-semibold whitespace-nowrap transition-all duration-300',
                    style.bg,
                    style.border,
                    style.text,
                    pulsing && 'animate-pulse-glow'
                  )}
                >
                  {node.label}
                </div>
                {node.detail && (
                  <span className="text-[10px] text-ink-300 max-w-[80px] text-center leading-tight truncate">
                    {node.detail}
                  </span>
                )}
              </div>
              {i < nodes.length - 1 && (
                <div className="flex items-center mx-1.5">
                  {node.connectedTo.includes(nodes[i + 1]?.id) ? (
                    <div className="w-6 h-px bg-ink-500" />
                  ) : (
                    <div className="w-6 h-px bg-ink-700 opacity-30" />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
