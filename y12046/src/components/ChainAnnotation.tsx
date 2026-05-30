import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'
import type { ReasoningNode, NodeStatus } from '@/data/scenarios'

const statusColors: Record<NodeStatus, string> = {
  confirmed: 'bg-success border-success text-success',
  conflict: 'bg-danger border-danger text-danger',
  unexplored: 'bg-ink-500 border-ink-400 text-ink-300',
}

const statusGlow: Record<NodeStatus, string> = {
  confirmed: '',
  conflict: 'shadow-[0_0_10px_#ef444460]',
  unexplored: '',
}

interface ChainAnnotationProps {
  playerChain: ReasoningNode[]
  correctChain: ReasoningNode[]
}

function ChainRow({ label, chain, isPlayer }: { label: string; chain: ReasoningNode[]; isPlayer: boolean }) {
  return (
    <div>
      <h4 className={cn(
        'text-xs font-serif mb-2',
        isPlayer ? 'text-amber' : 'text-success-light'
      )}>
        {label}
      </h4>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {chain.map((node, index) => {
          const displayStatus: NodeStatus = isPlayer ? node.status : 'confirmed'
          const isDiff = isPlayer && node.status !== 'confirmed'
          return (
            <div key={node.id} className="flex items-center gap-1 shrink-0">
              <div
                className={cn(
                  'flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-serif transition-all',
                  statusColors[displayStatus],
                  isDiff && statusGlow[node.status],
                  isDiff && 'animate-pulse-glow'
                )}
                title={node.detail || node.label}
              >
                <span className={cn(
                  node.status === 'confirmed' && !isPlayer ? 'text-ink-900' : ''
                )}>
                  {node.label}
                </span>
              </div>
              {index < chain.length - 1 && (
                <ArrowRight className="h-3 w-3 text-ink-500 shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ChainAnnotation({ playerChain, correctChain }: ChainAnnotationProps) {
  if (playerChain.length === 0 && correctChain.length === 0) {
    return (
      <div className="py-8 text-center text-ink-300 font-serif">
        暂无推理链数据
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ChainRow label="你的推理链" chain={playerChain} isPlayer />
      <div className="border-t border-ink-600" />
      <ChainRow label="正确推理链" chain={correctChain} isPlayer={false} />
    </div>
  )
}
