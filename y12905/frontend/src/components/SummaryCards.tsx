import type { GrayCompareTask } from '../types';
import StatusBadge from './StatusBadge';

interface Props {
  task: GrayCompareTask;
  pageCounts?: { APPROVED: number; REVIEW_REQUIRED: number; RERUN: number };
  pageHashValid?: boolean;
}

function pct(n: number, d: number) { return d ? ((n / d) * 100).toFixed(1) : '0.0'; }

export default function SummaryCards({ task, pageCounts, pageHashValid = true }: Props) {
  const m = task.metrics_summary;
  const total = m.total_samples || 1;
  const counts = pageCounts || m.decision_counts || { APPROVED: 0, REVIEW_REQUIRED: 0, RERUN: 0 };
  const approved = counts.APPROVED ?? 0;
  const review = counts.REVIEW_REQUIRED ?? 0;
  const rerun = counts.RERUN ?? 0;
  const deltaPass = ((m.pass_rate_b ?? 0) - (m.pass_rate_a ?? 0)) * 100;
  const deltaScore = (m.avg_score_b ?? 0) - (m.avg_score_a ?? 0);
  const deltaViol = (m.violation_count_b ?? 0) - (m.violation_count_a ?? 0);

  const cards = [
    {
      title: '通过率',
      a: `${(m.pass_rate_a * 100).toFixed(1)}%`,
      b: `${(m.pass_rate_b * 100).toFixed(1)}%`,
      delta: `${deltaPass >= 0 ? '+' : ''}${deltaPass.toFixed(1)}%`,
      good: deltaPass >= 0,
      icon: '✅',
    },
    {
      title: '平均评分',
      a: m.avg_score_a.toFixed(2),
      b: m.avg_score_b.toFixed(2),
      delta: `${deltaScore >= 0 ? '+' : ''}${deltaScore.toFixed(2)}`,
      good: deltaScore >= 0,
      icon: '⭐',
    },
    {
      title: '安全违规次数',
      a: `${m.violation_count_a}`,
      b: `${m.violation_count_b}`,
      delta: `${deltaViol >= 0 ? '+' : ''}${deltaViol}`,
      good: deltaViol <= 0,
      icon: '🛡️',
    },
    {
      title: '提升/退步样本',
      a: `↑${m.improved_count} ↓${m.regressed_count}`,
      b: `持平 ${m.unchanged_count}`,
      delta: `样本合计 ${total}`,
      good: m.improved_count >= m.regressed_count,
      icon: '📊',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <div
            key={i}
            className="fade-in-up rounded-xl border border-border bg-bg-secondary p-4 hover:border-accent/50 transition-colors"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-text-secondary text-xs">{c.title}</span>
              <span className="text-lg leading-none">{c.icon}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] text-text-secondary font-mono mb-0.5">vA · vB</div>
                <div className="font-mono text-base font-semibold tabular-nums">
                  <span className="text-text-secondary mr-1.5">{c.a}</span>
                  <span className="text-accent">→</span>
                  <span className="ml-1.5">{c.b}</span>
                </div>
              </div>
              <div className={`font-mono text-sm font-semibold tabular-nums px-2 py-0.5 rounded ${c.good ? 'text-status-approved bg-status-approved/10' : 'text-status-rerun bg-status-rerun/10'}`}>
                {c.delta}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg-secondary p-4">
        <div className="flex items-center gap-2 mr-2">
          <span className="text-xs text-text-secondary">人工反馈决策分布：</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <StatusBadge status="APPROVED" />
            <span className="font-mono text-sm tabular-nums">{approved}</span>
            <span className="text-[10px] text-text-secondary">({pct(approved, total)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="REVIEW_REQUIRED" />
            <span className="font-mono text-sm tabular-nums">{review}</span>
            <span className="text-[10px] text-text-secondary">({pct(review, total)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="RERUN" />
            <span className="font-mono text-sm tabular-nums">{rerun}</span>
            <span className="text-[10px] text-text-secondary">({pct(rerun, total)}%)</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3 text-[11px]">
          <div className={`px-2 py-1 rounded border font-mono ${task.consistency_flag ? 'border-status-approved/30 text-status-approved bg-status-approved/5' : 'border-status-review/30 text-status-review bg-status-review/5'}`}>
            {task.consistency_flag ? '🛡 安全规则版本一致' : '⚠️ 安全规则版本不同，需复核'}
          </div>
          <div className={`px-2 py-1 rounded border font-mono ${pageHashValid ? 'border-status-approved/30 text-status-approved bg-status-approved/5' : 'border-status-rerun/30 text-status-rerun bg-status-rerun/5 pulse-border'}`} title="导出数据与页面摘要哈希校验结果">
            {pageHashValid ? `✓ 摘要校验通过 ${task.summary_hash.slice(0,8)}…` : '✗ 摘要不一致，请重新生成对比'}
          </div>
        </div>
      </div>
    </div>
  );
}
