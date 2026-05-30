import { useEffect } from 'react';
import { Canvas } from '@/components/game/Canvas';
import { ParticleCannon } from '@/components/game/ParticleCannon';
import { EnergyBar } from '@/components/game/EnergyBar';
import { ControlBar } from '@/components/game/ControlBar';
import { ErrorToast } from '@/components/ui/ErrorToast';
import { ResultPage } from './ResultPage';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useGameStore, useScore, useEnergy, useOreBlocks } from '@/store/useGameStore';
import { useUIStore } from '@/store/useUIStore';
import { Atom, Zap, Trophy } from 'lucide-react';

export function GamePage() {
  useGameLoop();
  
  const score = useScore();
  const energy = useEnergy();
  const oreBlocks = useOreBlocks();
  const status = useGameStore((state) => state.status);
  const currentRound = useGameStore((state) => state.currentRound);
  const isReplaying = useUIStore((state) => state.isReplaying);
  
  const collectedCount = oreBlocks.filter(o => o.collected).length;
  const totalCount = oreBlocks.length;
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReplaying) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (status === 'idle') {
            useGameStore.getState().launchParticle();
          } else if (status === 'playing') {
            useGameStore.getState().pauseGame();
          } else if (status === 'paused') {
            useGameStore.getState().resumeGame();
          }
          break;
        case 'KeyR':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (confirm('确定要重新开始吗？')) {
              useGameStore.getState().resetGame();
              useUIStore.getState().resetUI();
            }
          }
          break;
        case 'Escape':
          if (status === 'playing') {
            useGameStore.getState().pauseGame();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, isReplaying]);
  
  return (
    <div className="min-h-screen bg-lab-bg text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-neon-green/20 rounded-xl">
                <Atom size={32} className="text-neon-green" />
              </div>
              <div>
                <h1 className="font-pixel text-xl text-neon-green">
                  粒子碰撞采矿场
                </h1>
                <p className="font-mono text-sm text-gray-400 mt-1">
                  Particle Collision Mining Facility
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-lab-panel border-2 border-lab-border rounded-lg px-4 py-2">
                <Trophy size={18} className="text-ore-gold" />
                <div>
                  <div className="font-pixel text-lg text-ore-gold">
                    {score.totalScore}
                  </div>
                  <div className="font-mono text-xs text-gray-500">得分</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-lab-panel border-2 border-lab-border rounded-lg px-4 py-2">
                <Zap size={18} className="text-neon-orange" />
                <div>
                  <div className="font-mono text-sm text-white">
                    第 {currentRound} 轮
                  </div>
                  <div className="font-mono text-xs text-gray-500">
                    矿石 {collectedCount}/{totalCount}
                  </div>
                </div>
              </div>
              
              <div className={`
                px-3 py-1 rounded font-mono text-xs
                ${status === 'idle' ? 'bg-gray-600 text-gray-300' : ''}
                ${status === 'playing' ? 'bg-neon-green/20 text-neon-green animate-pulse' : ''}
                ${status === 'paused' ? 'bg-neon-orange/20 text-neon-orange' : ''}
                ${status === 'finished' ? 'bg-neon-blue/20 text-neon-blue' : ''}
                ${isReplaying ? 'bg-neon-blue/20 text-neon-blue' : ''}
              `}>
                {isReplaying ? '复盘模式' : 
                 status === 'idle' ? '准备发射' :
                 status === 'playing' ? '模拟中...' :
                 status === 'paused' ? '已暂停' : '已完成'}
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex gap-4 mb-4">
          <ParticleCannon />
          
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Canvas />
              </div>
              <EnergyBar />
            </div>
            
            <ControlBar />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center font-mono text-xs text-gray-500">
          <div className="bg-lab-panel/50 border border-lab-border rounded-lg p-3">
            <div className="text-neon-green font-bold mb-1">快捷键</div>
            <div>空格键 - 发射/暂停 | ESC - 暂停</div>
          </div>
          <div className="bg-lab-panel/50 border border-lab-border rounded-lg p-3">
            <div className="text-neon-orange font-bold mb-1">物理定律</div>
            <div>动量守恒 | 能量守恒 | 弹性碰撞</div>
          </div>
          <div className="bg-lab-panel/50 border border-lab-border rounded-lg p-3">
            <div className="text-neon-blue font-bold mb-1">剩余能量</div>
            <div>{energy.remaining.toFixed(1)} J / {energy.maxEnergy} J</div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-lab-panel/30 border border-lab-border rounded-lg">
          <div className="font-mono text-xs text-gray-400 text-center">
            <span className="text-neon-green">实验记录:</span> 选择粒子类型 → 调整角度和功率 → 发射 → 观察碰撞 → 遵守物理定律获得高分
          </div>
        </div>
      </div>
      
      <ErrorToast />
      <ResultPage />
    </div>
  );
}
