import { useMemo, useState } from 'react';
import { useAllFeedback } from '../api/hooks';
import { parseError } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ActionableError from '../components/ActionableError';
import type { FinalDecision, HumanFeedback } from '../types';

type Filter = 'all' | FinalDecision | 'safety';

export default function FeedbackLog() {
  const q = useAllFeedback();
  const data = q.data ?? [];
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const summary = useMemo(() => {
    const s = { total: data.length, APPROVED: 0, REVIEW_REQUIRED: 0, RERUN: 0, safety: 0 };
    for (const f of data) {
      s[f.final_decision] = (s[f.final_decision] || 0) + 1;
      if (f.affects_safety_rules) s.safety++;
    }
    return s;
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter(f => {
      if (search) {
        const s = search.toLowerCase();
        const inText = f.feedback_text.toLowerCase().includes(s);
        const inRules = (f.affected_rule_ids || []).join(',').toLowerCase().includes(s);
        const inEval = f.evaluator.toLowerCase().includes(s);
        if (!inText && !inRules && !inEval && String(f.eval_sample_id) !== s) return false;
      }
      if (filter === 'all') return true;
      if (filter === 'safety') return f.affects_safety_rules;
      return f.final_decision === filter;
    });
  }, [data, filter, search]);

  const FilterBtn = ({ f, label }: { f: Filter; label: string }) => (
    <button
      onClick={() => setFilter(f)}
      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
        filter === f ? 'border-accent bg-accent/15 text-accent' : 'border-border text-text-secondary hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">📋 人工反馈日志</h1>
        <p className="text-xs text-text-secondary mt-1">所有人工反馈修改记录、安全规则联动标记、最终决策结论汇总</p>
      </div>

      {/* 摘要卡 */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: '反馈总条数', value: summary.total, icon: '📋', color: 'text-accent' },
          { label: '🟢 可直接用', value: summary.APPROVED, icon: '✅', color: 'text-status-approved' },
          { label: '🟡 待MLOps复核', value: summary.REVIEW_REQUIRED, icon: '👀', color: 'text-status-review' },
          { label: '🔴 需重新评测', value: summary.RERUN, icon: '🔄', color: 'text-status-rerun' },
          { label: '⚠️ 关联安全规则', value: summary.safety, icon: '🛡️', color: 'text-status-review' },
        ].map((c, i) => (
          <div
            key={i}
            className="fade-in-up rounded-xl border border-border bg-bg-secondary p-4 hover:border-accent/40"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-text-secondary">{c.label}</span>
              <span>{c.icon}</span>
            </div>
            <div className={`font-mono text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* 过滤条 */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-secondary p-3">
        <div className="flex gap-1.5 flex-wrap">
          <FilterBtn f="all" label={`全部 (${summary.total})`} />
          <FilterBtn f="APPROVED" label={`🟢 可直接用 (${summary.APPROVED})`} />
          <FilterBtn f="REVIEW_REQUIRED" label={`🟡 待复核 (${summary.REVIEW_REQUIRED})`} />
          <FilterBtn f="RERUN" label={`🔴 需重跑 (${summary.RERUN})`} />
          <FilterBtn f="safety" label={`🛡 安全相关 (${summary.safety})`} />
        </div>
        <div className="ml-auto">
          <input
            placeholder="🔍 搜索样本ID / 规则ID / 标注员 / 备注"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-bg-tertiary border border-border rounded-lg px-3 py-1.5 text-xs w-80 focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {q.isError && <ActionableError error={parseError(q.error)} onRetry={() => q.refetch()} />}

      {/* 列表 */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-bg-secondary border-b border-border text-[11px] uppercase tracking-wider text-text-secondary font-mono">
          <div className="col-span-1">ID</div>
          <div className="col-span-1">样本ID</div>
          <div className="col-span-1">标注员</div>
          <div className="col-span-2 text-center">评分 原→新</div>
          <div className="col-span-2">安全规则</div>
          <div className="col-span-2">决策结论</div>
          <div className="col-span-2">决策原因</div>
          <div className="col-span-1 text-right">时间</div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-text-secondary text-xs">无符合条件的反馈记录</div>
        ) : (
          filtered.map((f: HumanFeedback, i: number) => (
            <div
              key={f.id}
              className="grid grid-cols-12 gap-2 px-4 py-3 border-b last:border-b-0 border-border items-center row-hover fade-in-up"
              style={{ animationDelay: `${i * 10}ms` }}
            >
              <div className="col-span-1 font-mono text-[11px] text-text-secondary">{f.id}</div>
              <div className="col-span-1 font-mono text-[11px] text-accent">#{f.eval_sample_id}</div>
              <div className="col-span-1 text-xs truncate">{f.evaluator}</div>
              <div className="col-span-2 text-center font-mono text-sm tabular-nums">
                <span className="text-text-secondary">{f.original_score.toFixed(1)}</span>
                <span className="mx-1 text-text-secondary">→</span>
                <span className={f.revised_score >= f.original_score ? 'text-status-approved' : 'text-status-rerun'}>
                  {f.revised_score.toFixed(1)}
                </span>
              </div>
              <div className="col-span-2">
                {f.affects_safety_rules ? (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-review/15 text-status-review border border-status-review/30">
                      🛡 关联
                    </span>
                    {(f.affected_rule_ids || []).map(r => (
                      <span key={r} className="text-[10px] font-mono text-status-rerun bg-status-rerun/10 px-1 rounded">{r}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-text-secondary">无关联</span>
                )}
              </div>
              <div className="col-span-2">
                <StatusBadge status={f.final_decision} />
              </div>
              <div className="col-span-2 text-[11px] text-text-secondary line-clamp-2" title={f.reason + (f.feedback_text ? ` | ${f.feedback_text}` : '')}>
                {f.reason || f.feedback_text || '—'}
              </div>
              <div className="col-span-1 text-right text-[10px] text-text-secondary font-mono">
                {new Date(f.created_at).toLocaleDateString()} {new Date(f.created_at).toLocaleTimeString().slice(0, 5)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
