import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, BarChart2, FileText } from 'lucide-react';
import StarField from '../components/StarField';
import Spaceship from '../components/Spaceship';
import GreeksDashboard from '../components/GreeksDashboard';
import EventTimeline from '../components/EventTimeline';
import ControlPanel from '../components/ControlPanel';
import ConflictModal from '../components/ConflictModal';
import { useGameStore } from '../store/gameStore';

export default function Flight() {
  const navigate = useNavigate();
  const { status, tick, activeConflict, time } = useGameStore();
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(Date.now());

  const gameLoop = useCallback(() => {
    const now = Date.now();
    const deltaTime = (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;

    if (status === 'playing') {
      tick(deltaTime);
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [status, tick]);

  useEffect(() => {
    if (status === 'idle') {
      navigate('/');
      return;
    }

    if (status === 'settled' && time > 0) {
      navigate('/settlement');
      return;
    }

    lastTimeRef.current = Date.now();
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [status, time, navigate, gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentStatus = useGameStore.getState().status;

      if (e.key === ' ' && currentStatus === 'paused') {
        useGameStore.getState().resumeGame();
        return;
      }

      if (currentStatus !== 'playing') return;

      if (e.key === 'ArrowLeft' || e.key === 'a') {
        useGameStore.getState().setShipDirection('left');
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        useGameStore.getState().setShipDirection('right');
      }
      if (e.key === 'Escape') {
        useGameStore.getState().pauseGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'd') {
        useGameStore.getState().setShipDirection('center');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <StarField />

      <div className="relative z-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 flex items-center justify-between bg-space-900/80 backdrop-blur-sm border-b border-neon-cyan/20"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-space-700 transition-colors text-gray-400 hover:text-neon-cyan"
            >
              <Home size={20} />
            </button>
            <div>
              <h1 className="font-orbitron text-lg text-neon-cyan">飞行控制中心</h1>
              <p className="text-xs text-gray-400">
                {status === 'playing' ? '🚀 飞行中' : status === 'paused' ? '⏸️ 已暂停' : '✅ 已结算'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-gray-400">飞行时间</div>
              <div className="font-mono text-2xl text-neon-cyan">{formatTime(time)}</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate('/review')}
                className="px-3 py-2 rounded-lg border border-neon-purple/50 text-neon-purple text-sm hover:bg-neon-purple/10 transition-colors flex items-center gap-2"
              >
                <BarChart2 size={16} />
                复盘
              </button>
              <button
                onClick={() => navigate('/report')}
                className="px-3 py-2 rounded-lg border border-neon-yellow/50 text-neon-yellow text-sm hover:bg-neon-yellow/10 transition-colors flex items-center gap-2"
              >
                <FileText size={16} />
                报告
              </button>
            </div>
          </div>
        </motion.header>

        <div className="h-[calc(100vh-73px)] grid grid-cols-12 gap-4 p-4">
          <div className="col-span-3 overflow-y-auto">
            <EventTimeline />
          </div>

          <div className="col-span-6 relative">
            <div className="panel-glass h-full relative overflow-hidden crt-effect">
              <Spaceship />

              {status === 'paused' && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                  <div className="text-center">
                    <div className="text-6xl mb-4">⏸️</div>
                    <h2 className="font-orbitron text-3xl text-neon-yellow mb-2">游戏暂停</h2>
                    <p className="text-gray-400 mb-4">按空格键或点击继续按钮恢复游戏</p>
                    <button
                      onClick={() => useGameStore.getState().resumeGame()}
                      className="btn-neon-green px-6 py-2"
                    >
                      继续飞行
                    </button>
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div className="panel-glass p-3 text-xs">
                  <div className="text-gray-400 mb-1">操作提示</div>
                  <div className="text-gray-300">
                    <span className="text-neon-cyan">←/A</span> 左转 | 
                    <span className="text-neon-cyan"> →/D</span> 右转 | 
                    <span className="text-neon-cyan"> ESC</span> 暂停
                  </div>
                </div>

                <div className="flex gap-2">
                  {activeConflict && (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="bg-neon-yellow/20 border border-neon-yellow text-neon-yellow px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                    >
                      ⚠️ 信息冲突待处理
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-3 overflow-y-auto space-y-4">
            <GreeksDashboard />
            <ControlPanel />
          </div>
        </div>
      </div>

      <ConflictModal />
    </div>
  );
}
