import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flag, AlertCircle } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { CircuitGrid } from '../components/game/CircuitGrid';
import { ControlPanel } from '../components/game/ControlPanel';
import { StatusBar } from '../components/game/StatusBar';
import { ReplayTimeline } from '../components/game/ReplayTimeline';
import { cn } from '../lib/utils';
import { checkCircuitConnectivity, checkLoadPowered } from '../engine/CircuitSimulator';

export const GamePage: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  
  const {
    gameState,
    startGame,
    tick,
    endGame,
    currentLevel,
    isReplaying,
  } = useGameStore();
  
  const { grid, powerNodes, loadNodes, isGameOver, gameResult, isPaused } = gameState;

  useEffect(() => {
    if (levelId) {
      startGame(levelId);
    }
  }, [levelId, startGame]);

  const handleTick = useCallback((deltaTime: number) => {
    tick(deltaTime);
    
    const state = useGameStore.getState();
    if (state.gameState.isGameOver || state.gameState.isPaused || state.isReplaying) return;
    
    const { poweredCells } = checkCircuitConnectivity(state.gameState.grid, state.gameState.powerNodes);
    const { allPowered } = checkLoadPowered(
      state.gameState.grid,
      state.gameState.loadNodes,
      poweredCells
    );
    
    if (allPowered && state.gameState.consumedPower < state.gameState.totalPower) {
      endGame('win');
    }
  }, [tick, endGame]);

  useGameLoop({
    onTick: handleTick,
    isActive: !isGameOver && !isPaused && !isReplaying && grid.length > 0,
    tickRate: 30,
  });

  const handleEndGame = (result: 'win' | 'lose') => {
    endGame(result);
    setTimeout(() => {
      navigate('/settlement');
    }, 1500);
  };

  if (!currentLevel) {
    return (
      <div className="min-h-screen bg-circuit-bg flex items-center justify-center">
        <div className="text-center text-text-secondary">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-warning-amber" />
          <p className="font-mono">关卡不存在</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-power-blue/20 border border-power-blue text-power-blue rounded-lg font-mono text-sm hover:bg-power-blue/30 transition-all"
          >
            返回主菜单
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-circuit-bg text-text-primary relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(77, 166, 255, 0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(77, 166, 255, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-circuit-border bg-circuit-card/50 text-text-secondary hover:border-power-blue hover:text-power-blue transition-all font-mono text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>

          <div className="flex items-center gap-3">
            <span className="font-display text-lg text-text-primary">
              {currentLevel.name}
            </span>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-mono',
              currentLevel.difficulty === 'easy' && 'bg-success-green/20 text-success-green',
              currentLevel.difficulty === 'medium' && 'bg-warning-amber/20 text-warning-amber',
              currentLevel.difficulty === 'hard' && 'bg-danger-red/20 text-danger-red'
            )}>
              {currentLevel.difficulty === 'easy' ? '初级' : currentLevel.difficulty === 'medium' ? '中级' : '高级'}
            </span>
          </div>

          <button
            onClick={() => handleEndGame('lose')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-danger-red/50 bg-danger-red/10 text-danger-red hover:bg-danger-red/20 transition-all font-mono text-sm"
          >
            <Flag className="w-4 h-4" />
            结束任务
          </button>
        </div>

        <div className="mb-4">
          <StatusBar />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <CircuitGrid className="mb-6" />
            <ReplayTimeline />
          </div>

          <div className="lg:col-span-1">
            <ControlPanel />

            <div className="mt-4 bg-circuit-card/80 rounded-xl border border-circuit-border p-4 backdrop-blur-sm">
              <h4 className="font-display text-sm text-text-primary mb-3">任务目标</h4>
              <ul className="space-y-2 text-xs font-mono">
                <li className="flex items-start gap-2">
                  <span className="text-success-green mt-0.5">✓</span>
                  <span className="text-text-secondary">将所有负载单元连接到电源</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success-green mt-0.5">✓</span>
                  <span className="text-text-secondary">修复故障单元，确保电路通畅</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning-amber mt-0.5">!</span>
                  <span className="text-text-secondary">阻止短路扩散到电源节点</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning-amber mt-0.5">!</span>
                  <span className="text-text-secondary">合理使用维修工具，避免电量耗尽</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 bg-circuit-card/80 rounded-xl border border-circuit-border p-4 backdrop-blur-sm">
              <h4 className="font-display text-sm text-text-primary mb-3">操作提示</h4>
              <div className="space-y-2 text-xs font-mono text-text-secondary">
                <p>• 选择操作模式后点击网格单元</p>
                <p>• 连接模式：先选起点，再选终点</p>
                <p>• 隔离模式：切断单元与电路的连接</p>
                <p>• 修复模式：消耗1个维修工具</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-circuit-bg/90 backdrop-blur-sm">
          <div className={cn(
            'bg-circuit-card rounded-2xl border-2 p-8 text-center max-w-md mx-4',
            gameResult === 'win' ? 'border-success-green shadow-neon-green' : 'border-danger-red shadow-neon-red'
          )}>
            <div className="text-6xl mb-4">
              {gameResult === 'win' ? '⚡' : '💥'}
            </div>
            <h2 className={cn(
              'font-display text-3xl mb-2',
              gameResult === 'win' ? 'text-success-green' : 'text-danger-red'
            )}>
              {gameResult === 'win' ? '任务完成！' : '任务失败'}
            </h2>
            <p className="text-text-secondary font-mono mb-6">
              {gameResult === 'win' 
                ? '恭喜！你成功修复了电路并连通了所有负载。'
                : '短路扩散失控或电量耗尽，电路抢修失败。'
              }
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/settlement')}
                className="px-6 py-3 bg-power-blue/20 border border-power-blue text-power-blue rounded-lg font-mono hover:bg-power-blue/30 transition-all"
              >
                查看结算
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-circuit-dark/50 border border-circuit-border text-text-secondary rounded-lg font-mono hover:border-power-blue hover:text-power-blue transition-all"
              >
                返回主菜单
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
