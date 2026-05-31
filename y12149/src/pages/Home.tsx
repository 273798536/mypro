import React, { useEffect } from 'react';
import { Droplets } from 'lucide-react';
import { PipeNetwork } from '@/components/PipeNetwork';
import { ValveTimeline } from '@/components/ValveTimeline';
import { PressureChart } from '@/components/PressureChart';
import { IssuePanel } from '@/components/IssuePanel';
import { PlaybackControls } from '@/components/PlaybackControls';
import { useSimulationStore } from '@/store/simulationStore';

export default function Home() {
  const { play, pause, reset, stepTime, isPlaying } = useSimulationStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (isPlaying) {
            pause();
          } else {
            play();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          useSimulationStore.getState().clearPausedIssue();
          stepTime(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          useSimulationStore.getState().clearPausedIssue();
          stepTime(1);
          break;
        case 'KeyR':
          e.preventDefault();
          reset();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [play, pause, reset, isPlaying]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">管网瞬变水锤模拟演示系统</h1>
            <p className="text-[11px] text-slate-400 font-mono">
              Water Hammer Transient Simulation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[11px] text-slate-400">演示案例</div>
            <div className="text-sm font-mono font-bold text-amber-400">
              阀门时间错 + 传感器漂移
            </div>
          </div>
          <div className="h-8 w-px bg-slate-600"></div>
          <div className="text-[10px] font-mono text-slate-400 text-right">
            <div>快捷键: 空格=播放/暂停</div>
            <div>← →=步进 R=重置</div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
        <div className="flex-1 flex gap-4 min-h-0">
          <div className="w-3/5 flex flex-col gap-4 min-h-0">
            <div className="flex-1 min-h-0">
              <PipeNetwork />
            </div>
            <div className="h-[260px] flex-shrink-0">
              <ValveTimeline />
            </div>
          </div>

          <div className="w-2/5 flex flex-col gap-4 min-h-0">
            <div className="h-[340px] flex-shrink-0">
              <PressureChart />
            </div>
            <div className="flex-1 min-h-0">
              <IssuePanel />
            </div>
          </div>
        </div>
      </main>

      <PlaybackControls />
    </div>
  );
}
