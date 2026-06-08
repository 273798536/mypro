import { Trophy, XCircle, Clock, Target, GitBranch, RotateCcw, Home } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useNavigate } from 'react-router-dom';
import { formatDuration } from '@/utils/storage';
import { cn } from '@/lib/utils';

export default function ResultHeader() {
  const result = useGameStore((s) => s.result);
  const startTime = useGameStore((s) => s.startTime);
  const endTime = useGameStore((s) => s.endTime);
  const auditLogs = useGameStore((s) => s.auditLogs);
  const outlierMarks = useGameStore((s) => s.outlierMarks);
  const paramHistory = useGameStore((s) => s.paramHistory);
  const detectedSyncIssues = useGameStore((s) => s.detectedSyncIssues);
  const resetGame = useGameStore((s) => s.resetGame);
  const navigate = useNavigate();

  const duration = startTime && endTime ? endTime - startTime : 0;
  const approved = outlierMarks.filter((m) => m.status === 'approved').length;
  const paramChanges = paramHistory.length - 1;
  const totalOps = auditLogs.length;

  const statItems = [
    { icon: Clock, label: '本局耗时', value: formatDuration(duration), color: 'cyber-cyan' },
    { icon: Target, label: '通过复核', value: `${approved} 点`, color: 'success-green' },
    { icon: GitBranch, label: '参数修改', value: `${paramChanges} 次`, color: 'warn-yellow' },
    { icon: Clock, label: '发现同步问题', value: `${detectedSyncIssues.length} 个`, color: 'alert-orange' },
  ];

  return (
    <div className="glass-panel clip-chamfer p-6 mb-4 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="relative flex items-start justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className={cn(
            'w-24 h-24 rounded-full flex items-center justify-center border-4',
            result === 'correct'
              ? 'border-success-green/50 bg-success-green/10 shadow-[0_0_40px_rgba(0,255,136,0.25)]'
              : 'border-alert-orange/50 bg-alert-orange/10 shadow-[0_0_40px_rgba(255,107,53,0.25)]'
          )}>
            {result === 'correct' ? (
              <Trophy className="w-12 h-12 text-success-green" />
            ) : (
              <XCircle className="w-12 h-12 text-alert-orange" />
            )}
          </div>
          <div>
            <h1 className={cn(
              'hud-text text-3xl font-black tracking-wider mb-1',
              result === 'correct' ? 'text-success-green' : 'text-alert-orange'
            )}>
              {result === 'correct' ? '判定通过' : '判定未通过'}
            </h1>
            <p className="text-[12px] text-cyan-300/70 font-mono max-w-lg">
              {result === 'correct'
                ? '本局操作规范：离群点标记完整且全部完成复核，参数修改记录可追溯。'
                : '本局存在待复核标记或漏检离群点，请查看审计日志与对比视图定位问题。'}
            </p>
            <div className="text-[10px] text-cyber-cyan/50 mt-1 font-mono">
              操作日志共 {totalOps} 条 · 参数快照 {paramHistory.length} 版
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {statItems.map((it) => (
              <div key={it.label} className="bg-space-dark/60 clip-chamfer border border-cyber-cyan/15 px-3 py-2 min-w-[110px]">
                <div className="flex items-center gap-1.5 text-[9px] text-cyan-300/60 mb-0.5">
                  <it.icon className="w-2.5 h-2.5" style={{ color: `var(--${it.color})` }} />
                  {it.label}
                </div>
                <div className="text-sm font-mono font-bold" style={{ color: `var(--${it.color})` }}>
                  {it.value}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { resetGame(); navigate('/'); }}
              className="cyber-btn flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <RotateCcw className="w-3 h-3" /> 再来一局
            </button>
            <button
              onClick={() => navigate('/')}
              className="cyber-btn cyber-btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <Home className="w-3 h-3" /> 返回主控台
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
