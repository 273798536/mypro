import { Wind, Menu, X, PanelLeft, PanelRight } from 'lucide-react';
import { ViewpointMenu } from './ViewpointMenu';
import { ActionButtons } from './ActionButtons';
import { useUIStore } from '@/store/uiStore';
import { useDetectionStore } from '@/store/detectionStore';
import { useDetectionSummary } from '@/hooks/useDetection';
import { ViewpointProvider } from '@/hooks/useViewpoint';
import { clsx } from '@/lib/utils';

export function Toolbar() {
  const leftSidebarOpen = useUIStore((s) => s.leftSidebarOpen);
  const rightSidebarOpen = useUIStore((s) => s.rightSidebarOpen);
  const toggleLeftSidebar = useUIStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useUIStore((s) => s.toggleRightSidebar);

  const currentResult = useDetectionStore((s) => s.currentResult);
  const summary = useDetectionSummary(currentResult?.anomalies || []);

  return (
    <header className="h-14 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 z-40 relative">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleLeftSidebar}
          className={clsx(
            'p-2 rounded-lg transition-all',
            leftSidebarOpen
              ? 'bg-blue-500/20 text-blue-400'
              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-300'
          )}
        >
          {leftSidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Wind size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">
              数学向量场风洞
            </h1>
            <p className="text-[10px] text-slate-500 leading-tight">
              Vector Field Wind Tunnel
            </p>
          </div>
        </div>

        {currentResult && (
          <div className="hidden md:flex items-center gap-4 ml-6 pl-6 border-l border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-slate-400">
                爆炸: <span className="text-red-400 font-mono">{summary.byType.explosion}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs text-slate-400">
                反转: <span className="text-orange-400 font-mono">{summary.byType.direction_flip}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-xs text-slate-400">
                越界: <span className="text-yellow-400 font-mono">{summary.byType.out_of_bounds}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <ViewpointMenu />
        <ActionButtons />

        <div className="w-px h-6 bg-slate-700 mx-1" />

        <button
          onClick={toggleRightSidebar}
          className={clsx(
            'p-2 rounded-lg transition-all',
            rightSidebarOpen
              ? 'bg-blue-500/20 text-blue-400'
              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-300'
          )}
        >
          {rightSidebarOpen ? (
            <PanelRight size={18} />
          ) : (
            <PanelLeft size={18} />
          )}
        </button>
      </div>
    </header>
  );
}
