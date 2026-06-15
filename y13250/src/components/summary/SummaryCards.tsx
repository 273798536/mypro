import { useStore } from '@/store';
import { Layers, AlertTriangle, Clock, Link2, CalendarClock, Download, History } from 'lucide-react';

function fmtTime(s: string) {
  if (!s || s === '-') return '-';
  try {
    const d = new Date(s);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return s;
  }
}

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ElementType;
  grad: string;
  valueCls: string;
  delay: number;
}

function StatCard({ label, value, hint, icon: Icon, grad, valueCls, delay }: StatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border p-4 pr-14 animate-fade-in',
        grad,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Icon className="absolute right-4 top-4 w-10 h-10 opacity-20" />
      <div className="text-xs text-text-muted">{label}</div>
      <div className={cn('mt-2 text-3xl font-bold font-mono tabular-nums', valueCls)}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-text-dim">{hint}</div>}
    </div>
  );
}

import { cn } from '@/lib/utils';

export function SummaryCards() {
  const summary = useStore(s => s.summary);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        delay={0}
        label="点位总数"
        value={summary.totalPoints}
        hint={`已归并 ${summary.mergedCount} 个`}
        icon={Layers}
        grad="bg-grad-total"
        valueCls="text-text"
      />
      <StatCard
        delay={80}
        label="待处理异常"
        value={summary.abnormalCount}
        hint={summary.abnormalCount > 0 ? '点击异常面板追溯材料' : '无未解决异常'}
        icon={AlertTriangle}
        grad="bg-grad-abnormal"
        valueCls="text-accent-abnormal"
      />
      <StatCard
        delay={160}
        label="挂起待确认"
        value={summary.pendingCount}
        hint="相邻路口合错宁可挂起"
        icon={Clock}
        grad="bg-grad-pending"
        valueCls="text-accent-pending"
      />
      <StatCard
        delay={240}
        label="归并组数"
        value={summary.mergedCount}
        hint={`版本 ${summary.currentVersion}`}
        icon={Link2}
        grad="bg-grad-normal"
        valueCls="text-accent-normal"
      />
      <div className="col-span-2 md:col-span-4 flex items-center justify-between mt-1 px-2 py-2 rounded-md bg-bg-card/50 border border-border/50 text-[11px] text-text-muted animate-fade-in" style={{ animationDelay: '320ms' }}>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            最后重跑：<span className="text-text font-mono">{fmtTime(summary.lastRerunTime)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            最后导出：<span className="text-text font-mono">{fmtTime(summary.lastExportTime)}</span>
          </span>
        </div>
        <span className="flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5" />
          当前版本 <span className="text-accent-export font-mono">{summary.currentVersion}</span>
        </span>
      </div>
    </div>
  );
}
