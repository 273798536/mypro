import { useState } from 'react'
import { History, User, Cpu, Hand, Pause, CheckCircle2, ChevronRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatTime, riskLabel, statusLabel } from '../utils/format'
import type { HistoryEntry, ReviewRecord } from '../types'
import clsx from 'clsx'

const eventIcon: Record<HistoryEntry['eventType'], typeof History> = {
  prediction: Cpu,
  manual_correction: Hand,
  status_change: History,
  suspend: Pause,
  resolve_exception: CheckCircle2,
}

const eventLabel: Record<HistoryEntry['eventType'], string> = {
  prediction: '模型预测',
  manual_correction: '人工修正',
  status_change: '状态变更',
  suspend: '挂起',
  resolve_exception: '解决异常',
}

const eventColor: Record<HistoryEntry['eventType'], string> = {
  prediction: 'bg-slate-100 text-slate-700 border-slate-300',
  manual_correction: 'bg-sky-100 text-sky-700 border-sky-300',
  status_change: 'bg-amber-100 text-amber-700 border-amber-300',
  suspend: 'bg-violet-100 text-violet-700 border-violet-300',
  resolve_exception: 'bg-emerald-100 text-emerald-700 border-emerald-300',
}

function EntryCard({ entry, record, onClick }: { entry: HistoryEntry; record?: ReviewRecord; onClick?: () => void }) {
  const Icon = eventIcon[entry.eventType]
  return (
    <div
      className={clsx(
        'card p-3 hover:bg-slate-50 transition-colors',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={clsx('w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0', eventColor[entry.eventType])}>
          <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('badge', eventColor[entry.eventType])}>{eventLabel[entry.eventType]}</span>
            <span className="text-sm font-medium text-slate-900">
              {record?.prTitle ?? entry.reviewRecordId}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1">
              {entry.operatorRole === 'system' ? <Cpu size={11} /> : <User size={11} />}
              {entry.operator}
            </span>
            <span>·</span>
            <span>{formatTime(entry.timestamp)}</span>
            {entry.operatorRole !== 'system' && (
              <span className="badge bg-white text-slate-600 border-slate-300">
                {entry.operatorRole === 'risk_ops' ? '风控运营' : entry.operatorRole === 'algorithm' ? '算法值班' : '系统'}
              </span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 rounded p-2">
              <div className="text-[10px] uppercase text-slate-500 mb-1">变更前</div>
              <SnapshotView snap={entry.beforeSnapshot} />
            </div>
            <div className="bg-emerald-50 rounded p-2">
              <div className="text-[10px] uppercase text-slate-500 mb-1">变更后</div>
              <SnapshotView snap={entry.afterSnapshot} />
            </div>
          </div>
          {entry.note && (
            <div className="mt-2 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded p-2">
              📝 {entry.note}
            </div>
          )}
        </div>
        {onClick && <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-2" />}
      </div>
    </div>
  )
}

function SnapshotView({ snap }: { snap: Record<string, unknown> }) {
  if (!snap || Object.keys(snap).length === 0) {
    return <span className="text-slate-400">（无）</span>
  }
  return (
    <div className="space-y-1">
      {snap.riskLevel && (
        <div className="flex items-center gap-1">
          <span className="text-slate-500">风险：</span>
          <span className={clsx('badge', `risk-${snap.riskLevel as string}`)}>
            {riskLabel[snap.riskLevel as keyof typeof riskLabel]}
          </span>
        </div>
      )}
      {snap.status && (
        <div className="flex items-center gap-1">
          <span className="text-slate-500">状态：</span>
          <span className={clsx('badge', `status-${snap.status as string}`)}>
            {statusLabel[snap.status as keyof typeof statusLabel]}
          </span>
        </div>
      )}
      {snap.modelVersion && (
        <div className="flex items-center gap-1">
          <span className="text-slate-500">模型：</span>
          <span className="font-mono text-slate-700">{snap.modelVersion as string}</span>
        </div>
      )}
      {snap.source && (
        <div className="flex items-center gap-1">
          <span className="text-slate-500">来源：</span>
          <span>{snap.source === 'manual' ? '人工修正' : '模型预测'}</span>
        </div>
      )}
      {snap.confidence !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-slate-500">置信度：</span>
          <span>{Math.round((snap.confidence as number) * 100)}%</span>
        </div>
      )}
      {snap.isSuspended !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-slate-500">挂起：</span>
          <span className={snap.isSuspended ? 'text-violet-700' : 'text-slate-700'}>
            {snap.isSuspended ? '是' : '否'}
          </span>
        </div>
      )}
      {snap.suspendedReason && (
        <div className="text-slate-600 truncate">
          原因：{snap.suspendedReason as string}
        </div>
      )}
    </div>
  )
}

export default function HistoryView() {
  const history = useAppStore((s) => s.history)
  const reviewRecords = useAppStore((s) => s.reviewRecords)
  const setSelectedRecordId = useAppStore((s) => s.setSelectedRecordId)
  const setSelectedTab = useAppStore((s) => s.setSelectedTab)
  const [filter, setFilter] = useState<'all' | HistoryEntry['eventType']>('all')

  const sorted = history
    .filter((h) => filter === 'all' || h.eventType === filter)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const counts: Record<string, number> = {
    all: history.length,
    ...history.reduce((acc, h) => {
      acc[h.eventType] = (acc[h.eventType] ?? 0) + 1
      return acc
    }, {} as Record<string, number>),
  }

  const filters: { id: 'all' | HistoryEntry['eventType']; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'prediction', label: '模型预测' },
    { id: 'manual_correction', label: '人工修正' },
    { id: 'suspend', label: '挂起' },
    { id: 'resolve_exception', label: '解决异常' },
  ]

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <History size={16} className="text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900">全量变更历史</h2>
            <span className="text-xs text-slate-500">共 {history.length} 条</span>
          </div>
          <div className="text-xs text-slate-500">
            人工确认前后的变化均会记录，用于灰度发布前复盘
          </div>
        </div>
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={clsx(
                'px-2.5 py-1 rounded-md text-xs border transition-colors',
                filter === f.id
                  ? 'bg-brand-50 text-brand-700 border-brand-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] opacity-70">({counts[f.id] ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((entry) => {
          const record = reviewRecords.find((r) => r.id === entry.reviewRecordId)
          return (
            <EntryCard
              key={entry.id}
              entry={entry}
              record={record}
              onClick={() => {
                setSelectedRecordId(entry.reviewRecordId)
                setSelectedTab('detail')
              }}
            />
          )
        })}
        {!sorted.length && (
          <div className="card card-body text-center text-sm text-slate-500 py-8">
            暂无变更记录
          </div>
        )}
      </div>
    </div>
  )
}
