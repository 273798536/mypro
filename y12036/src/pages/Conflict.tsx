import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Anchor,
  Waves,
  Fuel,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Ship,
  Grid3X3,
  Pencil,
  CheckCircle2,
  Navigation,
} from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import type { ConflictRecord } from '@/types/game'

const CONFLICT_LABELS: Record<ConflictRecord['type'], string> = {
  berth_collision: '泊位冲突',
  tide_mismatch: '潮汐不匹配',
  fuel_shortage: '燃油不足',
  data_inconsistency: '数据不一致',
}

const CONFLICT_COLORS: Record<ConflictRecord['type'], string> = {
  berth_collision: 'bg-[#FF8C00]/20 text-[#FF8C00] border-[#FF8C00]/40',
  tide_mismatch: 'bg-[#00D4AA]/20 text-[#00D4AA] border-[#00D4AA]/40',
  fuel_shortage: 'bg-[#E53E3E]/20 text-[#E53E3E] border-[#E53E3E]/40',
  data_inconsistency: 'bg-[#FF8C00]/20 text-[#FF8C00] border-[#FF8C00]/40',
}

const CONFLICT_ICONS: Record<ConflictRecord['type'], React.ReactNode> = {
  berth_collision: <Anchor className="w-3.5 h-3.5" />,
  tide_mismatch: <Waves className="w-3.5 h-3.5" />,
  fuel_shortage: <Fuel className="w-3.5 h-3.5" />,
  data_inconsistency: <AlertTriangle className="w-3.5 h-3.5" />,
}

