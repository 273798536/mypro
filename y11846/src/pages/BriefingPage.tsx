import { useNavigate } from 'react-router-dom';
import { Map, Zap, Target, Wind, Play, CloudLightning } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { levels } from '@/data/levels';

export default function BriefingPage() {
  const navigate = useNavigate();
  const { selectLevel, selectedLevelId, switchToWindFieldV2, windFieldVersion } = useGameStore();

  const handleSelectLevel = (levelId: string) => {
    selectLevel(levelId);
  };

  const handleStartPlanning = () => {
    navigate('/plan');
  };

  const selectedLevel = levels.find((l) => l.id === selectedLevelId);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            无人机航拍避障赛
          </h1>
          <p className="text-slate-400">练习路线规划 · 理解风场影响 · 掌握返航余量</p>
        </header>

        <div className="grid grid-cols-3 gap-6 mb-8">
          {levels.map((level) => (
            <div
              key={level.id}
              onClick={() => handleSelectLevel(level.id)}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                selectedLevelId === level.id
                  ? 'border-cyan-400 bg-slate-800/80 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Map className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{level.name}</h3>
                  <p className="text-xs text-slate-400">{level.waypoints.length} 个航点</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-4">{level.description}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-700/50 rounded p-2 text-center">
                  <Target className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                  <div>{level.waypoints.length}</div>
                  <div className="text-slate-400">航点</div>
                </div>
                <div className="bg-slate-700/50 rounded p-2 text-center">
                  <CloudLightning className="w-4 h-4 mx-auto mb-1 text-red-400" />
                  <div>{level.noFlyZones.length}</div>
                  <div className="text-slate-400">禁飞区</div>
                </div>
                <div className="bg-slate-700/50 rounded p-2 text-center">
                  <Zap className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
                  <div>{level.choicePoints.length}</div>
                  <div className="text-slate-400">选择点</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedLevel && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              任务简报 — {selectedLevel.name}
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-cyan-400 mb-3">航线目标</h3>
                <ul className="space-y-2 text-sm">
                  {selectedLevel.waypoints.map((wp, i) => (
                    <li key={wp.id} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <span>{wp.label}</span>
                      {wp.isRequired && <span className="text-xs text-amber-400">(必达)</span>}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-amber-400 mb-3">约束条件</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span>最低返航电量: {selectedLevel.minReturnBattery}%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-blue-400" />
                    <span>逆风耗电系数: ×{selectedLevel.headwindMultiplier}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CloudLightning className="w-4 h-4 text-red-400" />
                    <span>禁飞区数量: {selectedLevel.noFlyZones.length}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Map className="w-4 h-4 text-emerald-400" />
                    <span>地图尺寸: {selectedLevel.gridSize.width}×{selectedLevel.gridSize.height}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          {windFieldVersion === 1 && (
            <button
              onClick={switchToWindFieldV2}
              className="px-6 py-3 bg-amber-500/20 text-amber-400 border border-amber-500/50 rounded-lg hover:bg-amber-500/30 transition-all flex items-center gap-2"
            >
              <Wind className="w-5 h-5" />
              补一份风场（第二版）
            </button>
          )}
          <button
            onClick={handleStartPlanning}
            className="px-8 py-3 bg-cyan-500 text-slate-900 font-bold rounded-lg hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            开始规划路线
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>💡 提示：第一次试飞后补风场，第二次运行会标出风场变化区域</p>
        </div>
      </div>
    </div>
  );
}
