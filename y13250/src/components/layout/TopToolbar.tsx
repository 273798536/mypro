import { useState } from 'react';
import { useStore } from '@/store';
import { RefreshCw, Download, RotateCcw, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TopToolbar() {
  const rerun = useStore(s => s.rerunMerge);
  const triggerExport = useStore(s => s.triggerExport);
  const resetToMock = useStore(s => s.resetToMock);
  const summary = useStore(s => s.summary);

  const [rerunning, setRerunning] = useState(false);
  const [exported, setExported] = useState<null | { ok: boolean; count: number }>(null);
  const [resetting, setResetting] = useState(false);

  return (
    <div className="flex items-center justify-between px-5 py-3.5 bg-bg-soft/80 backdrop-blur border-b border-border rounded-t-xl animate-fade-in" style={{ animationDelay: '0ms' }}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-export via-accent-merged to-accent-caliber flex items-center justify-center text-lg">
            🌆
          </div>
          <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-accent-normal ring-2 ring-bg-soft" />
        </div>
        <div>
          <div className="text-lg font-bold tracking-tight">
            夜市外摆点位归并 · 工作台
          </div>
          <div className="text-[11px] text-text-muted">
            接手不用问 · 顶部导出 / 重跑 · 左侧材料 · 中间图表 · 右上异常 · 右下证据 · 底部日志
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] px-2 py-1 rounded-md bg-bg-card border border-border text-text-dim font-mono mr-2">
          版本 <span className="text-accent-export">{summary.currentVersion}</span>
        </span>
        <button
          onClick={() => {
            setResetting(true);
            setTimeout(() => {
              resetToMock();
              setResetting(false);
            }, 600);
          }}
          className={cn(
            'px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5',
            resetting
              ? 'bg-accent-caliber/25 border-accent-caliber/50 text-accent-caliber'
              : 'bg-bg-card border-border text-text-muted hover:text-text hover:border-soft hover:bg-bg-hover',
          )}
          title="重置为初始模拟数据（演示用）"
        >
          <RotateCcw className={cn('w-3.5 h-3.5', resetting && 'animate-spin')} />
          {resetting ? '重置中…' : '重置演示数据'}
        </button>
        <button
          onClick={() => {
            setRerunning(true);
            setTimeout(() => {
              rerun();
              setRerunning(false);
            }, 800);
          }}
          className={cn(
            'px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
            rerunning
              ? 'bg-accent-export/25 border border-accent-export/50 text-accent-export'
              : 'bg-accent-export/15 border border-accent-export/40 text-accent-export hover:bg-accent-export/25',
          )}
          title="重新运行归并算法（保留备注与历史快照）"
        >
          <RefreshCw className={cn('w-4 h-4', rerunning && 'animate-spin')} />
          {rerunning ? '归并重跑中…' : '🔄 重跑归并'}
        </button>
        <button
          onClick={() => {
            const r = triggerExport();
            setExported(r);
            setTimeout(() => setExported(null), 3500);
          }}
          className={cn(
            'px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
            exported?.ok
              ? 'bg-accent-normal/25 border border-accent-normal/50 text-accent-normal'
              : 'bg-accent-normal/15 border border-accent-normal/40 text-accent-normal hover:bg-accent-normal/25',
          )}
          title="导出归并结果 + 操作日志（月底给领导，不用翻聊天）"
        >
          {exported?.ok ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          {exported?.ok ? `已导出 ${exported.count} 条` : '📤 导出结果'}
          {!exported && <Sparkles className="w-3 h-3 text-accent-normal/60" />}
        </button>
      </div>
    </div>
  );
}
