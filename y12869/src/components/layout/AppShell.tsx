import { Outlet, useLocation } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';
import { TideStatusBanner } from './TideStatusBanner';
import { RightPanel } from './RightPanel';
import { useAppStore } from '@/store/useAppStore';
import { useEffect } from 'react';

const FULL_WIDTH_PATHS = ['/report'];

export function AppShell() {
  const initialize = useAppStore(s => s.initialize);
  const location = useLocation();
  const isFullWidth = FULL_WIDTH_PATHS.includes(location.pathname);

  useEffect(() => { initialize(); }, [initialize]);

  return (
    <div className="w-screen h-screen flex flex-col bg-channel-bg text-channel-text overflow-hidden">
      <TideStatusBanner />
      <div className="flex-1 flex overflow-hidden">
        <SidebarNav />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 bg-channel-panel/60 border-b border-channel-border backdrop-blur px-6 flex items-center gap-4 shrink-0">
            <div>
              <div className="text-lg font-serif font-semibold text-white/95 leading-tight">
                航道淤积测量报告复核工作台
              </div>
              <div className="text-[11px] text-channel-muted">
                闽江下游通海航道 · 2026 年 6 月上旬 · v1.0.3
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3 text-xs">
              <div className="chip-gray">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                数据服务在线
              </div>
              <div className="chip-blue">海事安全员 · 陈工</div>
            </div>
          </header>
          <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 overflow-hidden relative">
              <Outlet />
            </main>
            {!isFullWidth && <RightPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
