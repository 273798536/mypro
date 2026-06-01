import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Globe2, User, Loader2 } from 'lucide-react';
import { useAppStore } from '../store';
import { LeftPanel } from '../components/panels/LeftPanel';
import { RightPanel } from '../components/panels/RightPanel';
import { Scene3D } from '../components/three/Scene3D';
import { BottomControlBar } from '../components/controls/BottomControlBar';

export default function Workbench() {
  const { isLoading, notification, clearNotification, loadInitialData } = useAppStore();

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-space-900">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-cyber-500/20 rounded-full" />
          <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-cyber-500 rounded-full animate-spin" />
          <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-cyber-400 animate-spin" />
        </div>
        <h2 className="mt-6 font-display font-bold text-2xl text-white">
          正在加载产品谱系宇宙
        </h2>
        <p className="mt-2 text-gray-500 text-sm">
          初始化3D场景与数据同步中...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-space-900 overflow-hidden">
      <header className="h-16 flex items-center justify-between px-6 glass border-b border-space-600 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-500 to-cyber-400 flex items-center justify-center shadow-lg shadow-cyber-500/30">
            <Globe2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white leading-tight">
              金融产品谱系宇宙
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              Financial Product Spectrum Universe
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyber-500/20 text-cyber-400'
                  : 'text-gray-400 hover:text-white hover:bg-space-700'
              }`
            }
          >
            工作台
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyber-500/20 text-cyber-400'
                  : 'text-gray-400 hover:text-white hover:bg-space-700'
              }`
            }
          >
            历史记录
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium text-white">管理员</div>
            <div className="text-xs text-gray-500 font-mono">admin@bank.com</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-trust-500 to-trust-400 flex items-center justify-center shadow-lg shadow-trust-500/20">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <LeftPanel />
        <main className="flex-1 min-w-0 relative">
          <Scene3D />
        </main>
        <RightPanel />
      </div>

      <BottomControlBar />

      {notification && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-lg backdrop-blur-xl flex items-center gap-3 animate-bounce ${
            notification.type === 'success'
              ? 'bg-trust-500/20 border border-trust-500/30 text-trust-400'
              : notification.type === 'error'
              ? 'bg-risk-500/20 border border-risk-500/30 text-risk-400'
              : 'bg-warning-500/20 border border-warning-500/30 text-warning-400'
          }`}
        >
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            onClick={clearNotification}
            className="text-xs opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
