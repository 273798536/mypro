import { useMainStore } from '@/store/useMainStore';
import {
  ChevronLeft,
  ChevronRight,
  History as HistoryIcon,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function UndoStack() {
  const { history, historyIndex, jumpToHistory, undo, redo } = useMainStore();

  return (
    <aside className="glass-card h-full flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-neon-cyan/15">
        <div className="flex items-center gap-2">
          <HistoryIcon className="w-4 h-4 text-neon-cyan" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">
            历史撤回栈
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => undo()}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-md border border-neon-cyan/20 text-neon-cyan/80
              hover:bg-neon-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="撤回一步"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => redo()}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-md border border-neon-cyan/20 text-neon-cyan/80
              hover:bg-neon-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="重做一步"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="px-2 py-3 text-xs text-slate-400 border-b border-neon-cyan/10">
        <div className="flex items-center justify-between px-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-neon-green shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            干净记录
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-neon-amber shadow-[0_0_8px_rgba(255,176,32,0.6)]" />
            含缺口
          </span>
        </div>
        <div className="px-2 mt-2 text-[11px] opacity-80">
          节点 {Math.max(0, historyIndex + 1)} / {history.length || 0}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {history.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-10">
            暂无历史记录
            <div className="mt-2 text-[11px]">点击顶部「放样例」启动首条记录</div>
          </div>
        ) : (
          [...history].reverse().map((node, revIdx) => {
            const realIdx = history.length - 1 - revIdx;
            const active = realIdx === historyIndex;
            return (
              <button
                key={node.id}
                onClick={() => jumpToHistory(node.id)}
                className={`w-full text-left rounded-xl p-3 border transition-all group
                  ${active
                    ? 'bg-neon-cyan/10 border-neon-cyan/60 shadow-neon-cyan'
                    : 'bg-abyss-800/40 border-neon-cyan/10 hover:border-neon-cyan/35 hover:bg-abyss-700/40'}
                `}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`mt-0.5 flex-shrink-0 w-3 h-3 rounded-full
                      ${node.isClean
                        ? 'bg-neon-green'
                        : 'bg-neon-amber animate-pulse'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {node.timestamp}
                      </span>
                      {active ? (
                        <span className="chip bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30">
                          当前
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition">
                          点击跳转
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-200 mt-1 leading-snug">
                      {node.summary}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {node.isClean ? (
                        <span className="chip bg-neon-green/10 text-neon-green/90 border border-neon-green/25">
                          <CheckCircle2 className="w-3 h-3" /> 链路全通过
                        </span>
                      ) : (
                        <span className="chip bg-neon-amber/10 text-neon-amber border border-neon-amber/30">
                          <AlertTriangle className="w-3 h-3" /> 存在缺口
                        </span>
                      )}
                      <span className="chip bg-slate-600/20 text-slate-400 border border-slate-500/20">
                        组 {node.activeGroup} 激活
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
