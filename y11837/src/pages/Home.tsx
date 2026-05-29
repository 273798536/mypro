import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import WarehouseGrid from '@/components/WarehouseGrid';
import RobotStatus from '@/components/RobotStatus';
import OrderQueue from '@/components/OrderQueue';
import ControlPanel from '@/components/ControlPanel';
import TimeoutModal from '@/components/TimeoutModal';
import SettlementPanel from '@/components/SettlementPanel';
import ReplayPanel from '@/components/ReplayPanel';

export default function Home() {
  const phase = useGameStore(s => s.state.phase);
  const tick = useGameStore(s => s.state.tick);
  const speed = useGameStore(s => s.speed);
  const isReplaying = useGameStore(s => s.isReplaying);
  const gameTick = useGameStore(s => s.tick);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== 'running') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const ms = 1000 / speed;
    intervalRef.current = setInterval(() => {
      gameTick();
    }, ms);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase, speed, gameTick]);

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      <header className="border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
              仓
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">机器人仓库拣货赛</h1>
              <p className="text-zinc-500 text-xs">训练电量意识与堵塞判断</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {phase === 'running' && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400">进行中</span>
              </div>
            )}
            {phase === 'paused' && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-xs text-yellow-400">已暂停</span>
              </div>
            )}
            {phase === 'setup' && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-xs text-zinc-400">准备中</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex gap-6 p-6 max-w-[1200px] mx-auto">
        <div className="flex-shrink-0">
          <WarehouseGrid />
        </div>

        <div className="flex-1 flex flex-col gap-4 min-w-[280px] max-w-[320px]">
          <ControlPanel />
          <RobotStatus />
          <OrderQueue />
        </div>
      </main>

      <TimeoutModal />
      <SettlementPanel />
      <ReplayPanel />
    </div>
  );
}
