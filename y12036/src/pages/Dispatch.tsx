import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Ship, Anchor, Fuel, Waves, Lock, ChevronRight, ChevronLeft,
  CheckCircle2, AlertTriangle, ArrowLeft, Anchor as AnchorIcon,
  ShieldAlert, Package, LockKeyhole,
} from 'lucide-react'
import { useGameStore } from '@/store/gameStore'

type Step = 1 | 2 | 3

const SHIP_STATUS_LABEL: Record<string, string> = {
  idle: '待命',
  sailing: '航行中',
  docking: '靠泊中',
  loading: '装卸中',
  locked: '已锁定',
}

const TIDE_TYPE_LABEL: Record<string, string> = {
  high: '高潮',
  low: '低潮',
  rising: '涨潮',
  falling: '落潮',
}

export default function Dispatch() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null)
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null)

  const {
    ships, ports, resourceLocks, session,
    getPortById, getTideEntry, calculateFuelCost, getLocksForShip, isPortDockable,
    dispatchShip,
  } = useGameStore()

  const currentRound = session.currentRound

  const selectedShip = useMemo(
    () => ships.find(s => s.id === selectedShipId),
    [ships, selectedShipId],
  )

  const selectedPort = useMemo(
    () => ports.find(p => p.id === selectedPortId),
    [ports, selectedPortId],
  )

  const fuelCost = useMemo(() => {
    if (!selectedShipId || !selectedShip?.currentPortId || !selectedPortId) return 0
    return calculateFuelCost(selectedShipId, selectedShip.currentPortId, selectedPortId)
  }, [selectedShipId, selectedShip, selectedPortId, calculateFuelCost])

  const tideEntry = useMemo(() => {
    if (!selectedPortId) return undefined
    return getTideEntry(selectedPortId, currentRound)
  }, [selectedPortId, currentRound, getTideEntry])

  const tideMatched = tideEntry ? tideEntry.dockable : false

  const availableBerths = useMemo(() => {
    if (!selectedPort) return 0
    return selectedPort.berths.filter(b => b.status === 'available').length
  }, [selectedPort])

  const shipLocks = useMemo(
    () => selectedShipId ? getLocksForShip(selectedShipId) : [],
    [selectedShipId, getLocksForShip],
  )

  const currentRoundLocks = useMemo(
    () => resourceLocks.filter(l => l.round === currentRound),
    [resourceLocks, currentRound],
  )

  const hasRisk = !tideMatched || availableBerths === 0 || (selectedShip ? selectedShip.fuel < fuelCost : false)

  const handleDispatch = () => {
    if (!selectedShipId || !selectedPortId) return
    dispatchShip(selectedShipId, selectedPortId)
    navigate('/')
  }

  const goNext = () => {
    if (step === 1 && selectedShipId) setStep(2)
    else if (step === 2 && selectedPortId) setStep(3)
  }

  const goBack = () => {
    if (step === 2) { setStep(1); setSelectedPortId(null) }
    else if (step === 3) { setStep(2) }
  }

  const getPortTideStatus = (portId: string) => {
    const entry = getTideEntry(portId, currentRound)
    const dockable = isPortDockable(portId, currentRound)
    if (!entry) return { label: '数据缺失', color: 'text-amber-400', dockable: false, dangerous: true }
    if (entry.dangerous) return { label: '危险', color: 'text-red-400', dockable: false, dangerous: true }
    if (!dockable) return { label: '不可停靠', color: 'text-red-400', dockable: false, dangerous: false }
    return { label: '可停靠', color: 'text-emerald-400', dockable: true, dangerous: false }
  }

  const steps = [
    { num: 1, label: '选择船舶', icon: Ship },
    { num: 2, label: '选择港口', icon: Anchor },
    { num: 3, label: '确认调度', icon: CheckCircle2 },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A1628' }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回棋盘
        </Link>
        <span className="text-sm text-slate-500">第 {currentRound} 回合 · 调度操作</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => {
            const Icon = s.icon
            const active = step === s.num
            const done = step > s.num
            return (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  active ? 'bg-[#00D4AA]/20 border border-[#00D4AA]/50' :
                  done ? 'bg-[#00D4AA]/10 border border-[#00D4AA]/30' :
                  'bg-white/5 border border-white/10'
                }`}>
                  <Icon className={`w-4 h-4 ${active ? 'text-[#00D4AA]' : done ? 'text-[#00D4AA]/70' : 'text-slate-500'}`} />
                  <span className={`text-sm ${active ? 'text-[#00D4AA] font-medium' : done ? 'text-[#00D4AA]/70' : 'text-slate-500'}`}>
                    {s.label}
                  </span>
                  {done && <CheckCircle2 className="w-3.5 h-3.5 text-[#00D4AA]/70" />}
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-600 mx-1" />
                )}
              </div>
            )
          })}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">选择船舶</h2>
            <p className="text-sm text-slate-400 mb-6">选择一艘可用的船舶执行调度，航行中与已锁定的船舶不可选择</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ships.map(ship => {
                const disabled = ship.status === 'sailing' || ship.status === 'locked'
                const selected = ship.id === selectedShipId
                const shipCurrentPort = getPortById(ship.currentPortId ?? '')
                const fuelPct = Math.round((ship.fuel / ship.maxFuel) * 100)
                return (
                  <button
                    key={ship.id}
                    disabled={disabled}
                    onClick={() => !disabled && setSelectedShipId(ship.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-[#00D4AA] bg-[#00D4AA]/10 shadow-lg shadow-[#00D4AA]/10'
                        : disabled
                          ? 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.08] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Ship className={`w-5 h-5 ${selected ? 'text-[#00D4AA]' : disabled ? 'text-slate-600' : 'text-slate-400'}`} />
                        <span className={`font-medium ${selected ? 'text-[#00D4AA]' : disabled ? 'text-slate-500' : 'text-white'}`}>
                          {ship.name}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ship.status === 'idle' ? 'bg-emerald-500/20 text-emerald-400' :
                        ship.status === 'sailing' ? 'bg-blue-500/20 text-blue-400' :
                        ship.status === 'locked' ? 'bg-[#D69E2E]/20 text-[#D69E2E]' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {SHIP_STATUS_LABEL[ship.status]}
                      </span>
                    </div>
                    <div className="space-y-2 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <AnchorIcon className="w-3.5 h-3.5" />
                        <span>停靠: {shipCurrentPort?.name ?? '海上'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Fuel className="w-3.5 h-3.5" />
                        <span>燃油: {ship.fuel}/{ship.maxFuel}</span>
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${fuelPct}%`,
                              backgroundColor: fuelPct > 50 ? '#00D4AA' : fuelPct > 25 ? '#FF8C00' : '#E53E3E',
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5" />
                        <span>载货: {ship.cargo.length}项 · 舱容 {ship.capacity}</span>
                      </div>
                    </div>
                    {disabled && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                        <Lock className="w-3 h-3" />
                        <span>当前状态不可调度</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">选择目标港口</h2>
            <p className="text-sm text-slate-400 mb-6">选择调度的目标港口，注意潮汐状态。不可停靠港口仍可选择，但需承担风险</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ports.map(port => {
                const tideStatus = getPortTideStatus(port.id)
                const selected = port.id === selectedPortId
                const isSamePort = selectedShip?.currentPortId === port.id
                const freeBerths = port.berths.filter(b => b.status === 'available').length
                return (
                  <button
                    key={port.id}
                    disabled={isSamePort}
                    onClick={() => !isSamePort && setSelectedPortId(port.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-[#00D4AA] bg-[#00D4AA]/10 shadow-lg shadow-[#00D4AA]/10'
                        : isSamePort
                          ? 'border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.08] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Anchor className={`w-5 h-5 ${selected ? 'text-[#00D4AA]' : 'text-slate-400'}`} />
                        <span className={`font-medium ${selected ? 'text-[#00D4AA]' : 'text-white'}`}>
                          {port.name}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        tideStatus.dangerous ? 'bg-red-500/20 text-red-400' :
                        !tideStatus.dockable ? 'bg-red-500/15 text-red-300' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {tideStatus.dangerous ? <ShieldAlert className="w-3 h-3" /> : <Waves className="w-3 h-3" />}
                        {tideStatus.label}
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>泊位</span>
                        <span className={freeBerths > 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {freeBerths} 可用 / {port.berths.length} 总计
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>补给</span>
                        <span>{port.supplyTypes.join('、')}</span>
                      </div>
                      {tideEntry && port.id === selectedPortId && (
                        <div className="flex items-center justify-between">
                          <span>潮汐</span>
                          <span>{TIDE_TYPE_LABEL[tideEntry.type]} · 水位 {tideEntry.level}</span>
                        </div>
                      )}
                    </div>
                    {isSamePort && (
                      <div className="mt-2 text-xs text-slate-500">船舶已在该港口</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 3 && selectedShip && selectedPort && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">确认调度</h2>
            <p className="text-sm text-slate-400 mb-6">核实调度预览信息，有风险项将以琥珀色标注</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Ship className="w-4 h-4 text-[#00D4AA]" />
                  <span className="text-sm font-medium text-white">船舶信息</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">船名</span><span className="text-white">{selectedShip.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">当前港口</span><span className="text-white">{getPortById(selectedShip.currentPortId ?? '')?.name ?? '-'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">当前燃油</span><span className="text-white">{selectedShip.fuel}/{selectedShip.maxFuel}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">载货</span><span className="text-white">{selectedShip.cargo.length}项</span></div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Anchor className="w-4 h-4 text-[#00D4AA]" />
                  <span className="text-sm font-medium text-white">目标港口</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">港口</span><span className="text-white">{selectedPort.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">补给类型</span><span className="text-white">{selectedPort.supplyTypes.join('、')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">可用泊位</span><span className={availableBerths > 0 ? 'text-white' : 'text-red-400'}>{availableBerths} 个</span></div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-white/5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Waves className="w-4 h-4 text-[#00D4AA]" />
                <span className="text-sm font-medium text-white">调度预览</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <Fuel className="w-3.5 h-3.5" />预估燃油消耗
                  </span>
                  <span className={`text-sm font-medium ${selectedShip.fuel < fuelCost ? 'text-[#E53E3E]' : 'text-white'}`}>
                    {fuelCost} 单位
                    {selectedShip.fuel < fuelCost && (
                      <span className="ml-2 text-xs text-[#FF8C00] flex items-center gap-1 inline-flex">
                        <AlertTriangle className="w-3 h-3" />燃油不足
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <Waves className="w-3.5 h-3.5" />潮汐窗口匹配度
                  </span>
                  <span className={`text-sm font-medium ${tideMatched ? 'text-[#00D4AA]' : 'text-[#FF8C00]'}`}>
                    {tideMatched ? '匹配' : '不匹配'}
                    {!tideMatched && tideEntry && (
                      <span className="ml-2 text-xs text-[#FF8C00]">
                        ({TIDE_TYPE_LABEL[tideEntry.type]} · 水位{tideEntry.level})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <Anchor className="w-3.5 h-3.5" />泊位可用性
                  </span>
                  <span className={`text-sm font-medium ${availableBerths > 0 ? 'text-[#00D4AA]' : 'text-[#FF8C00]'}`}>
                    {availableBerths > 0 ? `${availableBerths}个可用` : '无可用泊位'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />已有资源锁定
                  </span>
                  <span className={`text-sm font-medium ${shipLocks.length > 0 ? 'text-[#D69E2E]' : 'text-slate-400'}`}>
                    {shipLocks.length > 0 ? `${shipLocks.length}项锁定` : '无'}
                  </span>
                </div>
              </div>
            </div>

            {hasRisk && (
              <div className="p-4 rounded-xl border border-[#FF8C00]/30 bg-[#FF8C00]/10 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-[#FF8C00]" />
                  <span className="text-sm font-medium text-[#FF8C00]">风险警告</span>
                </div>
                <ul className="space-y-1 text-xs text-[#FF8C00]/90">
                  {!tideMatched && <li>· 目标港口当前潮汐窗口不匹配，可能触发扣分</li>}
                  {availableBerths === 0 && <li>· 目标港口无可用泊位，将产生泊位冲突</li>}
                  {selectedShip.fuel < fuelCost && <li>· 燃油不足，航行可能无法完成</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        {currentRoundLocks.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <LockKeyhole className="w-4 h-4 text-[#D69E2E]" />
              <h3 className="text-sm font-medium text-[#D69E2E]">资源锁定</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentRoundLocks.map(lock => {
                const lockShip = ships.find(s => s.id === lock.shipId)
                const IconMap = { fuel: Fuel, berth: Anchor, cargo: Package }
                const TypeLabelMap: Record<string, string> = { fuel: '燃油锁定', berth: '泊位锁定', cargo: '货物锁定' }
                const LockIcon = IconMap[lock.type]
                return (
                  <div
                    key={lock.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-[#D69E2E]/30 bg-[#D69E2E]/5"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[#D69E2E]/10 shrink-0">
                      <LockIcon className="w-4 h-4 text-[#D69E2E]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm text-[#D69E2E] font-medium">
                        <Lock className="w-3 h-3" />
                        {TypeLabelMap[lock.type]}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 truncate">{lock.reason}</div>
                      <div className="text-xs text-slate-500 mt-0.5">解锁条件: {lock.unlockCondition}</div>
                      {lockShip && <div className="text-xs text-slate-500 mt-0.5">关联船舶: {lockShip.name}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/10">
          <div>
            {step > 1 && (
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm text-slate-300 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                上一步
              </button>
            )}
          </div>
          <div>
            {step < 3 ? (
              <button
                onClick={goNext}
                disabled={(step === 1 && !selectedShipId) || (step === 2 && !selectedPortId)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: (step === 1 && selectedShipId) || (step === 2 && selectedPortId) ? '#00D4AA' : '#1e293b',
                  color: (step === 1 && selectedShipId) || (step === 2 && selectedPortId) ? '#0A1628' : '#64748b',
                }}
              >
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleDispatch}
                className="flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-bold transition-all hover:shadow-lg hover:shadow-[#00D4AA]/20"
                style={{ backgroundColor: '#00D4AA', color: '#0A1628' }}
              >
                <CheckCircle2 className="w-4 h-4" />
                执行调度
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
