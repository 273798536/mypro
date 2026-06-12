import CadCanvas from '@/components/cad-canvas/CadCanvas';
import LayerPanel from '@/components/layer-panel/LayerPanel';
import RightPanel from '@/components/right-panel/RightPanel';
import Timeline from '@/components/timeline/Timeline';
import { Construction, Settings, Bell, User } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="h-14 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <Construction size={18} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">
              桥隧检修平台碰撞预审
            </h1>
            <p className="text-xs text-slate-500">
              Bridge & Tunnel Maintenance Platform Collision Pre-check
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded border border-yellow-500/30">
              坐标系混杂
            </span>
            <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded border border-orange-500/30">
              1处挂起
            </span>
          </div>

          <button className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200">
            <Bell size={18} />
          </button>
          <button className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200">
            <Settings size={18} />
          </button>
          <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
            <div className="w-7 h-7 bg-slate-600 rounded-full flex items-center justify-center">
              <User size={14} className="text-slate-400" />
            </div>
            <span className="text-sm text-slate-300 hidden md:inline">阿宁</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 flex gap-4 overflow-hidden">
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <LayerPanel />
        </aside>

        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex-1 min-h-0">
            <CadCanvas width={800} height={500} />
          </div>
          <div className="flex-shrink-0">
            <Timeline />
          </div>
        </div>

        <aside className="w-80 flex-shrink-0 hidden md:block">
          <RightPanel />
        </aside>
      </main>

      <footer className="h-8 bg-slate-800 border-t border-slate-700 px-4 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>会话: SESSION-20240610-001</span>
          <span className="text-slate-600">|</span>
          <span>最后更新: 15:32:18</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            实时计算中
          </span>
          <span className="text-slate-600">v1.2.0</span>
        </div>
      </footer>
    </div>
  );
}
