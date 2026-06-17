import { useState } from 'react';
import { useEvalSamples, useReplayTrace, usePromptVersions } from '../api/hooks';
import { parseError } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ActionableError from '../components/ActionableError';

export default function Replay() {
  const pvQ = usePromptVersions();
  const versions = pvQ.data ?? [];
  const [pvId, setPvId] = useState<number | null>(versions[0]?.id ?? null);
  const [traceId, setTraceId] = useState<number | null>(null);

  if (versions.length > 0 && pvId == null) setPvId(versions[0].id);

  const samplesQ = useEvalSamples(pvId ?? undefined);
  const traceQ = useReplayTrace(traceId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">🔍 评测回放 · 结论溯源</h1>
        <p className="text-xs text-text-secondary mt-1">从结论出发，逆向追踪：评测样本 → 标注反馈 → 关联安全规则 → 原始提示词</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* 左侧：样本列表 */}
        <div className="col-span-5 space-y-3">
          <div className="rounded-xl border border-border bg-bg-secondary p-3 flex items-center gap-2">
            <span className="text-xs text-text-secondary">版本筛选:</span>
            <select
              value={pvId ?? ''}
              onChange={e => setPvId(Number(e.target.value))}
              className="bg-bg-tertiary border border-border rounded-lg px-3 py-1.5 text-xs font-mono flex-1"
            >
              {versions.map(v => <option key={v.id} value={v.id}>{v.version_tag}</option>)}
            </select>
          </div>

          <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border bg-bg-tertiary text-[11px] uppercase tracking-wider text-text-secondary font-mono">
              <div className="col-span-2">ID</div>
              <div className="col-span-6">输入</div>
              <div className="col-span-2">评分/状态</div>
              <div className="col-span-2">决策</div>
            </div>
            <div className="max-h-[640px] overflow-auto">
              {samplesQ.data?.map(s => (
                <div
                  key={s.id}
                  onClick={() => setTraceId(s.id)}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 border-b last:border-b-0 border-border items-center cursor-pointer row-hover ${traceId === s.id ? 'bg-accent/8' : ''}`}
                >
                  <div className="col-span-2 font-mono text-[11px] text-accent">{s.id} · {s.source_material_ref?.slice(-4)}</div>
                  <div className="col-span-6 text-xs line-clamp-2">{s.input_text}</div>
                  <div className="col-span-2">
                    <div className="font-mono text-sm tabular-nums">{s.score.toFixed(1)}</div>
                    <div className={`text-[10px] font-mono ${s.eval_status === 'PASS' ? 'text-status-approved' : s.eval_status === 'FAIL' ? 'text-status-rerun' : 'text-status-review'}`}>
                      {s.eval_status}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <StatusBadge status={s.latest_decision || 'REVIEW_REQUIRED'} size="sm" />
                  </div>
                </div>
              ))}
              {samplesQ.isLoading && <div className="p-10 text-center text-text-secondary text-xs">加载中...</div>}
              {samplesQ.isError && <div className="p-5"><ActionableError error={parseError(samplesQ.error)} onRetry={() => samplesQ.refetch()} /></div>}
            </div>
          </div>
        </div>

        {/* 右侧：溯源详情 */}
        <div className="col-span-7 space-y-3">
          {!traceId && (
            <div className="rounded-xl border border-dashed border-border p-16 text-center text-text-secondary">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-sm">点击左侧样本，查看完整溯源链路</div>
            </div>
          )}

          {traceQ.data && (
            <div className="space-y-4 fade-in-up">
              {/* 样本基础 */}
              <div className="rounded-xl border border-border bg-bg-secondary p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-text-secondary mb-1">样本 · {traceQ.data.source_material_ref}</div>
                    <div className="text-sm font-semibold">#{traceQ.data.sample_id} · {traceQ.data.prompt_version_tag}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono px-2 py-1 rounded ${traceQ.data.eval_status === 'PASS' ? 'bg-status-approved/15 text-status-approved border border-status-approved/30' : traceQ.data.eval_status === 'FAIL' ? 'bg-status-rerun/15 text-status-rerun border border-status-rerun/30' : 'bg-status-review/15 text-status-review border border-status-review/30'}`}>
                      {traceQ.data.eval_status}
                    </span>
                    <span className="text-xs font-mono px-2 py-1 rounded bg-bg-tertiary border border-border">评分 {traceQ.data.score}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] text-text-secondary mb-1 flex items-center gap-1">💬 用户输入</div>
                    <div className="rounded-lg border border-border bg-bg-tertiary p-3 text-xs">{traceQ.data.input_text}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-secondary mb-1 flex items-center gap-1">🤖 模型输出</div>
                    <div className="rounded-lg border border-border bg-bg-tertiary p-3 text-xs whitespace-pre-wrap leading-6">{traceQ.data.model_output}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-secondary mb-1 flex items-center gap-1">📝 提示词片段（{traceQ.data.prompt_version_tag}）</div>
                    <div className="rounded-lg border border-border bg-accent/5 p-3 text-xs whitespace-pre-wrap leading-6 font-mono text-text-secondary">
                      {traceQ.data.prompt_content_snippet}
                    </div>
                  </div>
                </div>
              </div>

              {/* 关联安全规则 */}
              {traceQ.data.affected_rules.length > 0 && (
                <div className="rounded-xl border border-status-review/30 bg-status-review/5 p-5 glow-review fade-in-up">
                  <div className="text-sm font-semibold mb-3 text-status-review flex items-center gap-2">
                    <span>🛡️</span> 关联的安全规则（需 MLOps 同步复核）
                  </div>
                  <div className="space-y-2">
                    {traceQ.data.affected_rules.map(r => (
                      <div key={r.id} className="rounded-lg border border-border bg-bg-secondary p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-semibold text-status-rerun">{r.id}</span>
                          <span className="text-[10px] text-text-secondary font-mono">v{r.version}</span>
                        </div>
                        <div className="text-xs text-text-primary">{r.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 反馈历史 */}
              <div className="rounded-xl border border-border bg-bg-secondary p-5">
                <div className="text-sm font-semibold mb-3">⏱️ 人工反馈历史（时间倒序）</div>
                {traceQ.data.feedback_history.length === 0 ? (
                  <div className="text-xs text-text-secondary py-6 text-center">暂无人工反馈记录</div>
                ) : (
                  <div className="space-y-3">
                    {traceQ.data.feedback_history.map((f, i) => (
                      <div key={f.id} className="fade-in-up rounded-lg border border-border bg-bg-tertiary p-3" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-accent">{f.evaluator}</span>
                            <span className="text-[10px] text-text-secondary font-mono">{new Date(f.created_at).toLocaleString()}</span>
                          </div>
                          <StatusBadge status={f.final_decision} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs mb-2 font-mono">
                          <div>
                            <span className="text-text-secondary">原始评分: </span>
                            <span className="tabular-nums">{f.original_score.toFixed(1)}</span>
                          </div>
                          <div>
                            <span className="text-text-secondary">修订评分: </span>
                            <span className={`tabular-nums ${f.revised_score >= f.original_score ? 'text-status-approved' : 'text-status-rerun'}`}>
                              {f.revised_score.toFixed(1)} ({f.revised_score >= f.original_score ? '+' : ''}{(f.revised_score - f.original_score).toFixed(1)})
                            </span>
                          </div>
                        </div>
                        {f.affects_safety_rules && (
                          <div className="text-[11px] text-status-review mb-2">
                            ⚠️ 此反馈标记为影响安全规则: {f.affected_rule_ids.join(', ')}
                          </div>
                        )}
                        {f.feedback_text && (
                          <div className="text-xs text-text-primary bg-bg-secondary rounded p-2 mb-2">{f.feedback_text}</div>
                        )}
                        <div className="text-[11px] text-text-secondary border-l-2 border-accent/50 pl-2">
                          💡 决策原因: {f.reason || '无'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {traceQ.isError && <ActionableError error={parseError(traceQ.error)} onRetry={() => traceQ.refetch()} />}
        </div>
      </div>
    </div>
  );
}
