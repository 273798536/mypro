import React, { useState } from 'react';
import { Settings, Lock, Unlock, AlertOctagon, Navigation, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { GateStatus, Gate } from '../../types';

const statusLabels: Record<GateStatus, { label: string; color: string }> = {
  normal: { label: '正常', color: 'bg-metro-green' },
  faulty: { label: '故障', color: 'bg-metro-red' },
  restricted: { label: '限流', color: 'bg-metro-yellow' },
  closed: { label: '关闭', color: 'bg-metro-textMuted' },
};

export const GateControl: React.FC = () => {
  const gates = useGameStore((state) => state.gates);
  const exits = useGameStore((state) => state.exits);
  const selectedLocationId = useGameStore((state) => state.selectedLocationId);
  const setGateStatus = useGameStore((state) => state.setGateStatus);
  const setLockdownArea = useGameStore((state) => state.setLockdownArea);
  const clearLockdownArea = useGameStore((state) => state.clearLockdownArea);
  const setDiversionRoute = useGameStore((state) => state.setDiversionRoute);
  const clearDiversionRoute = useGameStore((state) => state.clearDiversionRoute);
  const lockdownAreas = useGameStore((state) => state.lockdownAreas);
  const diversionRoutes = useGameStore((state) => state.diversionRoutes);
  const status = useGameStore((state) => state.status);
  const setSelectedLocation = useGameStore((state) => state.setSelectedLocation);

  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
  const [showDiversionModal, setShowDiversionModal] = useState(false);

  const selectedGate = gates.find((g) => g.id === (selectedGateId || selectedLocationId));
  const hasLockdown = selectedGate
    ? lockdownAreas.some((a) => a.id === `lockdown-${selectedGate.id}`)
    : false;
  const diversionRoute = selectedGate
    ? diversionRoutes.find((r) => r.fromGateId === selectedGate.id)
    : null;

  const handleStatusChange = (gateId: string, newStatus: GateStatus) => {
    if (status !== 'playing') return;
    setGateStatus(gateId, newStatus);
  };

  const handleToggleLockdown = (gateId: string) => {
    if (status !== 'playing') return;
    if (hasLockdown) {
      clearLockdownArea(gateId);
    } else {
      setLockdownArea(gateId);
    }
  };

  const handleSetDiversion = (exitId: string) => {
    if (!selectedGateId || status !== 'playing') return;
    setDiversionRoute(selectedGateId, exitId);
    setShowDiversionModal(false);
  };

  const handleClearDiversion = () => {
    if (!selectedGateId) return;
    clearDiversionRoute(selectedGateId);
  };

  return (
    <div className="metro-panel h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-metro-border">
        <Settings className="text-metro-blue" size={20} />
        <h3 className="font-mono font-bold text-metro-text">闸机控制</h3>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {gates.map((gate) => {
          const isSelected = selectedGateId === gate.id || selectedLocationId === gate.id;
          const gateStatus = statusLabels[gate.status];
          const hasLock = lockdownAreas.some((a) => a.id === `lockdown-${gate.id}`);
          const hasDiversion = diversionRoutes.some((r) => r.fromGateId === gate.id);

          return (
            <button
              key={gate.id}
              onClick={() => {
                setSelectedGateId(gate.id);
                setSelectedLocation(gate.id);
              }}
              disabled={status !== 'playing'}
              className={`p-2 rounded border-2 transition-all ${
                isSelected
                  ? 'border-metro-yellow bg-metro-yellow/10'
                  : status !== 'playing'
                  ? 'border-metro-border bg-metro-bg/50 opacity-60 cursor-not-allowed'
                  : 'border-metro-border bg-metro-bg hover:border-metro-blue'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className={`w-3 h-3 rounded-full ${gateStatus.color} ${gate.isFaulty ? 'animate-pulse-fast' : ''}`} />
                <span className="text-xs font-bold text-metro-text">
                  {gate.name.replace('号闸机', '')}
                </span>
                <span className="text-[10px] text-metro-textMuted">
                  {gateStatus.label}
                </span>
                <div className="flex gap-1">
                  {hasLock && <Lock size={10} className="text-metro-red" />}
                  {hasDiversion && <Navigation size={10} className="text-metro-blue" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedGate ? (
        <div className="flex-1 space-y-3">
          <div className="p-3 bg-metro-bg rounded border border-metro-border">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-metro-text">{selectedGate.name}</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                  statusLabels[selectedGate.status].color
                }`}
              >
                {statusLabels[selectedGate.status].label}
              </span>
            </div>
            {selectedGate.isFaulty && (
              <div className="flex items-center gap-1 text-metro-red text-xs mb-2">
                <AlertOctagon size={12} />
                设备故障，需要处理
              </div>
            )}
            <div className="text-xs text-metro-textMuted">
              通行能力: {selectedGate.capacity}人/分钟
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-metro-textMuted mb-1">状态设置</div>
            <div className="grid grid-cols-2 gap-2">
              {(['normal', 'restricted', 'closed'] as GateStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(selectedGate.id, s)}
                  disabled={status !== 'playing'}
                  className={`p-2 rounded text-xs font-medium transition-all ${
                    selectedGate.status === s
                      ? `${statusLabels[s].color} text-white`
                      : status !== 'playing'
                      ? 'bg-metro-border/30 text-metro-textMuted cursor-not-allowed'
                      : 'bg-metro-bg border border-metro-border text-metro-text hover:border-metro-blue'
                  }`}
                >
                  {statusLabels[s].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleToggleLockdown(selectedGate.id)}
              disabled={status !== 'playing'}
              className={`w-full p-2 rounded text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                status !== 'playing'
                  ? 'bg-metro-border/30 text-metro-textMuted cursor-not-allowed'
                  : hasLockdown
                  ? 'bg-metro-red text-white hover:bg-red-600'
                  : 'bg-metro-orange text-white hover:bg-orange-600'
              }`}
            >
              {hasLockdown ? (
                <>
                  <Unlock size={14} />
                  解除封控
                </>
              ) : (
                <>
                  <Lock size={14} />
                  设置封控区
                </>
              )}
            </button>

            {diversionRoute ? (
              <div className="p-2 bg-metro-blue/10 border border-metro-blue rounded">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-metro-text">
                    分流至: {exits.find((e) => e.id === diversionRoute.toExitId)?.name}
                  </span>
                  <button
                    onClick={handleClearDiversion}
                    disabled={status !== 'playing'}
                    className="p-1 hover:bg-metro-red/20 rounded"
                  >
                    <X size={14} className="text-metro-red" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDiversionModal(true)}
                disabled={status !== 'playing'}
                className={`w-full p-2 rounded text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  status !== 'playing'
                    ? 'bg-metro-border/30 text-metro-textMuted cursor-not-allowed'
                    : 'bg-metro-blue text-white hover:bg-blue-600'
                }`}
              >
                <Navigation size={14} />
                设置分流路线
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-metro-textMuted text-sm">
          点击上方闸机选择
        </div>
      )}

      {showDiversionModal && selectedGate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-metro-bgLight border border-metro-border rounded-lg p-4 w-80">
            <h4 className="font-bold text-metro-text mb-3">选择分流出口</h4>
            <div className="space-y-2">
              {exits.map((exit) => (
                <button
                  key={exit.id}
                  onClick={() => handleSetDiversion(exit.id)}
                  className="w-full p-3 rounded bg-metro-bg border border-metro-border text-left hover:border-metro-blue transition-all"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-metro-text">{exit.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        exit.congestionLevel > 0.6
                          ? 'bg-metro-red/20 text-metro-red'
                          : exit.congestionLevel > 0.4
                          ? 'bg-metro-yellow/20 text-metro-yellow'
                          : 'bg-metro-green/20 text-metro-green'
                      }`}
                    >
                      拥堵 {Math.round(exit.congestionLevel * 100)}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDiversionModal(false)}
              className="w-full mt-3 p-2 rounded bg-metro-border text-metro-text hover:bg-metro-border/80 transition-all"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
