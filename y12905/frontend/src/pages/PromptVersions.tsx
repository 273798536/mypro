import { useState } from 'react';
import { usePromptVersions, useCreatePromptVersion, useEvalSamples } from '../api/hooks';
import { parseError } from '../api/client';
import ActionableError from '../components/ActionableError';
import StatusBadge from '../components/StatusBadge';

const DEFAULT_RULES = [
  { id: 'R-001', text: '禁止输出涉及个人隐私信息', version: '1.0' },
];

export default function PromptVersions() {
  const q = usePromptVersions();
  const createQ = useCreatePromptVersion();
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const [form, setForm] = useState({
    version_tag: '',
    content: '',
    change_log: '',
  });

  const submit = async () => {
    await createQ.mutateAsync({
      ...form,
      safety_rules_snapshot: { rules: DEFAULT_RULES },
    });
    setForm({ version_tag: '', content: '', change_log: '' });
    setShowCreate(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">📦 提示词版本管理</h1>
          <p className="text-xs text-text-secondary mt-1">录入、查看所有提示词版本及关联的安全规则快照</p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="px-4 py-2 rounded-lg bg-accent/90 text-white text-sm font-medium hover:bg-accent"
        >
          + 录入新版本
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 space-y-3 fade-in-up">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">录入提示词版本</div>
            <button onClick={() => setShowCreate(false)} className="text-text-secondary hover:text-text-primary text-xs">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">版本标签 (如 v1.3)</label>
              <input
                value={form.version_tag}
                onChange={e => setForm(f => ({ ...f, version_tag: e.target.value }))}
                placeholder="v1.3-myfeature"
                className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">变更说明</label>
              <input
                value={form.change_log}
                onChange={e => setForm(f => ({ ...f, change_log: e.target.value }))}
                placeholder="新增XX规则 / 优化XX场景"
                className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">提示词内容</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={8}
              placeholder="粘贴完整的系统提示词..."
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm font-mono leading-6"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-border text-xs">取消</button>
            <button
              onClick={submit}
              disabled={!form.version_tag || !form.content || createQ.isPending}
              className="px-4 py-2 rounded-lg bg-status-approved text-white text-xs font-medium disabled:opacity-40 hover:brightness-110"
            >
              {createQ.isPending ? '录入中...' : '确认录入'}
            </button>
          </div>
          {createQ.isError && <ActionableError error={parseError(createQ.error)} />}
        </div>
      )}

      {q.isError && <ActionableError error={parseError(q.error)} onRetry={() => q.refetch()} />}

      <div className="space-y-3">
        {(q.data ?? []).map((v, i) => (
          <VersionCard
            key={v.id}
            v={v}
            index={i}
            expanded={expanded === v.id}
            onToggle={() => setExpanded(expanded === v.id ? null : v.id)}
          />
        ))}
      </div>
    </div>
  );
}

function VersionCard({ v, index, expanded, onToggle }: any) {
  const sq = useEvalSamples(expanded ? v.id : undefined);
  const ruleCount = v.safety_rules_snapshot?.rules?.length ?? 0;
  return (
    <div
      className="rounded-xl border border-border bg-bg-secondary overflow-hidden fade-in-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-bg-tertiary/40" onClick={onToggle}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${ruleCount >= 6 ? 'bg-status-approved/15 text-status-approved' : ruleCount >= 3 ? 'bg-accent/15 text-accent' : 'bg-status-review/15 text-status-review'}`}>
          {v.version_tag.replace(/^v/, '').split('.')[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">{v.version_tag}</span>
            <span className="text-[10px] text-text-secondary font-mono">ID: {v.id}</span>
            <span className="text-[10px] text-text-secondary font-mono">创建: {new Date(v.created_at).toLocaleString()}</span>
          </div>
          <div className="text-xs text-text-secondary mt-0.5 truncate">
            {v.change_log || '(无变更说明)'}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-text-secondary uppercase">安全规则</div>
            <div className="font-mono text-sm text-status-approved">{ruleCount} 条</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-text-secondary uppercase">样本数</div>
            <div className="font-mono text-sm text-accent">{sq.data?.length ?? '-'}</div>
          </div>
          <div className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▾</div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4 fade-in-up">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-text-secondary mb-2">📝 提示词内容</div>
            <pre className="rounded-lg border border-border bg-bg-tertiary p-4 text-xs font-mono leading-6 whitespace-pre-wrap max-h-[300px] overflow-auto">
{v.content}
            </pre>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-text-secondary mb-2">🛡️ 安全规则快照</div>
            {v.safety_rules_snapshot?.rules?.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {v.safety_rules_snapshot.rules.map((r: any) => (
                  <div key={r.id} className="rounded-lg border border-border bg-bg-tertiary p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-semibold text-status-rerun">{r.id}</span>
                      <span className="text-[10px] text-text-secondary font-mono">v{r.version}</span>
                    </div>
                    <div className="text-xs">{r.text}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-secondary p-4 text-center rounded-lg border border-dashed border-border">
                该版本未配置安全规则
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-text-secondary mb-2">📊 最近评测样本（前 5 条）</div>
            {sq.data && sq.data.length > 0 ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-bg-tertiary text-[10px] uppercase tracking-wider text-text-secondary font-mono">
                  <div className="col-span-1">ID</div>
                  <div className="col-span-5">输入</div>
                  <div className="col-span-2">评分</div>
                  <div className="col-span-2">违规</div>
                  <div className="col-span-2">决策</div>
                </div>
                {sq.data.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="grid grid-cols-12 gap-2 px-4 py-2 border-t border-border items-center row-hover text-xs">
                    <div className="col-span-1 font-mono text-[11px]">{s.id}</div>
                    <div className="col-span-5 truncate">{s.input_text}</div>
                    <div className="col-span-2 font-mono tabular-nums">{s.score.toFixed(1)}</div>
                    <div className="col-span-2 font-mono text-[10px]">
                      {s.safety_violations.length > 0
                        ? <span className="text-status-rerun">{s.safety_violations.join(',')}</span>
                        : <span className="text-status-approved">—</span>}
                    </div>
                    <div className="col-span-2"><StatusBadge status={s.latest_decision || 'REVIEW_REQUIRED'} size="sm" /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-secondary p-4 text-center rounded-lg border border-dashed border-border">
                {sq.isLoading ? '加载中...' : '暂无评测样本，可通过 POST /api/eval-samples 批量录入'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
