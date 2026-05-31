import SpacecraftPanel from '@/components/SpacecraftPanel';
import OrbitSelector from '@/components/OrbitSelector';
import FlightLogTimeline from '@/components/FlightLogTimeline';
import WindowCountdown from '@/components/WindowCountdown';
import ViolationAlert from '@/components/ViolationAlert';
import { useGameStore } from '@/store/gameStore';
import { useNavigate } from 'react-router-dom';
import { Rocket, RotateCcw, CheckCircle } from 'lucide-react';

export default function MissionDesk() {
  const navigate = useNavigate();
  const spacecraft = useGameStore(s => s.spacecraft);
  const selectedSpacecraftId = useGameStore(s => s.selectedSpacecraftId);
  const currentViolations = useGameStore(s => s.currentViolations);
  const settleMission = useGameStore(s => s.settleMission);
  const resetGame = useGameStore(s => s.resetGame);
  const gamePhase = useGameStore(s => s.gamePhase);
  const missionResults = useGameStore(s => s.missionResults);

  const handleSettle = () => {
    if (!selectedSpacecraftId) return;
    settleMission(selectedSpacecraftId);
  };

  const handleViewResult = (scId: string) => {
    const result = missionResults.find(m => m.spacecraftId === scId);
    if (result) navigate(`/review/${result.id}`);
  };

  return (
    <div className="h-screen flex flex-col star-bg">
      <header className="flex items-center justify-between px-6 py-3 border-b border-space-border bg-space-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Rocket className="w-6 h-6 text-star-blue" />
          <h1 className="font-orbitron text-xl text-white tracking-wider">太空轨道预算赛</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/data')}
            className="px-4 py-1.5 rounded-full text-sm text-gray-300 border border-space-border hover:border-star-blue/40 hover:text-star-blue transition-colors"
          >
            数据管理
          </button>
          <button
            onClick={resetGame}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm text-gray-300 border border-space-border hover:border-engine-orange/40 hover:text-engine-orange transition-colors"
          >
            <RotateCcw size={14} />
            重置
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-0 overflow-hidden">
        <aside className="w-72 flex-shrink-0 border-r border-space-border bg-space-panel/50 overflow-y-auto scrollbar-thin">
          <div className="px-3 py-2 border-b border-space-border">
            <h2 className="font-orbitron text-xs text-star-blue tracking-wider">航天器</h2>
          </div>
          <SpacecraftPanel />
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-space-border">
            <div className="flex items-center gap-4">
              <WindowCountdown />
              {selectedSpacecraftId && gamePhase === 'playing' && (
                <button
                  onClick={handleSettle}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full font-orbitron text-sm text-white bg-star-blue/20 border border-star-blue/50 hover:bg-star-blue/30 hover:shadow-[0_0_16px_rgba(79,195,247,0.3)] transition-all"
                >
                  <CheckCircle size={16} />
                  结算任务
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {spacecraft.map(sc => {
                const result = missionResults.find(m => m.spacecraftId === sc.id);
                if (!result) return null;
                const statusColor = result.status === 'success' ? 'text-orbit-green' : result.status === 'partial' ? 'text-engine-orange' : 'text-warning-red';
                return (
                  <button
                    key={sc.id}
                    onClick={() => handleViewResult(sc.id)}
                    className={`text-xs px-3 py-1 rounded-full border border-space-border hover:border-star-blue/40 transition-colors ${statusColor}`}
                  >
                    {sc.name} 结果
                  </button>
                );
              })}
            </div>
          </div>

          {currentViolations.length > 0 && (
            <div className="px-6 py-3 border-b border-space-border bg-warning-red/5">
              <ViolationAlert />
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <OrbitSelector />
          </div>
        </main>

        <aside className="w-80 flex-shrink-0 border-l border-space-border bg-space-panel/50 overflow-hidden">
          <FlightLogTimeline />
        </aside>
      </div>
    </div>
  );
}
