import { ScrollText, User, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import HudCard from '@/components/ui/HudCard';
import { formatDateTime } from '@/utils/storage';
import { ACTION_LABELS } from '@/utils/boundaryScenes';
import { cn } from '@/lib/utils';
import type { AuditLog } from '@/types';

function roleColor(role: string) {
  switch (role) {
    case 'operator': return 'cyber-cyan';
    case 'reviewer': return 'success-green';
    default: return 'warn-yellow';
  }
}

function actionIconColor(action: string) {
  if (action.includes('approve') || action === 'game_finish') return 'text-success-green bg-success-green/15 border-success-green/40';
  if (action.includes('reject') || action.includes('param') || action === 'game_pause') return 'text-warn-yellow bg-warn-yellow/15 border-warn-yellow/40';
  if (action.includes('outlier_mark')) return 'text-alert-orange bg-alert-orange/15 border-alert-orange/40';
  return 'text-cyber-cyan bg-cyber-cyan/15 border-cyber-cyan/40';
}

function LogDetail({ log }: { log: AuditLog }) {
  const before = log.beforeValue;
  const after = log.afterValue;
  const diffKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  if (diffKeys.size === 0) return null;

  return (
    <div className="mt-2 p-2 bg-space-deep/70 rounded border border-cyber-cyan/10 text-[10px] font-mono space-y-1">
      {Array.from(diffKeys).slice(0, 6).map((k) => {
        const b = before?.[k];
        const a = after?.[k];
        if (JSON.stringify(b) === JSON.stringify(a)) return null;
        return (
          <div key={k} className="flex items-start gap-1.5">
            <span className="text-cyan-300/50 shrink-0">{k}:</span>
            <span className="text-alert-orange/80 line-through truncate">
              {typeof b === 'object' ? '[object]' : String(b ?? '-').slice(0, 30)}
            </span>
            <span className="text-cyan-300/40">→</span>
            <span className="text-success-green font-semibold truncate">
              {typeof a === 'object' ? '[object]' : String(a ?? '-').slice(0, 30)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AuditTimeline() {
  const auditLogs = useGameStore((s) => s.auditLogs);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const n = new Set(expanded);
    if (n.has(id)) n.delete(id); else n.add(id);
    setExpanded(n);
  };

  return (
    <HudCard title="审计日志 · AUDIT TRAIL" accent="green" className="mb-4">
      <div className="text-[10px] font-mono text-cyan-300/60 mb-3 flex items-center gap-4">
        <span className="flex items-center gap-1"><ScrollText className="w-2.5 h-2.5" />共 {auditLogs.length} 条记录</span>
        <span>· 含操作人、时间戳、修改原因、前后值对比</span>
      </div>

      {auditLogs.length === 0 ? (
        <div className="text-[11px] text-cyan-300/50 text-center py-6">暂无审计记录</div>
      ) : (
        <div className="relative">
          <div className="absolute left-[11px] top-0 bottom-0 w-px bg-gradient-to-b from-cyber-cyan/40 via-success-green/30 to-transparent" />

          <div className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-cyber pr-1">
            {[...auditLogs].reverse().map((log, idx) => {
              const isOpen = expanded.has(log.id);
              return (
                <div key={log.id} className="relative pl-7">
                  <div className={cn(
                    'absolute left-0 top-1 w-[22px] h-[22px] rounded-full flex items-center justify-center border text-[9px] font-bold',
                    actionIconColor(log.action)
                  )}>
                    {auditLogs.length - idx}
                  </div>

                  <div
                    className="bg-space-dark/50 rounded border border-cyber-cyan/10 p-2.5 cursor-pointer hover:border-cyber-cyan/30 transition-colors"
                    onClick={() => toggle(log.id)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'hud-text text-[10px] px-1.5 py-0.5 rounded clip-chamfer border',
                          actionIconColor(log.action)
                        )}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: `var(--${roleColor(log.role)})` }}>
                          <User className="w-2 h-2" />{log.operator}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-cyan-300/50">
                        <Clock className="w-2 h-2" />
                        {formatDateTime(log.timestamp)}
                        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </div>
                    </div>
                    <div className="text-[10px] text-cyan-300/80 font-mono italic">
                      "{log.reason}"
                    </div>
                    {isOpen && <LogDetail log={log} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </HudCard>
  );
}
