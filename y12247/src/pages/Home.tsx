import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import ShipCanvas from '@/components/ShipCanvas';
import CargoPanel from '@/components/CargoPanel';
import Dashboard from '@/components/Dashboard';
import BallastControl from '@/components/BallastControl';
import VoyageEvaluation from '@/components/VoyageEvaluation';
import ViolationAlert from '@/components/ViolationAlert';
import { levels } from '@/data/levels';

export default function Home() {
  const navigate = useNavigate();
  const {
    currentLevelIndex,
    cargos,
    tanks,
    shipState,
    violations,
    submitted,
    showEvaluation,
    alertViolations,
    selectLevel,
    loadCargo,
    unloadCargo,
    moveCargo,
    adjustBallast,
    submitVoyage,
    closeEvaluation,
    dismissAlert,
    resetLevel,
    getCurrentConfig,
  } = useGameStore();

  const [selectedCargoId, setSelectedCargoId] = useState<string | null>(null);
  const [showBallast, setShowBallast] = useState(false);

  const config = getCurrentConfig();
  const loadedCount = cargos.filter(c => c.loaded).length;

  const handleDropCargo = useCallback(
    (cargoId: string, row: number, col: number) => {
      loadCargo(cargoId, row, col);
      setSelectedCargoId(null);
    },
    [loadCargo]
  );

  const handleCanvasClick = useCallback(
    (row: number, col: number) => {
      if (selectedCargoId) {
        const occupied = cargos.some(c => c.loaded && c.position?.row === row && c.position?.col === col);
        if (!occupied) {
          loadCargo(selectedCargoId, row, col);
          setSelectedCargoId(null);
        }
      }
    },
    [selectedCargoId, cargos, loadCargo]
  );

  return (
    <div className="h-screen flex flex-col bg-[#0A1628] text-slate-100 overflow-hidden relative">
      <ViolationAlert violations={alertViolations} onDismiss={dismissAlert} />

      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold font-['Oswald'] uppercase tracking-wider text-orange-400">
            浮力货轮装载赛
          </h1>
          <div className="flex gap-1">
            {levels.map((level, i) => (
              <button
                key={level.id}
                onClick={() => { selectLevel(i); setSelectedCargoId(null); }}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  i === currentLevelIndex
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {level.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBallast(!showBallast)}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              showBallast
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            💧 压载水
          </button>
          <button
            onClick={() => { resetLevel(); setSelectedCargoId(null); }}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
          >
            🔄 重置
          </button>
          <button
            onClick={submitVoyage}
            disabled={submitted || loadedCount === 0}
            className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
              submitted || loadedCount === 0
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-500 shadow-lg shadow-orange-600/30'
            }`}
          >
            {submitted ? '已提交' : '🚢 提交评估'}
          </button>
        </div>
      </header>

      <div className="px-6 py-3 shrink-0">
        <Dashboard
          shipState={shipState}
          violations={violations}
          config={config}
          loadedCount={loadedCount}
          totalCargo={cargos.length}
        />
      </div>

      {showBallast && (
        <div className="px-6 py-3 shrink-0 border-t border-slate-700/30">
          <BallastControl tanks={tanks} onAdjust={adjustBallast} submitted={submitted} />
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 p-4 relative">
          <div className="absolute top-3 left-4 z-10 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-slate-300 border border-slate-700/50">
            {config.name} · {config.description}
          </div>
          <div className="absolute bottom-3 left-4 z-10 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-slate-500 border border-slate-700/50">
            {selectedCargoId ? '🎯 点击网格放置货物 · 按 Esc 取消' : `选择货物 → 点击网格放置 · 右键卸载 · ${config.gridRows}×${config.gridCols} 网格`}
          </div>
          <ShipCanvas
            cargos={cargos}
            tanks={tanks}
            shipState={shipState}
            config={config}
            onDropCargo={handleDropCargo}
            onMoveCargo={moveCargo}
            onUnloadCargo={unloadCargo}
            draggedCargoId={selectedCargoId}
            onGridClick={handleCanvasClick}
          />
        </div>

        <CargoPanel
          cargos={cargos}
          selectedCargoId={selectedCargoId}
          onSelect={setSelectedCargoId}
          onUnload={unloadCargo}
          submitted={submitted}
        />
      </div>

      {showEvaluation && (
        <VoyageEvaluation
          score={useGameStore.getState().reports.slice(-1)[0]?.score ?? 0}
          violations={violations}
          cargos={cargos}
          tanks={tanks}
          onClose={closeEvaluation}
          onViewReport={() => {
            closeEvaluation();
            navigate('/report');
          }}
        />
      )}
    </div>
  );
}
