import { useState } from 'react';
import { RainEffect } from '../components/RainEffect';
import { ControlBar } from '../components/ControlBar';
import { CityStatusPanel } from '../components/CityStatusPanel';
import { CardHand } from '../components/CardHand';
import { EventChainPanel } from '../components/EventChainPanel';
import { EventLog } from '../components/EventLog';
import { SettlementPage } from '../components/SettlementPage';
import { HelpModal } from '../components/HelpModal';
import { useGameStore } from '../store/useGameStore';

export default function Home() {
  const { status, restartGame, setReplayMode } = useGameStore();
  const [showHelp, setShowHelp] = useState(false);

  const showSettlement = status === 'settled';

  const handleCloseSettlement = () => {
    setReplayMode(false);
  };

  const handleRestart = () => {
    restartGame();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <RainEffect />

      {showSettlement ? (
        <SettlementPage onClose={handleCloseSettlement} onRestart={handleRestart} />
      ) : (
        <>
          <ControlBar onHelp={() => setShowHelp(true)} />

          <div className="flex-1 flex gap-4 p-4 pt-2 pb-0 overflow-hidden">
            <div className="w-80 flex-shrink-0">
              <CityStatusPanel />
            </div>

            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <div className="flex-1 glass rounded-2xl p-6 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">事件日志</h2>
                  <span className="text-xs text-slate-400">实时记录所有操作与事件</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <EventLog />
                </div>
              </div>
            </div>

            <div className="w-96 flex-shrink-0">
              <EventChainPanel />
            </div>
          </div>

          <CardHand />
        </>
      )}

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
