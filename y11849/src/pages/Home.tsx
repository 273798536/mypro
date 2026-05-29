import { GameCanvas } from '../components/game/GameCanvas';
import { HUDPanel } from '../components/game/HUDPanel';
import { GameControls } from '../components/game/GameControls';
import { SampleSlot } from '../components/rhythm/SampleSlot';
import { RhythmTrack } from '../components/rhythm/RhythmTrack';
import { ResultPage } from '../components/result/ResultPage';
import { useKeyboard } from '../hooks/useKeyboard';
import { Rocket } from 'lucide-react';

export const Home = () => {
  useKeyboard();

  return (
    <div className="min-h-screen bg-space-dark p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-neon-cyan font-orbitron flex items-center justify-center gap-3">
            <Rocket className="w-8 h-8" />
            太空音乐采样器
            <Rocket className="w-8 h-8 transform scale-x-[-1]" />
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            收集星球声音采样，创作你的太空节奏
          </p>
        </div>

        <HUDPanel />

        <div className="flex justify-center mb-4">
          <GameCanvas />
        </div>

        <div className="space-y-4">
          <SampleSlot />
          <RhythmTrack />
        </div>

        <GameControls />

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>操作说明: WASD 或 方向键 控制飞船移动 | 点击采样选择 | 点击节奏轨放置采样</p>
        </div>
      </div>

      <ResultPage />
    </div>
  );
};
