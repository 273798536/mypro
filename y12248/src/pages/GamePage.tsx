import { useEffect } from 'react';
import { ControlBar } from '../components/game/ControlBar';
import { CacheMenu } from '../components/game/CacheMenu';
import { OrderQueue } from '../components/game/OrderQueue';
import { SourceStation } from '../components/game/SourceStation';
import { StatusPanel } from '../components/game/StatusPanel';
import { EventLog } from '../components/game/EventLog';
import { useGameLoop } from '../hooks/useGameLoop';
import { useGameStore } from '../store/gameStore';

export function GamePage() {
  const { status } = useGameStore();
  const { getCurrentGameTime } = useGameLoop();

  useEffect(() => {
    if (status === 'playing') {
      const interval = setInterval(() => {
        getCurrentGameTime();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, getCurrentGameTime]);

  return (
    <div className="h-screen flex flex-col bg-[#2D2A26] overflow-hidden">
      <ControlBar />
      
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        <div className="w-[30%]">
          <CacheMenu />
        </div>
        
        <div className="w-[40%]">
          <OrderQueue />
        </div>
        
        <div className="w-[30%]">
          <SourceStation />
        </div>
      </div>
      
      <StatusPanel />
      <EventLog />
    </div>
  );
}