function TideMissingBanner() {
  const { tideTables, getPortById, session } = useGameStore()

  const alerts = tideTables
    .filter(tt => tt.missingRanges.length > 0)
    .flatMap(tt =>
      tt.missingRanges.map(mr => ({
        portId: tt.portId,
        portName: getPortById(tt.portId)?.name ?? tt.portId,
        startRound: mr.startRound,
        endRound: mr.endRound,
        reason: mr.reason,
        active: session.currentRound >= mr.startRound && session.currentRound <= mr.endRound,
      }))
    )

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2 mb-6">
      {alerts.map((alert, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
            alert.active
              ? 'bg-[#E53E3E]/15 border-[#E53E3E]/50 animate-pulse'
              : 'bg-[#E53E3E]/5 border-[#E53E3E]/20'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${alert.active ? 'bg-[#E53E3E] animate-ping' : 'bg-[#E53E3E]/40'}`} />
          <AlertTriangle className="w-4 h-4 text-[#E53E3E] shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[#E53E3E] font-medium">{alert.portName}</span>
            <span className="text-gray-400 text-sm ml-2">
              第{alert.startRound}-{alert.endRound}回合
            </span>
            <span className="text-gray-500 text-sm ml-2">{alert.reason}</span>
          </div>
          {alert.active && (
            <span className="text-xs text-[#E53E3E] font-medium border border-[#E53E3E]/40 px-2 py-0.5 rounded">
              当前受影响
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function FuelTraceChain({ conflict }: { conflict: ConflictRecord }) {
  const { dispatchHistory, getShipById, getPortById } = useGameStore()
  const [expandedStep, setExpandedStep] = useState<string | null>(null)

  const relatedActions = dispatchHistory.filter(
    a => a.shipId === (dispatchHistory.find(da => da.id === conflict.actionId)?.shipId ?? '')
      && a.fuelCost > 0
      && a.round <= conflict.round
  ).sort((a, b) => b.round - a.round)

  return (
    <div className="mt-3 ml-4 border-l-2 border-[#E53E3E]/30 pl-4 space-y-2">
      <div className="flex items-center gap-2 text-[#E53E3E] text-sm font-medium">
        <Fuel className="w-3.5 h-3.5" />
        <span>当前不足：{conflict.shipCardValue} / 需要：{conflict.dockGridValue}</span>
      </div>
      {relatedActions.map(action => {
        const ship = getShipById(action.shipId)
        const fromPort = getPortById(action.fromPortId)
        const toPort = getPortById(action.toPortId)
        const isExpanded = expandedStep === action.id

        return (
          <div key={action.id}>
            <button
              onClick={() => setExpandedStep(isExpanded ? null : action.id)}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors w-full text-left py-1"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="text-gray-400">回合{action.round}</span>
              <span>{ship?.name ?? action.shipId}</span>
              <span className="text-gray-500">{fromPort?.name ?? action.fromPortId} → {toPort?.name ?? action.toPortId}</span>
              <span className="text-[#FF8C00] ml-auto">燃油消耗 {action.fuelCost}</span>
            </button>
            {isExpanded && (
              <div className="ml-6 mt-1 p-3 rounded bg-[#0A1628] border border-gray-700/50 text-sm space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>航次ID</span><span className="text-gray-300">{action.id.slice(0, 8)}…</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>航线</span>
                  <span className="text-gray-300">{fromPort?.name ?? action.fromPortId} → {toPort?.name ?? action.toPortId}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>燃油消耗</span>
                  <span className="text-[#FF8C00]">{action.fuelCost}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>潮汐窗口</span>
                  <span className={action.tideWindowMatched ? 'text-[#00D4AA]' : 'text-[#E53E3E]'}>
                    {action.tideWindowMatched ? '匹配' : '不匹配'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>关联冲突</span>
                  <span className="text-[#E53E3E]">{action.conflicts.length}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ConflictCard({ conflict }: { conflict: ConflictRecord }) {
  const { resolveConflict, getShipById, dispatchHistory } = useGameStore()
  const [resolution, setResolution] = useState<ConflictRecord['resolution']>(conflict.resolution)
  const [reason, setReason] = useState(conflict.resolutionReason)
  const [showTrace, setShowTrace] = useState(false)

  const action = dispatchHistory.find(a => a.id === conflict.actionId)
  const ship = action ? getShipById(action.shipId) : undefined
  const isResolved = conflict.resolution !== 'unresolved'

  const handleResolve = () => {
    if (resolution === 'unresolved' || !reason.trim()) return
    resolveConflict(conflict.id, resolution, reason.trim())
  }

  return (
    <div className={`rounded-xl border transition-all ${
      isResolved
        ? 'bg-[#0A1628]/60 border-[#00D4AA]/20'
        : 'bg-[#0A1628] border-gray-700/50'
    }`}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${CONFLICT_COLORS[conflict.type]}`}>
            {CONFLICT_ICONS[conflict.type]}
            {CONFLICT_LABELS[conflict.type]}
          </span>
          <span className="text-gray-500 text-sm">回合 {conflict.round}</span>
          <span className="text-gray-500 text-sm">·</span>
          <span className="text-gray-400 text-sm">{conflict.fieldName}</span>
          {ship && (
            <span className="text-gray-500 text-sm ml-auto">{ship.name}</span>
          )}
          {isResolved && (
            <CheckCircle2 className="w-4 h-4 text-[#00D4AA] ml-auto" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0A1628] border border-gray-700/40 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs font-medium">
              <Ship className="w-3.5 h-3.5" />
              船舶卡数据
            </div>
            <div className="text-white text-sm font-medium">{conflict.shipCardValue}</div>
          </div>
          <div className="bg-[#0A1628] border border-gray-700/40 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs font-medium">
              <Grid3X3 className="w-3.5 h-3.5" />
              码头格数据
            </div>
            <div className="text-white text-sm font-medium">{conflict.dockGridValue}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 text-xs text-[#FF8C00]">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>差异字段: {conflict.fieldName}</span>
        </div>

        {conflict.type === 'fuel_shortage' && (
          <button
            onClick={() => setShowTrace(!showTrace)}
            className="mt-2 flex items-center gap-1.5 text-xs text-[#E53E3E] hover:text-[#E53E3E]/80 transition-colors"
          >
            <Fuel className="w-3.5 h-3.5" />
            {showTrace ? '收起燃油追溯' : '展开燃油追溯'}
            {showTrace ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}

        {showTrace && conflict.type === 'fuel_shortage' && (
          <FuelTraceChain conflict={conflict} />
        )}
      </div>

      {!isResolved && (
        <div className="px-4 pb-4 border-t border-gray-700/30 pt-4">
          <div className="text-xs text-gray-400 mb-3">裁决方案</div>
          <div className="flex gap-2 mb-3">
            {([
              { value: 'keep_ship' as const, label: '保留船舶卡数据', icon: <Ship className="w-3.5 h-3.5" /> },
              { value: 'keep_dock' as const, label: '保留码头格数据', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
              { value: 'manual_fix' as const, label: '手动修正', icon: <Pencil className="w-3.5 h-3.5" /> },
            ]).map(opt => (
              <button
                key={opt.value}
                onClick={() => setResolution(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  resolution === opt.value
                    ? 'bg-[#00D4AA]/15 border-[#00D4AA]/50 text-[#00D4AA]'
                    : 'bg-transparent border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="请填写裁决理由…"
            rows={2}
            className="w-full bg-[#0A1628] border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[#00D4AA]/50 transition-colors"
          />

          <button
            onClick={handleResolve}
            disabled={resolution === 'unresolved' || !reason.trim()}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-[#00D4AA]/15 text-[#00D4AA] border border-[#00D4AA]/30 hover:bg-[#00D4AA]/25 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ShieldCheck className="w-4 h-4" />
            确认裁决
          </button>
        </div>
      )}

      {isResolved && (
        <div className="px-4 pb-4 border-t border-gray-700/30 pt-3">
          <div className="flex items-center gap-2 text-xs text-[#00D4AA]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>已裁决：{
              conflict.resolution === 'keep_ship' ? '保留船舶卡数据' :
              conflict.resolution === 'keep_dock' ? '保留码头格数据' :
              '手动修正'
            }</span>
            {conflict.resolutionReason && (
              <span className="text-gray-500 ml-2">— {conflict.resolutionReason}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Conflict() {
  const { conflicts, session } = useGameStore()
  const unresolved = conflicts.filter(c => c.resolution === 'unresolved')
  const resolved = conflicts.filter(c => c.resolution !== 'unresolved')

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <header className="sticky top-0 z-10 bg-[#0A1628]/95 backdrop-blur border-b border-gray-700/30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-400 hover:text-[#00D4AA] transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            返回棋盘
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Anchor className="w-5 h-5 text-[#00D4AA]" />
            冲突裁决
          </h1>
          <div className="text-sm text-gray-500">
            回合 {session.currentRound}/{session.totalRounds}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <TideMissingBanner />

        {conflicts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <ShieldCheck className="w-12 h-12 mb-4 text-[#00D4AA]/40" />
            <p className="text-lg font-medium">暂无冲突</p>
            <p className="text-sm mt-1">所有调度数据一致，无需裁决</p>
          </div>
        ) : (
          <div className="space-y-6">
            {unresolved.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-5 rounded-full bg-[#E53E3E]" />
                  <h2 className="text-base font-semibold">待裁决</h2>
                  <span className="text-xs bg-[#E53E3E]/15 text-[#E53E3E] px-2 py-0.5 rounded-full">
                    {unresolved.length}
                  </span>
                </div>
                <div className="space-y-4">
                  {unresolved.map(c => (
                    <ConflictCard key={c.id} conflict={c} />
                  ))}
                </div>
              </section>
            )}

            {resolved.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-5 rounded-full bg-[#00D4AA]" />
                  <h2 className="text-base font-semibold">已裁决</h2>
                  <span className="text-xs bg-[#00D4AA]/15 text-[#00D4AA] px-2 py-0.5 rounded-full">
                    {resolved.length}
                  </span>
                </div>
                <div className="space-y-4">
                  {resolved.map(c => (
                    <ConflictCard key={c.id} conflict={c} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 bg-[#0A1628]/95 backdrop-blur border-t border-gray-700/30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {unresolved.length > 0
              ? `还有 ${unresolved.length} 项冲突待裁决`
              : '所有冲突已裁决完毕'}
          </div>
          <Link
            to="/settlement"
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              session.status === 'finished'
                ? 'bg-[#00D4AA] text-[#0A1628] hover:bg-[#00D4AA]/90'
                : 'bg-gray-700/50 text-gray-500 cursor-not-allowed pointer-events-none'
            }`}
          >
            <Navigation className="w-4 h-4" />
            前往结算
          </Link>
        </div>
      </footer>
    </div>
  )
}
