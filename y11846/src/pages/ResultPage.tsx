import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Download, Wind } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import ScoreBreakdownView from '@/components/ScoreBreakdownView';
import MapCanvas from '@/components/MapCanvas';

export default function ResultPage() {
  const navigate = useNavigate();
  const {
    currentLevel,
    plannedWaypoints,
    flightSegments,
    scoreBreakdown,
    flightReport,
    flightSuccess,
    batteryRemaining,
    windFieldVersion,
    windChanges,
    resetGame,
    downloadReport,
  } = useGameStore();

  if (!currentLevel || !scoreBreakdown) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        <header className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">飞行结果 — {currentLevel.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                flightSuccess
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {flightSuccess ? '✅ 飞行成功' : '❌ 飞行失败'}
              </span>
              <span className="text-slate-400 text-sm">
                剩余电量: {batteryRemaining.toFixed(1)}%
              </span>
              {windFieldVersion === 2 && (
                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-sm rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Wind className="w-3 h-3" />
                  风场 v2 — {windChanges.length} 处变更
                </span>
              )}
            </div>
          </div>
          <div className="ml-auto flex gap-3">
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重新开始
            </button>
            {flightReport && (
              <button
                onClick={downloadReport}
                className="px-4 py-2 bg-cyan-500 text-slate-900 font-medium rounded-lg hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                下载报告
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="font-bold mb-3">飞行轨迹回放</h3>
              <div className="aspect-square bg-slate-900 rounded-lg overflow-hidden">
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
                  editable={false}
                  onWaypointsChange={() => {}}
                />
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="font-bold mb-3 text-cyan-400">航点执行摘要</h3>
              <div className="space-y-2 text-sm">
                {plannedWaypoints.map((wp, i) => (
                  <div key={wp.id} className="flex items-center gap-3 p-2 bg-slate-900 rounded">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span className="flex-1">{wp.label}</span>
                    {flightSegments[i] && (
                      <span className={`text-xs ${
                        flightSegments[i].isHeadwind ? 'text-orange-400' : 'text-slate-400'
                      }`}>
                        {flightSegments[i].actualPowerCost.toFixed(1)}%
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-3 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center">
                    🏠
                  </span>
                  <span className="flex-1">返航点</span>
                  <span className="text-xs text-emerald-400">
                    剩余 {batteryRemaining.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-3">
            <ScoreBreakdownView
              score={scoreBreakdown}
              segments={flightSegments}
              windFieldVersion={windFieldVersion}
              windChanges={windChanges}
              onDownload={downloadReport}
            />
          </div>
        </div>

        <div className="mt-6 p-4 bg-slate-800 rounded-xl border border-slate-700">
          <h3 className="font-bold mb-2 text-amber-400">📋 航拍队长转述要点</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
            <div>
              <strong className="text-orange-400">逆风耗电:</strong> 逆风时耗电系数可达 ×{currentLevel.headwindMultiplier}，
              每段逆风都有具体计算说明，不是模糊的"耗电多"。
            </div>
            <div>
              <strong className="text-red-400">禁飞区:</strong> 穿越禁飞区会实时弹窗警告，
              每次违规都记录在报告中，违规一次扣 5 分。
            </div>
            <div>
              <strong className="text-amber-400">返航余量:</strong> 最低返航电量 {currentLevel.minReturnBattery}%，
              低于阈值时弹出橙色警告，提示逆风已多消耗的电量百分比。
            </div>
            <div>
              <strong className="text-cyan-400">风场变更:</strong> 第二次补风场后，
              地图上用虚线边框标出 {windChanges.length} 个变更区域，航线段旁标注"风场已变更"。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
