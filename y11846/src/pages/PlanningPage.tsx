import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Battery, Wind, Zap, RotateCcw } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import MapCanvas from '@/components/MapCanvas';
import BatteryPanel from '@/components/BatteryPanel';
import WindInfo from '@/components/WindInfo';

export default function PlanningPage() {
  const navigate = useNavigate();
  const {
    currentLevel,
    plannedWaypoints,
    flightSegments,
    windFieldVersion,
    windChanges,
    startFlight,
    updatePlannedWaypoints,
    resetGame,
  } = useGameStore();

  if (!currentLevel) {
    navigate('/');
    return null;
  }

  const totalEstimatedCost = flightSegments.reduce((sum, s) => sum + s.actualPowerCost, 0);
  const headwindSegments = flightSegments.filter((s) => s.isHeadwind);
  const changedSegments = flightSegments.filter((s) => s.windChanged);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      <div className="flex-1 p-4">
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">飞行规划 — {currentLevel.name}</h1>
            {windFieldVersion === 2 && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-sm rounded-full border border-amber-500/30">
                风场 v2
              </span>
            )}
            <button
              onClick={resetGame}
              className="ml-auto p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all flex items-center gap-2 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
          </div>

          <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
            <MapCanvas
              gridSize={currentLevel.gridSize}
              waypoints={plannedWaypoints}
              noFlyZones={currentLevel.noFlyZones}
              windField={currentLevel.windField}
              dronePosition={null}
              droneHeading={0}
              plannedPath={plannedWaypoints}
              home={currentLevel.home}
              windChanges={windChanges}
              showWindOverlay={true}
              editable={true}
              onWaypointsChange={updatePlannedWaypoints}
            />
          </div>
        </div>
      </div>

      <div className="w-80 bg-slate-800/50 border-l border-slate-700 p-4 flex flex-col gap-4">
        <div className="bg-slate-900 rounded-xl p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Battery className="w-4 h-4 text-green-400" />
            电量预估
          </h3>
          <BatteryPanel
            battery={currentLevel.batteryCapacity - totalEstimatedCost}
            drainRate={currentLevel.baseDrainRate}
            isHeadwind={headwindSegments.length > 0}
            headwindCoefficient={currentLevel.headwindMultiplier}
            minReturnBattery={currentLevel.minReturnBattery}
            maxBattery={currentLevel.batteryCapacity}
          />
          <div className="mt-3 text-xs text-slate-400 space-y-1">
            <div>预估总耗电: <span className="text-white">{totalEstimatedCost.toFixed(1)}%</span></div>
            <div>最低返航余量: <span className="text-amber-400">{currentLevel.minReturnBattery}%</span></div>
            <div>剩余可用: <span className={currentLevel.batteryCapacity - totalEstimatedCost > currentLevel.minReturnBattery ? 'text-green-400' : 'text-red-400'}>
              {(currentLevel.batteryCapacity - totalEstimatedCost - currentLevel.minReturnBattery).toFixed(1)}%
            </span></div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Wind className="w-4 h-4 text-blue-400" />
            当前风场
          </h3>
          <WindInfo
            windDirection={currentLevel.windField.segments[0]?.direction || 0}
            windSpeed={currentLevel.windField.segments[0]?.speed || 0}
            isHeadwind={false}
          />
          {windFieldVersion === 2 && (
            <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">
              ⚠ 风场已变更，{windChanges.length} 个区域调整
            </div>
          )}
        </div>

        <div className="bg-slate-900 rounded-xl p-4 flex-1 overflow-auto">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            航线分段
          </h3>
          <div className="space-y-2">
            {flightSegments.map((seg, i) => (
              <div
                key={i}
                className={`p-2 rounded text-xs border ${
                  seg.windChanged
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : seg.isHeadwind
                    ? 'border-orange-500/30 bg-orange-500/10'
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{seg.fromWaypoint} → {seg.toWaypoint}</span>
                  <span className={seg.isHeadwind ? 'text-orange-400' : 'text-slate-400'}>
                    {seg.actualPowerCost.toFixed(1)}%
                  </span>
                </div>
                {seg.isHeadwind && (
                  <div className="text-orange-400 mt-1">
                    逆风 ×{seg.headwindCoefficient.toFixed(1)}
                  </div>
                )}
                {seg.windChanged && (
                  <div className="text-amber-400 mt-1 text-amber-400">
                    风场已变更
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {changedSegments.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400">
              ⚠ 本段航线受风场变更影响，耗电计算已更新
            </div>
          )}
          {headwindSegments.length > 0 && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-xs text-orange-400">
              💡 规划时有 {headwindSegments.length} 段逆风，建议调整航线避开强逆风区
            </div>
          )}
          <button
            onClick={() => navigate('/fly')}
            className="w-full py-3 bg-cyan-500 text-slate-900 font-bold rounded-lg hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            起飞执行
          </button>
        </div>
      </div>
    </div>
  );
}
