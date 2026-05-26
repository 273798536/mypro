import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, PauseCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import CraneScene from '../components/CraneScene';
import StatusPanel from '../components/StatusPanel';
import ControlPanel from '../components/ControlPanel';
import ActionLog from '../components/ActionLog';
import { cn } from '../lib/utils';

export default function GamePage() {
  const navigate = useNavigate();
  const { status, updateEnvironment, updateRoundTime, currentSession } = useGameStore();
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  
  useEffect(() => {
    if (status === 'idle') {
      navigate('/');
    }
  }, [status, navigate]);
  
  useEffect(() => {
    if (status === 'ended' || status === 'failed') {
      setTimeout(() => {
        navigate('/result');
      }, 1500);
    }
  }, [status, navigate]);
  
  useEffect(() => {
    if (status !== 'playing') {
      return;
    }
    
    let environmentTimer = 0;
    
    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      
      updateRoundTime(deltaTime);
      
      environmentTimer += deltaTime;
      if (environmentTimer >= 2) {
        updateEnvironment();
        environmentTimer = 0;
      }
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lastTimeRef.current = 0;
    };
  }, [status, updateEnvironment, updateRoundTime]);
  
  const isPaused = status === 'paused';
  const isEnded = status === 'ended';
  const isFailed = status === 'failed';
  
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <header className="bg-dark-800/80 backdrop-blur-sm border-b border-dark-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h1 className="text-xl font-industrial font-bold text-white">塔吊风速指挥赛</h1>
              <p className="text-xs text-dark-400">安全训练模拟器</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {currentSession && (
              <div className="text-right">
                <p className="text-sm text-dark-400">难度等级</p>
                <p className="font-semibold text-white">
                  {currentSession.difficulty === 'easy' ? '简单' : 
                   currentSession.difficulty === 'normal' ? '普通' : '困难'}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-4 md:p-6 overflow-hidden">
        <div className="h-full max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="flex-1 min-h-[400px] lg:min-h-0 bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden relative">
              <CraneScene />
              
              <div className="absolute top-4 left-4 bg-dark-900/80 backdrop-blur-sm px-3 py-2 rounded-lg">
                <p className="text-xs text-dark-400">操作提示</p>
                <p className="text-sm text-white">拖拽旋转视角 · 滚轮缩放</p>
              </div>
              
              {isPaused && (
                <div className="absolute inset-0 bg-dark-900/70 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="text-center animate-slide-in">
                    <PauseCircle className="w-20 h-20 text-primary-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-industrial font-bold text-white mb-2">游戏暂停</h2>
                    <p className="text-dark-400 mb-6">点击"继续"按钮恢复游戏</p>
                  </div>
                </div>
              )}
              
              {isEnded && (
                <div className="absolute inset-0 bg-success-900/70 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="text-center animate-slide-in">
                    <div className="w-20 h-20 bg-success-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldAlert className="w-10 h-10 text-success-500" />
                    </div>
                    <h2 className="text-3xl font-industrial font-bold text-white mb-2">训练完成！</h2>
                    <p className="text-success-300 mb-6">正在跳转到结算页面...</p>
                  </div>
                </div>
              )}
              
              {isFailed && (
                <div className="absolute inset-0 bg-danger-900/70 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="text-center animate-slide-in">
                    <div className="w-20 h-20 bg-danger-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldAlert className="w-10 h-10 text-danger-500" />
                    </div>
                    <h2 className="text-3xl font-industrial font-bold text-white mb-2">训练失败</h2>
                    <p className="text-danger-300 mb-6">发生安全事故，正在跳转结算...</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="lg:hidden">
              <ActionLog />
            </div>
          </div>
          
          <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-140px)]">
            <StatusPanel />
            <ControlPanel />
            <div className="hidden lg:block flex-1 min-h-0">
              <ActionLog />
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-dark-800/50 border-t border-dark-700 px-6 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between text-xs text-dark-500">
          <p>材料来源：塔吊操作规程 | 吊装安全规范 | 气象作业标准</p>
          <p className={cn(
            "flex items-center gap-2",
            status === 'playing' ? 'text-success-500' : 
            status === 'paused' ? 'text-primary-500' : 'text-dark-500'
          )}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {status === 'playing' ? '运行中' : 
             status === 'paused' ? '已暂停' : 
             status === 'ended' ? '已完成' : '已结束'}
          </p>
        </div>
      </footer>
    </div>
  );
}
