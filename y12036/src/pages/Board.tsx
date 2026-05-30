import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import SeaMap from '@/components/SeaMap'
import ShipCard from '@/components/ShipCard'
import TideTableDrawer from '@/components/TideTableDrawer'
import RoundBar from '@/components/RoundBar'
import { Waves, Ship, Anchor, Navigation, Compass, AlertTriangle, FileText, BarChart3 } from 'lucide-react'

export default function Board() {
  const ships = useGameStore(s => s.ships)
  const session = useGameStore(s => s.session)
  const conflicts = useGameStore(s => s.conflicts)
  const dispatchShip = useGameStore(s => s.dispatchShip)
  const getPortById = useGameStore(s => s.getPortById)
  const isPortDockable = useGameStore(s => s.isPortDockable)
  const calculateFuelCost = useGameStore(s => s.calculateFuelCost)

  const [selectedShipId, setSelectedShipId] = useState<string | null>(null)
  const [tideDrawerOpen, setTideDrawerOpen] = useState(false)
  const [targetPortId, setTargetPortId] = useState<string | null>(null)

  const selectedShip = ships.find(s => s.id === selectedShipId)

  const unresolvedConflicts = conflicts.filter(c => c.resolution === 'unresolved').length

  const handleShipClick = useCallback((shipId: string) => {
    setSelectedShipId(prev => prev === shipId ? null : shipId)
    setTargetPortId(null)
  }, [])

  const handlePortClick = useCallback((portId: string) => {
    if (!selectedShipId) return
    const ship = ships.find(s => s.id === selectedShipId)
    if (!ship || ship.status !== 'idle' || !ship.currentPortId) return
    if (ship.currentPortId === portId) return
    setTargetPortId(portId)
  }, [selectedShipId, ships])

  const handleDispatch = useCallback(() => {
    if (!selectedShipId || !targetPortId) return
    dispatchShip(selectedShipId, targetPortId)
    setSelectedShipId(null)
    setTargetPortId(null)
  }, [selectedShipId, targetPortId, dispatchShip])

  const fuelCost = selectedShipId && selectedShip?.currentPortId && targetPortId
    ? calculateFuelCost(selectedShipId, selectedShip.currentPortId, targetPortId)
    : null

  const dockable = targetPortId
    ? isPortDockable(targetPortId, session.currentRound)
    : null

  const targetPort = targetPortId ? getPortById(targetPortId) : null

  return (
    <div className="h-screen flex flex-col bg-deep-sea font-sans-sc overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 border-b border-ocean-light/20 bg-ocean-dark/50">
        <div className="flex items-center gap-2">
          <Navigation size={20} className="text-tide-cyan" />
          <h1 className="font-serif-sc font-bold text-lg text-slate-100">海岛港口补给棋</h1>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            to="/dispatch"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-ocean-mid border border-ocean-light/30 hover:border-tide-cyan/40 transition-colors"
          >
            <Compass size={14} className="text-tide-cyan" />
            <span className="text-xs text-slate-300 font-sans-sc">调度</span>
          </Link>
          <Link
            to="/conflict"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-ocean-mid border border-ocean-light/30 hover:border-warn-amber/40 transition-colors relative"
          >
            <AlertTriangle size={14} className="text-warn-amber" />
            <span className="text-xs text-slate-300 font-sans-sc">冲突</span>
            {unresolvedConflicts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-fuel-red text-[9px] text-white flex items-center justify-center font-bold">
                {unresolvedConflicts}
              </span>
            )}
          </Link>
          <Link
            to="/settlement"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-ocean-mid border border-ocean-light/30 hover:border-tide-cyan/40 transition-colors"
          >
            <BarChart3 size={14} className="text-tide-cyan" />
            <span className="text-xs text-slate-300 font-sans-sc">结算</span>
          </Link>
          <Link
            to="/report"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-ocean-mid border border-ocean-light/30 hover:border-tide-cyan/40 transition-colors"
          >
            <FileText size={14} className="text-tide-cyan" />
            <span className="text-xs text-slate-300 font-sans-sc">报告</span>
          </Link>
          <button
            onClick={() => setTideDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-ocean-mid border border-ocean-light/30 hover:border-tide-cyan/40 transition-colors"
          >
            <Waves size={14} className="text-tide-cyan" />
            <span className="text-xs text-slate-300 font-sans-sc">潮汐表</span>
          </button>
        </nav>
      </header>

      <div className="flex-1 flex min-h-0 pb-14">
        <div className="w-[60%] p-3">
          <SeaMap selectedShipId={selectedShipId} onPortClick={handlePortClick} />
        </div>

        <div className="w-[40%] flex flex-col border-l border-ocean-light/20">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-ocean-light/15 bg-ocean-dark/30">
            <Ship size={14} className="text-tide-cyan" />
            <h2 className="font-serif-sc text-sm font-bold text-slate-200">船舶舰队</h2>
            <span className="ml-auto text-[10px] font-sans-sc text-dock-gray">{ships.length}艘</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {ships.map(ship => (
              <ShipCard
                key={ship.id}
                ship={ship}
                selected={ship.id === selectedShipId}
                onClick={() => handleShipClick(ship.id)}
              />
            ))}
          </div>

          <div className="border-t border-ocean-light/20 bg-ocean-dark/40 p-3 space-y-2">
            {selectedShip && (
              <div className="text-xs font-sans-sc text-slate-400">
                选中: <span className="text-tide-cyan font-medium">{selectedShip.name}</span>
                {selectedShip.currentPortId && (
                  <span className="text-dock-gray ml-1">
                    (于 {getPortById(selectedShip.currentPortId)?.name ?? selectedShip.currentPortId})
                  </span>
                )}
              </div>
            )}

            {targetPort && (
              <div className="p-2.5 rounded-lg border border-ocean-light/30 bg-ocean-mid/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-sans-sc text-slate-300">
                    航线: {getPortById(selectedShip?.currentPortId ?? '')?.name ?? '--'} → {targetPort.name}
                  </span>
                  {dockable !== null && (
                    <span className={`text-[10px] font-sans-sc px-1.5 py-0.5 rounded ${dockable ? 'bg-tide-cyan/15 text-tide-cyan' : 'bg-fuel-red/15 text-fuel-red'}`}>
                      {dockable ? '潮汐允许' : '潮汐不符'}
                    </span>
                  )}
                </div>
                {fuelCost !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-sans-sc text-dock-gray">燃油消耗</span>
                    <span className={`text-xs font-sans-sc font-medium ${selectedShip && fuelCost > selectedShip.fuel ? 'text-fuel-red' : 'text-slate-300'}`}>
                      {fuelCost} / {selectedShip?.fuel ?? 0}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleDispatch}
                  disabled={
                    !selectedShip ||
                    selectedShip.status !== 'idle' ||
                    !selectedShip.currentPortId ||
                    (fuelCost !== null && selectedShip.fuel < fuelCost)
                  }
                  className={`
                    w-full py-1.5 rounded font-sans-sc text-xs font-medium transition-colors
                    flex items-center justify-center gap-1.5
                    ${selectedShip && selectedShip.status === 'idle' && selectedShip.currentPortId && (fuelCost === null || fuelCost <= selectedShip.fuel)
                      ? 'bg-tide-cyan/20 border border-tide-cyan/40 text-tide-cyan hover:bg-tide-cyan/30'
                      : 'bg-dock-gray/10 border border-dock-gray/20 text-dock-gray cursor-not-allowed'
                    }
                  `}
                >
                  <Anchor size={12} />
                  调度出航
                </button>
              </div>
            )}

            {!selectedShip && (
              <div className="text-center text-[10px] font-sans-sc text-dock-gray py-2">
                点击船舶卡选中，再点击地图港口设定航线
              </div>
            )}
          </div>
        </div>
      </div>

      <RoundBar />
      <TideTableDrawer open={tideDrawerOpen} onClose={() => setTideDrawerOpen(false)} />
    </div>
  )
}
