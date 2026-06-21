import { useApp } from '@/lib/store';
import { ClipboardCheck, AlertTriangle, PenLine, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { StatusBadge, ResultBadge } from './Badges';
import { useState } from 'react';
import { clsx } from 'clsx';

interface Props {
  color: 'emerald' | 'amber' | 'indigo';
  label: string;
  count: number;
  items: any[];
  Icon: typeof ClipboardCheck;
  accent: string;
  dot: string;
}

function CategoryCard({ color, label, count, items, Icon, accent, dot }: Props) {
  const [open, setOpen] = useState(false);
  const select = useApp((s) => s.setSelectedId);
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    const lines = items.map((r) => `· ${r.recordNo} [${r.paramVersion}] ${r.remark ? '— ' + r.remark : ''}`).join('\n');
    const text = `【${label}】共 ${count} 条\n${lines}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={clsx(
        'rounded-lg border shadow-card overflow-hidden transition-colors',
        color === 'emerald' && 'border-emerald-500/25 bg-emerald-500/5',
        color === 'amber' && 'border-amber-500/25 bg-amber-500/5',
        color === 'indigo' && 'border-indigo-500/25 bg-indigo-500/5',
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className={clsx('w-8 h-8 rounded flex items-center justify-center', dot)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{label}</span>
            <span className={clsx('text-xs font-mono px-1.5 py-px rounded', accent)}>{count}</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">点击展开查看明细</p>
        </div>
        <button
          onClick={copyText}
          className="text-[11px] px-2 py-1 rounded border border-white/10 hover:bg-white/5 transition text-zinc-300 flex items-center gap-1"
        >
          <Copy className="w-3 h-3" />
          {copied ? '已复制' : '复制'}
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1 hover:bg-white/5 rounded transition"
          aria-label="展开"
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/5 px-3 py-2 max-h-64 overflow-y-auto scroll-thin space-y-1.5 anim-fade-up">
          {items.length === 0 ? (
            <p className="text-xs text-zinc-500 py-2 text-center">暂无数据</p>
          ) : (
            items.map((r) => (
              <button
                key={r.id}
                onClick={() => select(r.id)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 transition group flex items-center gap-2"
              >
                <span className="font-mono text-xs text-zinc-300 group-hover:text-white">{r.recordNo}</span>
                <StatusBadge status={r.status} />
                <ResultBadge result={r.boundaryResult} />
                {r.remark && <span className="text-[11px] text-zinc-400 truncate flex-1">{r.remark}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function SummaryPanel() {
  const summary = useApp((s) => s.summary);
  if (!summary) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-surface-800 border border-white/5 anim-pulse-soft" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-200">交接摘要</h2>
        <span className="text-[11px] text-zinc-500 font-mono">{new Date().toLocaleDateString('zh-CN')}</span>
      </div>

      <CategoryCard
        color="emerald"
        label="已处理"
        count={summary.confirmed.count}
        items={summary.confirmed.items}
        Icon={ClipboardCheck}
        accent="text-emerald-300 bg-emerald-500/15"
        dot="bg-emerald-500/20 text-emerald-300"
      />
      <CategoryCard
        color="amber"
        label="待补证据"
        count={summary.needEvidence.count}
        items={summary.needEvidence.items}
        Icon={AlertTriangle}
        accent="text-amber-300 bg-amber-500/15"
        dot="bg-amber-500/20 text-amber-300"
      />
      <CategoryCard
        color="indigo"
        label="人工改判"
        count={summary.manualOverruled.count}
        items={summary.manualOverruled.items}
        Icon={PenLine}
        accent="text-indigo-300 bg-indigo-500/15"
        dot="bg-indigo-500/20 text-indigo-300"
      />
    </div>
  );
}
