import { useState } from 'react'
import { Target, TrendingUp, AlignHorizontalDistributeCenter, Database, ChevronDown } from 'lucide-react'
import type { TraceLink } from '@/types'

interface TraceNode {
  key: string
  label: string
  icon: React.ElementType
  summary: (link: TraceLink) => string
  detail: (link: TraceLink) => React.ReactNode
}

const nodes: TraceNode[] = [
  {
    key: 'result',
    label: '结果',
    icon: Target,
    summary: (link) => `ID: ${link.resultId}`,
    detail: (link) => (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">结果 ID</span>
          <span className="font-mono text-signal">{link.resultId}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">关联冲突</span>
          <span className="font-mono text-signal">{link.conflicts.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">关联照片</span>
          <span className="font-mono text-signal">{link.damageAssociation.length}</span>
        </div>
      </div>
    ),
  },
  {
    key: 'peak',
    label: '峰值提取',
    icon: TrendingUp,
    summary: (link) => `${link.peakExtraction.channel} ${link.peakExtraction.value.toFixed(2)}`,
    detail: (link) => (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">通道</span>
          <span className="font-mono text-signal">{link.peakExtraction.channel}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">峰值</span>
          <span className="font-mono text-signal">{link.peakExtraction.value.toFixed(4)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">时间戳</span>
          <span className="font-mono text-signal">{new Date(link.peakExtraction.timestamp).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">饱和</span>
          <span className={`font-mono ${link.peakExtraction.saturated ? 'text-saturated' : 'text-signal'}`}>
            {link.peakExtraction.saturated ? '是' : '否'}
          </span>
        </div>
      </div>
    ),
  },
  {
    key: 'alignment',
    label: '时序对齐',
    icon: AlignHorizontalDistributeCenter,
    summary: (link) => `漂移 ${link.alignment.driftMs}ms (${link.alignment.method})`,
    detail: (link) => (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">方法</span>
          <span className="font-mono text-signal">{link.alignment.method === 'auto' ? '自动' : '手动'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">漂移</span>
          <span className={`font-mono ${Math.abs(link.alignment.driftMs) > 50 ? 'text-warn' : 'text-signal'}`}>
            {link.alignment.driftMs} ms
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">加速度偏移</span>
          <span className="font-mono text-signal">{link.alignment.accelOffset} ms</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">位移偏移</span>
          <span className="font-mono text-signal">{link.alignment.dispOffset} ms</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">照片偏移</span>
          <span className="font-mono text-signal">{link.alignment.photoOffset} ms</span>
        </div>
      </div>
    ),
  },
  {
    key: 'origin',
    label: '原始数据',
    icon: Database,
    summary: () => '传感器原始采集',
    detail: (link) => (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">峰值提取 ID</span>
          <span className="font-mono text-signal">{link.peakExtraction.id}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">对齐 ID</span>
          <span className="font-mono text-signal">{link.alignment.id}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-steel-500">创建时间</span>
          <span className="font-mono text-signal">{new Date(link.alignment.createdAt).toLocaleString()}</span>
        </div>
      </div>
    ),
  },
]

export default function TraceLinkDiagram({ traceLink }: { traceLink: TraceLink }) {
  const [activeNode, setActiveNode] = useState<string | null>(null)

  const toggleNode = (key: string) => {
    setActiveNode((prev) => (prev === key ? null : key))
  }

  return (
    <div className="rounded-lg border border-steel-700 bg-steel-900 p-4">
      <div className="flex items-center justify-between gap-2">
        {nodes.map((node, index) => {
          const Icon = node.icon
          const isActive = activeNode === node.key
          return (
            <div key={node.key} className="flex items-center gap-2">
              <button
                onClick={() => toggleNode(node.key)}
                className={`flex flex-col items-center gap-2 rounded-lg border px-4 py-3 transition-all min-w-[120px] cursor-pointer ${
                  isActive
                    ? 'border-signal bg-steel-800 shadow-[0_0_12px_rgba(61,220,132,0.15)]'
                    : 'border-steel-600 bg-steel-800 hover:border-steel-500'
                }`}
              >
                <Icon
                  size={20}
                  className={isActive ? 'text-signal' : 'text-steel-600'}
                />
                <span
                  className={`text-xs font-medium tracking-wide ${
                    isActive ? 'text-signal' : 'text-steel-600'
                  }`}
                >
                  {node.label}
                </span>
                <span
                  className={`text-[10px] font-mono truncate max-w-[100px] ${
                    isActive ? 'text-signal/80' : 'text-steel-500'
                  }`}
                >
                  {node.summary(traceLink)}
                </span>
              </button>
              {index < nodes.length - 1 && (
                <div className="flex items-center">
                  <div
                    className={`w-6 h-px ${
                      activeNode !== null ? 'bg-signal/50' : 'bg-steel-600'
                    }`}
                  />
                  <svg
                    className={activeNode !== null ? 'text-signal/50' : 'text-steel-600'}
                    width="8"
                    height="8"
                    viewBox="0 0 8 8"
                    fill="currentColor"
                  >
                    <path d="M0 0 L8 4 L0 8 Z" />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {activeNode !== null && (
        <div className="mt-4 rounded-lg border border-steel-700 bg-steel-800 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {(() => {
                const node = nodes.find((n) => n.key === activeNode)!
                const Icon = node.icon
                return <Icon size={16} className="text-signal" />
              })()}
              <span className="text-sm font-medium text-signal">
                {nodes.find((n) => n.key === activeNode)!.label}
              </span>
            </div>
            <button
              onClick={() => setActiveNode(null)}
              className="text-steel-500 hover:text-steel-300 transition-colors"
            >
              <ChevronDown size={16} className="rotate-180" />
            </button>
          </div>
          {nodes.find((n) => n.key === activeNode)!.detail(traceLink)}
        </div>
      )}
    </div>
  )
}
