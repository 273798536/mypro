import { useState } from 'react'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/useToast'
import type { ObjectOverlap } from '@/types'
import {
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Play,
  Square,
  ListChecks,
  RefreshCw,
  Layers,
  MapPin,
  Loader2,
} from 'lucide-react'

const severityConfig = {
  critical: {
    label: '严重',
    color: 'bg-red-500',
    textColor: 'text-red-600',
    bgLight: 'bg-red-50',
    border: 'border-red-200',
    Icon: AlertOctagon,
  },
  warning: {
    label: '警告',
    color: 'bg-warn-500',
    textColor: 'text-warn-600',
    bgLight: 'bg-orange-50',
    border: 'border-warn-300',
    Icon: AlertTriangle,
  },
  minor: {
    label: '轻微',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    bgLight: 'bg-yellow-50',
    border: 'border-yellow-200',
    Icon: AlertCircle,
  },
}

const statusConfig = {
  pending: { label: '待处理', Icon: Clock, className: 'tag-gray' },
  processing: { label: '处理中', Icon: Play, className: 'tag-warn' },
  resolved: { label: '已处理', Icon: CheckCircle2, className: 'tag-success' },
}

export default function OverlapPanel() {
  const { overlaps, toggleStepCompleted, setOverlapStatus, reDetectOverlaps, isDetectingOverlap } = useAppStore()
  const toast = useToast()
  const [expandedId, setExpandedId] = useState<string | null>('ov-2')

  const getProgress = (ov: ObjectOverlap) => {
    const done = ov.steps.filter((s) => s.completed).length
    return { done, total: ov.steps.length, pct: Math.round((done / ov.steps.length) * 100) }
  }

  const handleReDetect = async () => {
    toast.info('正在重新检测图层对象重叠...')
    try {
      const result = await reDetectOverlaps()
      toast.success(
        `检测完成：AABB 碰撞检测发现 ${result.detected} 组空间重叠，新增 ${result.newAdded} 项（共 ${result.total} 项，待处理 ${result.newCount}，已处理 ${result.resolvedCount}）。` +
        '请优先处理严重级别重叠，完整检测报告已输出到控制台。',
        6000,
      )
    } catch {
      toast.error('重叠检测失败，请检查图层文件是否可访问。')
    }
  }

  return (
    <div className="p-6 space-y-6 min-w-[1200px]">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-engineer-800">对象重叠处理</h1>
          <p className="text-sm text-engineer-500 mt-1">
            每条问题给出可执行步骤指引，人可直接照着处理
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReDetect}
            disabled={isDetectingOverlap}
            className="btn-eng btn-ghost disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDetectingOverlap ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 inline animate-spin" />
                检测中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1.5 inline" />
                重新检测重叠
              </>
            )}
          </button>
          <span className="tag tag-gray">
            共 {overlaps.length} 项 · 已处理 {overlaps.filter((o) => o.status === 'resolved').length}
          </span>
        </div>
      </header>

      {/* 统计摘要 */}
      <div className="grid grid-cols-3 gap-4">
        {(['critical', 'warning', 'minor'] as const).map((sev) => {
          const cfg = severityConfig[sev]
          const items = overlaps.filter((o) => o.severity === sev)
          const resolved = items.filter((o) => o.status === 'resolved').length
          const { Icon } = cfg
          return (
            <div key={sev} className={`rounded border ${cfg.border} ${cfg.bgLight} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${cfg.color}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-engineer-800">{cfg.label}</div>
                    <div className="text-[11px] text-engineer-500">{items.length} 项</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-mono font-semibold text-engineer-800">
                    {resolved}/{items.length}
                  </div>
                  <div className="text-[11px] text-engineer-500">已处理</div>
                </div>
              </div>
              <div className="h-1.5 bg-white rounded-full overflow-hidden border border-white/60">
                <div
                  className={`h-full ${cfg.color} transition-all`}
                  style={{ width: `${items.length ? (resolved / items.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* 重叠列表 */}
      <div className="space-y-3">
        {overlaps.map((ov) => {
          const cfg = severityConfig[ov.severity]
          const stCfg = statusConfig[ov.status]
          const { Icon: SevIcon } = cfg
          const { Icon: StIcon } = stCfg
          const progress = getProgress(ov)
          const isExpanded = expandedId === ov.id

          return (
            <div
              key={ov.id}
              className={`rounded border bg-white card-shadow overflow-hidden transition-all ${
                isExpanded ? cfg.border : 'border-engineer-200'
              }`}
            >
              {/* 标题行 */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : ov.id)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-engineer-50/50 transition-colors"
              >
                <div className={`w-9 h-9 rounded flex items-center justify-center ${cfg.color}`}>
                  <SevIcon className="w-4 h-4 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-engineer-800">
                      {ov.objectA}
                    </span>
                    <span className="text-engineer-400">⟷</span>
                    <span className="text-sm font-medium text-engineer-800">
                      {ov.objectB}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-engineer-500">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {ov.layerA} × {ov.layerB}
                    </span>
                    <span className="flex items-center gap-1">
                      <ListChecks className="w-3 h-3" />
                      步骤 {progress.done}/{progress.total}
                    </span>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="w-40">
                  <div className="flex items-center justify-between text-[11px] text-engineer-500 mb-1">
                    <span>处理进度</span>
                    <span className="font-mono">{progress.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-engineer-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${ov.status === 'resolved' ? 'bg-success-500' : cfg.color} transition-all`}
                      style={{ width: `${progress.pct}%` }}
                    />
                  </div>
                </div>

                <span className={`tag ${stCfg.className}`}>
                  <StIcon className="w-3 h-3 mr-1" />
                  {stCfg.label}
                </span>

                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-engineer-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-engineer-400" />
                )}
              </button>

              {/* 展开内容 */}
              {isExpanded && (
                <div className="border-t border-engineer-100">
                  <div className={`px-5 py-4 ${cfg.bgLight} border-b border-engineer-100`}>
                    <div className="text-xs font-medium text-engineer-700 mb-1">
                      问题描述
                    </div>
                    <p className="text-sm text-engineer-800">
                      对象 <span className="font-mono font-medium">{ov.objectA}</span>（图层 {ov.layerA}）与{' '}
                      <span className="font-mono font-medium">{ov.objectB}</span>（图层 {ov.layerB}）存在空间重叠，
                      严重等级为「{cfg.label}」。
                    </p>
                  </div>

                  {/* 可执行步骤指引 */}
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ListChecks className={`w-4 h-4 ${cfg.textColor}`} />
                        <span className="text-sm font-medium text-engineer-800">可执行处理指引</span>
                        <span className="text-[11px] text-engineer-500">
                          照着下面一步步做就行
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ov.status !== 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOverlapStatus(ov.id, 'pending')
                            }}
                            className="btn-eng btn-ghost text-xs py-1.5 px-3"
                          >
                            <Square className="w-3 h-3 mr-1 inline" />
                            标记待处理
                          </button>
                        )}
                        {ov.status !== 'processing' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOverlapStatus(ov.id, 'processing')
                            }}
                            className="btn-eng btn-ghost text-xs py-1.5 px-3"
                          >
                            <Play className="w-3 h-3 mr-1 inline" />
                            开始处理
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOverlapStatus(ov.id, 'resolved')
                          }}
                          className="btn-eng btn-success text-xs py-1.5 px-3"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                          标记已处理
                        </button>
                      </div>
                    </div>

                    <ol className="space-y-3">
                      {ov.steps.map((step) => (
                        <li
                          key={step.order}
                          className={`flex gap-4 p-3 rounded border transition-all ${
                            step.completed
                              ? 'bg-emerald-50 border-success-500/30'
                              : 'bg-white border-engineer-200 hover:border-engineer-300'
                          }`}
                        >
                          <label className="flex items-start gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={step.completed}
                              onChange={(e) => {
                                e.stopPropagation()
                                toggleStepCompleted(ov.id, step.order)
                              }}
                              className="mt-0.5 w-4 h-4 rounded border-engineer-300 text-engineer-700 focus:ring-engineer-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-mono font-semibold ${
                                  step.completed ? 'text-success-600' : cfg.textColor
                                }`}>
                                  步骤 {step.order}
                                </span>
                                {step.completed && (
                                  <span className="tag tag-success">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    已执行
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm ${step.completed ? 'text-engineer-600 line-through' : 'text-engineer-800'}`}>
                                {step.instruction}
                              </p>
                              {step.codeHint && (
                                <div className="mt-2 inline-block px-2.5 py-1 rounded bg-engineer-50 border border-engineer-200 font-mono text-xs text-engineer-700">
                                  <MapPin className="w-3 h-3 inline mr-1 text-engineer-400" />
                                  {step.codeHint}
                                </div>
                              )}
                            </div>
                          </label>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
