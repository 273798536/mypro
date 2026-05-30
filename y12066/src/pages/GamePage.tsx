import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrbitalCanvas from '@/components/OrbitalCanvas';
import FuelBar from '@/components/FuelBar';
import ControlPanel from '@/components/ControlPanel';
import MissionLog from '@/components/MissionLog';
import BadRowPanel from '@/components/BadRowPanel';
import { useGameStore } from '@/store/gameStore';
import { Rocket, FileText, BarChart3 } from 'lucide-react';

export default function GamePage() {
  const { phase, initGame, missionComplete, spacecraft, goToSettlement } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (phase === 'setup') {
      initGame();
    }
  }, [phase, initGame]);

  useEffect(() => {
    if (phase === 'finished') {
      navigate('/settlement');
    }
  }, [phase, navigate]);

  const handleViewSettlement = () => {
    goToSettlement();
    navigate('/settlement');
  };

  return (
    <div className="h-full flex flex-col bg-space-900">
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Rocket className="w-5 h-5 text-orbit-gold" />
          <h1 className="font-display text-lg tracking-wider text-orbit-gold">
            航天器轨道转移棋
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {missionComplete && (
            <button
              onClick={handleViewSettlement}
              className="flex items-center gap-2 px-4 py-1.5 bg-orbit-gold/20 text-orbit-gold rounded hover:bg-orbit-gold/30 transition-colors text-sm font-body"
            >
              <BarChart3 className="w-4 h-4" />
              查看结算
            </button>
          )}
          <button
            onClick={() => navigate('/settlement')}
            className="flex items-center gap-2 px-3 py-1.5 text-white/50 hover:text-white/80 transition-colors text-sm font-body"
          >
            <FileText className="w-4 h-4" />
            结算
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <OrbitalCanvas />
          <div className="absolute bottom-4 left-4 z-10">
            <BadRowPanel />
          </div>
        </div>

        <div className="w-20 flex flex-col items-center justify-center gap-2 border-l border-white/5 bg-space-800/30 px-2">
          <FuelBar />
        </div>

        <div className="w-80 flex flex-col border-l border-white/5 overflow-y-auto">
          <div className="p-3">
            <ControlPanel />
          </div>
          <div className="flex-1 px-3 pb-3 overflow-hidden">
            <MissionLog />
          </div>
        </div>
      </div>
    </div>
  );
}
