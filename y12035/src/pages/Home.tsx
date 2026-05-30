import React, { useState, useEffect } from 'react';
import { GameCanvas } from '@/components/GameCanvas';
import { StatusPanel } from '@/components/StatusPanel';
import { ReviewPanel } from '@/components/ReviewPanel';
import { CorrectionToast } from '@/components/CorrectionToast';
import { LevelSelector } from '@/components/LevelSelector';
import { useGameStore } from '@/store/gameStore';

export default function Home() {
  const [showLevelSelector, setShowLevelSelector] = useState(true);
  const { initGame } = useGameStore();

  useEffect(() => {
    initGame(1);
  }, [initGame]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
      <div className="flex gap-6 items-start">
        <div className="flex flex-col gap-4">
          <GameCanvas />
          <div className="text-center text-gray-500 text-sm">
            提示：点击"发射债券球"开始，让债券球碰撞不同颜色的利率挡板
          </div>
        </div>
        <StatusPanel />
      </div>
      <ReviewPanel />
      <CorrectionToast />
      {showLevelSelector && (
        <LevelSelector onSelect={() => setShowLevelSelector(false)} />
      )}
    </div>
  );
}