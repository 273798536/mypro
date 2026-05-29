import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Play, Pause, RotateCcw, FileText, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { StationMap } from '../components/game/StationMap';
import { BroadcastPanel } from '../components/game/BroadcastPanel';
import { GateControl } from '../components/game/GateControl';
import { AlertPanel } from '../components/game/AlertPanel';
import { StatusBar } from '../components/game/StatusBar';
import { getLevel } from '../data/levels';

export default function Game() {
  const navigate = useNavigate();
  const status = useGameStore((state) => state.status);
  const levelId = useGameStore((state) => state.levelId);
  const startGame = useGameStore((state) => state.startGame);
  const pauseGame = useGameStore((state) => state.pauseGame);
  const resumeGame = useGameStore((state) => state.resumeGame);
  const resetGame = useGameStore((state) => state.resetGame);
  const lastResultId = useGameStore((state) => state.lastResultId);

  useGameLoop();

  const level = getLevel(levelId);

  useEffect(() => {
    if (!levelId) {
      navigate('/');
    }
  }, [levelId, navigate]);

  useEffect(() => {
    if (status === 'finished' && lastResultId) {
      navigate(`/report/${lastResultId}`);
    }
  }, [status, lastResultId, navigate]);

  const handleStart = () => {
    if (status === 'idle') {
      startGame();
    } else if (status === 'paused') {
      resumeGame();
    }
  };

  const handlePause = () => {
    if (status === 'playing') {
      pauseGame();
    }
  };

  const handleReset = () => {
    resetGame();
  };

  if (!level) {
    return (
      <div className="min-h-screen bg-metro-bg flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto text-metro-yellow mb-4" size={48} />
          <p className="text-metro-text mb-4">未找到关卡数据，请返回首页重新选择</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-metro-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-metro-bg text-metro-text flex flex-col">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      <header className="relative border-b border-metro-border bg-metro-bgDark/80 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-2 bg-metro-bg hover:bg-metro-bgLight border border-metro-border rounded-lg transition-all"
              >
                <Home size={18} />
                <span className="text-sm">返回首页</span>
              </button>
              <div className="h-6 w-px bg-metro-border" />
              <div>
                <h2 className="font-bold">{level.name}</h2>
                <p className="text-xs text-metro-textMuted">{level.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status === 'idle' && (
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 px-6 py-2 bg-metro-green hover:bg-green-600 text-white rounded-lg font-bold transition-all"
                >
                  <Play size={18} />
                  开始游戏
                </button>
              )}
              {status === 'playing' && (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 px-4 py-2 bg-metro-yellow hover:bg-yellow-600 text-white rounded-lg font-bold transition-all"
                >
                  <Pause size={18} />
                  暂停
                </button>
              )}
              {status === 'paused' && (
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 px-4 py-2 bg-metro-green hover:bg-green-600 text-white rounded-lg font-bold transition-all"
                >
                  <Play size={18} />
                  继续
                </button>
              )}
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-metro-bg hover:bg-metro-bgLight border border-metro-border rounded-lg transition-all"
              >
                <RotateCcw size={18} />
                重置
              </button>
              {lastResultId && (
                <button
                  onClick={() => navigate(`/report/${lastResultId}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-metro-blue hover:bg-blue-600 text-white rounded-lg transition-all"
                >
                  <FileText size={18} />
                  查看报告
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative flex-1 container mx-auto px-4 py-4 flex flex-col gap-4">
        <StatusBar />

        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
          <div className="col-span-3 flex flex-col gap-4">
            <div className="flex-1 min-h-0">
              <BroadcastPanel />
            </div>
          </div>

          <div className="col-span-6 flex flex-col gap-4">
            <div className="flex-1 min-h-0">
              <StationMap />
            </div>
            <AlertPanel />
          </div>

          <div className="col-span-3">
            <GateControl />
          </div>
        </div>

        {status === 'paused' && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-metro-bgLight border border-metro-border rounded-xl p-8 text-center max-w-md">
              <Pause className="mx-auto text-metro-yellow mb-4" size={64} />
              <h3 className="text-2xl font-bold mb-2">游戏已暂停</h3>
              <p className="text-metro-textMuted mb-6">点击继续按钮恢复游戏</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleStart}
                  className="px-6 py-3 bg-metro-green hover:bg-green-600 text-white rounded-lg font-bold transition-all"
                >
                  继续游戏
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-metro-border hover:bg-metro-border/80 text-metro-text rounded-lg font-bold transition-all"
                >
                  重新开始
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
