import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Ship,
  Waves,
  FileText,
  Anchor,
  Fuel,
  Route,
  ShieldAlert,
} from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import RouteReplay from '@/components/RouteReplay'

const SHIP_COLORS: Record<string, string> = {
  'ship-1': '#00D4AA',
  'ship-2': '#FF8C00',
  'ship-3': '#E53E3E',
  'ship-4': '#D69E2E',
}

const DEDUCTION_TYPE_LABEL: Record<string, string> = {
  missed_tide: '错过潮汐',
  fuel_overrun: '燃油超标',
  conflict_unresolved: '冲突未解决',
  route_deviation: '航线偏差',
}

const DEDUCTION_TYPE_COLOR: Record<string, string> = {
  missed_tide: '#FF8C00',
  fuel_overrun: '#E53E3E',
  conflict_unresolved: '#D69E2E',
  route_deviation: '#00D4AA',
}

const DEDUCTION_TYPE_ICON: Record<string, typeof Waves> = {
  missed_tide: Waves,
  fuel_overrun: Fuel,
  conflict_unresolved: ShieldAlert,
  route_deviation: Route,
}

export default function Settlement() {
  const navigate = useNavigate()
  const deductions = useGameStore(s => s.deductions)
  const dispatchHistory = useGameStore(s => s.dispatchHistory)
  const ships = useGameStore(s => s.ships)
  const session = useGameStore(s => s.session)
  const conflicts = useGameStore(s => s.conflicts)
  const tideTables = useGameStore(s => s.tideTables)
  const getPortById = useGameStore(s => s.getPortById)
  const getTideEntry = useGameStore(s => s.getTideEntry)
  const calculateTotalDeduction = useGameStore(s => s.calculateTotalDeduction)

  const [expandedDeductions, setExpandedDeductions] = useState<Set<string>>(new Set())
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set())

  const toggleDeduction = (id: string) => {
    setExpandedDeductions(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleRound = (round: number) => {
    setExpandedRounds(prev => {
      const next = new Set(prev)
      if (next.has(round)) next.delete(round)
      else next.add(round)
      return next
    })
  }

  const totalDeduction = calculateTotalDeduction()

  const deductionByType = deductions.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + d.points
    return acc
  }, {})

  const roundsWithActions = [...new Set(dispatchHistory.map(a => a.round))].sort((a, b) => a - b)

  return (
    <div className="min-h-screen bg-[#0A1628] text-[#e2e8f0]">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Waves size={28} className="text-[#00D4AA]" />
            <div>
              <h1 className="text-2xl font-bold text-white">结算复盘</h1>
              <p className="text-sm text-[#64748b]">
                海岛港口补给棋 · 回合 {session.currentRound}/{session.totalRounds}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-[#E53E3E]">-{totalDeduction}</div>
            <div className="text-xs text-[#64748b]">总扣分</div>
          </div>
        </div>

        <RouteReplay />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(DEDUCTION_TYPE_LABEL).map(([type, label]) => {
            const Icon = DEDUCTION_TYPE_ICON[type]
            const pts = deductionByType[type] || 0
            const color = DEDUCTION_TYPE_COLOR[type]
            return (
              <div key={type} className="rounded-xl border border-[#1a2a4a] bg-[#0d1b30] p-4">
                <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                  <Icon size={12} style={{ color }} />
                  {label}
                </div>
                <div
                  className="mt-1.5 text-2xl font-bold"
                  style={{ color: pts ? color : '#2a3a5a' }}
                >
                  -{pts}
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-xl border border-[#1a2a4a] bg-[#0d1b30]">
          <div className="flex items-center gap-2 border-b border-[#1a2a4a] px-4 py-3">
            <AlertTriangle size={16} className="text-[#FF8C00]" />
            <h2 className="font-semibold">扣分明细</h2>
            <span className="ml-auto text-xs text-[#64748b]">共 {deductions.length} 项</span>
          </div>
          {deductions.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[#64748b]">暂无扣分记录</div>
          ) : (
            <div className="divide-y divide-[#1a2a4a]">
              {deductions.map(d => {
                const isExpanded = expandedDeductions.has(d.id)
                const relatedAction = dispatchHistory.find(a => a.id === d.relatedActionId)
                const relatedConflict = conflicts.find(c => c.id === d.relatedRecordId)
                const relatedTideTable = tideTables.find(t => t.portId === d.relatedRecordId)
                const TypeIcon = DEDUCTION_TYPE_ICON[d.type]
                return (
                  <div key={d.id}>
                    <button
                      onClick={() => toggleDeduction(d.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#0f1f38] transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className="shrink-0 text-[#64748b]" />
                      ) : (
                        <ChevronRight size={14} className="shrink-0 text-[#64748b]" />
                      )}
                      <span className="w-14 shrink-0 text-xs text-[#64748b]">回合 {d.round}</span>
                      <TypeIcon size={13} style={{ color: DEDUCTION_TYPE_COLOR[d.type] }} className="shrink-0" />
                      <span
                        className="shrink-0 rounded px-2 py-0.5 text-xs font-medium"
                        style={{
                          color: DEDUCTION_TYPE_COLOR[d.type],
                          backgroundColor: `${DEDUCTION_TYPE_COLOR[d.type]}20`,
                        }}
                      >
                        {DEDUCTION_TYPE_LABEL[d.type]}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-[#94a3b8]">{d.reason}</span>
                      <span className="shrink-0 text-sm font-bold text-[#E53E3E]">-{d.points}</span>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-[#1a2a4a] bg-[#081220] px-6 py-3 space-y-2 text-sm">
                        <div className="text-[#94a3b8]">{d.reason}</div>
                        {relatedAction && (
                          <div className="rounded-lg bg-[#0A1628] p-3 text-xs">
                            <div className="mb-1.5 font-semibold text-[#00D4AA]">关联调度记录</div>
                            <div className="space-y-0.5 text-[#94a3b8]">
                              <div>船舶: {ships.find(s => s.id === relatedAction.shipId)?.name}</div>
                              <div>
                                航线: {getPortById(relatedAction.fromPortId)?.name} →{' '}
                                {getPortById(relatedAction.toPortId)?.name}
                              </div>
                              <div>燃油消耗: {relatedAction.fuelCost}</div>
                              <div>
                                潮汐匹配:{' '}
                                <span className={relatedAction.tideWindowMatched ? 'text-[#00D4AA]' : 'text-[#E53E3E]'}>
                                  {relatedAction.tideWindowMatched ? '是' : '否'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        {relatedConflict && (
                          <div className="rounded-lg bg-[#0A1628] p-3 text-xs">
                            <div className="mb-1.5 font-semibold text-[#D69E2E]">关联冲突记录</div>
                            <div className="space-y-0.5 text-[#94a3b8]">
                              <div>类型: {relatedConflict.type}</div>
                              <div>字段: {relatedConflict.fieldName}</div>
                              <div>船舶卡: {relatedConflict.shipCardValue}</div>
                              <div>码头格: {relatedConflict.dockGridValue}</div>
                              <div>
                                裁决:{' '}
                                <span
                                  className={
                                    relatedConflict.resolution === 'unresolved'
                                      ? 'text-[#E53E3E]'
                                      : 'text-[#00D4AA]'
                                  }
                                >
                                  {relatedConflict.resolution === 'keep_ship'
                                    ? '保留船舶卡'
                                    : relatedConflict.resolution === 'keep_dock'
                                      ? '保留码头格'
                                      : relatedConflict.resolution === 'manual_fix'
                                        ? '手动修正'
                                        : '未裁决'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        {d.relatedRecordType === 'tide' && relatedTideTable && (
                          <div className="rounded-lg bg-[#0A1628] p-3 text-xs">
                            <div className="mb-1.5 font-semibold text-[#00D4AA]">潮汐窗口详情</div>
                            <div className="space-y-0.5 text-[#94a3b8]">
                              <div>港口: {getPortById(relatedTideTable.portId)?.name}</div>
                              {relatedTideTable.missingRanges.map((mr, i) => (
                                <div key={i}>
                                  缺失区间: 回合 {mr.startRound}-{mr.endRound}（{mr.reason}）
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#1a2a4a] bg-[#0d1b30]">
          <div className="flex items-center gap-2 border-b border-[#1a2a4a] px-4 py-3">
            <Ship size={16} className="text-[#00D4AA]" />
            <h2 className="font-semibold">回合决策树</h2>
            <span className="ml-auto text-xs text-[#64748b]">共 {roundsWithActions.length} 个回合</span>
          </div>
          {roundsWithActions.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[#64748b]">暂无调度记录</div>
          ) : (
            <div className="divide-y divide-[#1a2a4a]">
              {roundsWithActions.map(round => {
                const isExpanded = expandedRounds.has(round)
                const actions = dispatchHistory.filter(a => a.round === round)
                const hasSuboptimal = actions.some(a => !a.tideWindowMatched)
                return (
                  <div key={round}>
                    <button
                      onClick={() => toggleRound(round)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#0f1f38] transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-[#64748b]" />
                      ) : (
                        <ChevronRight size={14} className="text-[#64748b]" />
                      )}
                      <Anchor size={14} className="text-[#00D4AA]" />
                      <span className="text-sm font-medium">回合 {round}</span>
                      {hasSuboptimal && (
                        <span className="rounded bg-[#FF8C00]/20 px-1.5 py-0.5 text-xs text-[#FF8C00]">
                          有更优路径
                        </span>
                      )}
                      <span className="ml-auto text-xs text-[#64748b]">
                        {actions.length} 条调度
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-[#1a2a4a] bg-[#081220] px-6 py-3 space-y-2">
                        {actions.map(action => {
                          const ship = ships.find(s => s.id === action.shipId)
                          const fromPort = getPortById(action.fromPortId)
                          const toPort = getPortById(action.toPortId)
                          const tideEntry = getTideEntry(action.toPortId, round)
                          return (
                            <div
                              key={action.id}
                              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-[#0A1628] p-3 text-sm"
                            >
                              <span
                                className="font-medium"
                                style={{ color: SHIP_COLORS[action.shipId] || '#00D4AA' }}
                              >
                                {ship?.name}
                              </span>
                              <span className="text-[#64748b]">
                                {fromPort?.name} → {toPort?.name}
                              </span>
                              <span className="text-xs text-[#64748b]">燃油: {action.fuelCost}</span>
                              {!action.tideWindowMatched && (
                                <span className="flex items-center gap-1 rounded bg-[#E53E3E]/20 px-1.5 py-0.5 text-xs text-[#E53E3E]">
                                  <AlertTriangle size={10} />
                                  错过潮汐窗口
                                </span>
                              )}
                              {tideEntry && (
                                <span
                                  className={`text-xs ${tideEntry.dockable ? 'text-[#00D4AA]' : 'text-[#E53E3E]'}`}
                                >
                                  潮汐: {tideEntry.type}(Lv.{tideEntry.level}){' '}
                                  {tideEntry.dockable ? '可停靠' : '不可停靠'}
                                </span>
                              )}
                              {action.conflicts.length > 0 && (
                                <span className="rounded bg-[#D69E2E]/20 px-1.5 py-0.5 text-xs text-[#D69E2E]">
                                  {action.conflicts.length} 个冲突
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-center pb-8">
          <button
            onClick={() => navigate('/report')}
            className="flex items-center gap-2 rounded-xl bg-[#00D4AA] px-8 py-3 text-lg font-semibold text-[#0A1628] transition-colors hover:bg-[#00D4AA]/80"
          >
            <FileText size={20} />
            生成调度报告
          </button>
        </div>
      </div>
    </div>
  )
}
