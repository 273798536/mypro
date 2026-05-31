import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toolbox } from '@/components/Toolbox';
import { StageGrid } from '@/components/StageGrid';
import { Toolbar } from '@/components/Toolbar';
import { StatusPanel } from '@/components/StatusPanel';
import { useGameStore } from '@/store/useGameStore';
import { useGameTimer } from '@/hooks/useGameTimer';
import { Music2 } from 'lucide-react';

export const GamePage = () => {
  const navigate = useNavigate();
  const { status, generateReport } = useGameStore();
  useGameTimer();

  useEffect(() => {
    if (status === 'finished') {
      generateReport();
      navigate('/result');
    }
  }, [status, navigate, generateReport]);

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Music2 className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">乐队设备抢修夜</h1>
            <p className="text-xs text-slate-400">舞台调度训练模拟器</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>在线</span>
          </div>
          <div className="text-slate-500">v1.0.0</div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 flex-shrink-0">
          <Toolbox />
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <StageGrid />
          <Toolbar />
        </main>

        <aside className="w-80 flex-shrink-0">
          <StatusPanel />
        </aside>
      </div>

      {status === 'paused' && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-4">游戏暂停</h2>
            <p className="text-slate-400 mb-8">点击"继续"按钮恢复游戏</p>
          </div>
        </div>
      )}
    </div>
  );
};
