import { useMemo, useState } from 'react';
import {
  usePromptVersions, useGrayCompare, useGrayCompareList, useCreateGrayCompare,
  useGrayCompareHash, useCreateFeedback, useExportPreview,
} from '../api/hooks';
import { parseError } from '../api/client';
import { useCompareStore } from '../stores';
import VersionSelector from '../components/VersionSelector';
import SummaryCards from '../components/SummaryCards';
import DiffViewer from '../components/DiffViewer';
import StatusBadge from '../components/StatusBadge';
import ActionableError from '../components/ActionableError';
import type { FinalDecision, SampleDiff } from '../types';

type Filter = 'all' | FinalDecision | 'improved' | 'regressed';

export default function GrayCompare() {
  const { versionA, versionB, currentCompareId, setVersionA, setVersionB, setCurrentCompare } = useCompareStore();
  const pvQ = usePromptVersions();
  const listQ = useGrayCompareList();
  const compareQ = useGrayCompare(currentCompareId, true);
  const hashQ = useGrayCompareHash(currentCompareId);
  const prevQ = useExportPreview(currentCompareId);
  const createCmp = useCreateGrayCompare();
  const createFb = useCreateFeedback();

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [fbForm, setFbForm] = useState<{ sample_id: number | null; score: number; affects: boolean; rules: string }>({ sample_id: null, score: 4.0, affects: false, rules: '' });

  const versions = pvQ.data ?? [];

  // 自动选择历史对比任务
  useMemo(() => {
    if (!currentCompareId && listQ.data && listQ.data.length > 0) {
      setCurrentCompare(listQ.data[0].id);
      setVersionA(listQ.data[0].version_a_id);
      setVersionB(listQ.data[0].version_b_id);
    }
  }, [listQ.data, currentCompareId]);

  const pageCounts = prevQ.data?.decision_counts;
  const hashValid = !currentCompareId || !hashQ.data || !compareQ.data ? true : (hashQ.data.summary_hash === compareQ.data.summary_hash);

  const filtered = useMemo(() => {
    const diffs = compareQ.data?.sample_diffs ?? [];
    return diffs.filter(d => {
      if (search && !(d.input_text.includes(search) || d.source_material_ref.includes(search))) return false;
      if (filter === 'all') return true;
      if (filter === 'improved') return d.score_delta > 0;
      if (filter === 'regressed') return d.score_delta < 0;
      return (d.decision || 'REVIEW_REQUIRED') === filter;
    });
  }, [compareQ.data, filter, search]);

  const handleCreate = async () => {
    if (!versionA || !versionB) return;
    const res = await createCmp.mutateAsync({ version_a_id: versionA, version_b_id: versionB });
    setCurrentCompare(res.data.id);
    setShowCreate(false);
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (!currentCompareId) return;
    window.open(`/api/export/${currentCompareId}?format=${format}&checksum=true`, '_blank');
  };

  const submitFeedback = async () => {
    if (!fbForm.sample_id) return;
    await createFb.mutateAsync({
      eval_sample_id: fbForm.sample_id,
      revised_score: fbForm.score,
      affects_safety_rules: fbForm.affects,
      affected_rule_ids: fbForm.rules.split(',').map(s => s.trim()).filter(Boolean),
      evaluator: 'web-user',
      feedback_text: `来自看板人工反馈 @ ${new Date().toLocaleString()}`,
    });
    setFbForm({ sample_id: null, score: 4.0, affects: false, rules: '' });
    compareQ.refetch();
    hashQ.refetch();
    prevQ.refetch();
  };

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
      {/* 顶部：标题 + 导出 + 新建对比 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">🧪 灰度对比看板</h1>
          <p className="text-xs text-text-secondary mt-1">选择 A/B 版本 → 逐样本对比输出 → 提交人工反馈 → 锁定决策结论</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-xs font-mono"
            value={currentCompareId ?? ''}
            onChange={e => {
              const id = Number(e.target.value);
              setCurrentCompare(id);
              const t = listQ.data?.find(x => x.id === id);
              if (t) { setVersionA(t.version_a_id); setVersionB(t.version_b_id); }
            }}
          >
            <option value="">选择历史对比任务</option>
            {listQ.data?.map(t => (
              <option key={t.id} value={t.id}>
                #{t.id} · {t.version_a_tag} ↔ {t.version_b_tag} · {new Date(t.created_at).toLocaleString()}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="px-4 py-2 rounded-lg bg-accent/90 text-white text-sm font-medium hover:bg-accent transition-colors"
          >
            + 新建对比任务
          </button>
          {currentCompareId && (
            <>
              <button onClick={() => handleExport('csv')} className="px-3 py-2 rounded-lg border border-border hover:border-accent hover:text-accent text-xs">⬇ CSV</button>
              <button onClick={() => handleExport('json')} className="px-3 py-2 rounded-lg border border-border hover:border-accent hover:text-accent text-xs">⬇ JSON</button>
            </>
          )}
        </div>
      </div>

      {/* 新建对比面板 */}
      {showCreate && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 space-y-4 fade-in-up">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">创建灰度对比任务</div>
            <button onClick={() => setShowCreate(false)} className="text-text-secondary hover:text-text-primary text-xs">✕</button>
          </div>
          {pvQ.isError && <ActionableError error={parseError(pvQ.error)} onRetry={() => pvQ.refetch()} />}
          {pvQ.isLoading && <div className="text-center py-8 text-text-secondary">加载提示词版本中...</div>}
          {pvQ.data && <VersionSelector versions={versions} valueA={versionA} valueB={versionB} onChangeA={setVersionA} onChangeB={setVersionB} />}
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-border text-xs">取消</button>
            <button
              onClick={handleCreate}
              disabled={!versionA || !versionB || createCmp.isPending}
              className="px-4 py-2 rounded-lg bg-status-approved text-white text-xs font-medium disabled:opacity-40 hover:brightness-110"
            >
              {createCmp.isPending ? '创建中...' : '创建并运行对比'}
            </button>
          </div>
          {createCmp.isError && <ActionableError error={parseError(createCmp.error)} />}
        </div>
      )}

      {/* 错误处理 */}
      {compareQ.isError && <ActionableError error={parseError(compareQ.error)} onRetry={() => compareQ.refetch()} />}
      {!currentCompareId && !showCreate && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-text-secondary">
          <div className="text-4xl mb-3">🧪</div>
          <div className="text-sm">请选择一个历史对比任务，或点击「+ 新建对比任务」开始。</div>
        </div>
      )}

      {/* 摘要卡片 */}
      {compareQ.data && (
        <SummaryCards
          task={compareQ.data}
          pageCounts={pageCounts as any}
          pageHashValid={hashValid}
        />
      )}

      {/* 过滤条 + 搜索 */}
      {compareQ.data && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-secondary p-3">
          <div className="flex gap-1.5 flex-wrap">
            <FilterBtn f="all" label={`全部 (${compareQ.data.sample_diffs?.length ?? 0})`} />
            <FilterBtn f="improved" label={`⬆ 提升 (${compareQ.data.metrics_summary.improved_count})`} />
            <FilterBtn f="regressed" label={`⬇ 退步 (${compareQ.data.metrics_summary.regressed_count})`} />
            <FilterBtn f="APPROVED" label={`🟢 可直接用 (${pageCounts?.APPROVED ?? 0})`} />
            <FilterBtn f="REVIEW_REQUIRED" label={`🟡 待复核 (${pageCounts?.REVIEW_REQUIRED ?? 0})`} />
            <FilterBtn f="RERUN" label={`🔴 需重跑 (${pageCounts?.RERUN ?? 0})`} />
          </div>
          <div className="ml-auto">
            <input
              placeholder="🔍 搜索输入内容 / 样本编号..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-bg-tertiary border border-border rounded-lg px-3 py-1.5 text-xs w-72 focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      )}

      {/* 对比列表 */}
      {filtered.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-bg-secondary border-b border-border text-[11px] uppercase tracking-wider text-text-secondary font-mono">
            <div className="col-span-1">#</div>
            <div className="col-span-2">来源材料</div>
            <div className="col-span-2">用户输入</div>
            <div className="col-span-1 text-center">评分 A/B</div>
            <div className="col-span-1 text-center">波动</div>
            <div className="col-span-2 text-center">违规 A / B</div>
            <div className="col-span-2 text-center">最终决策</div>
            <div className="col-span-1 text-right">操作</div>
          </div>
          {filtered.map((d: SampleDiff, i: number) => (
            <div key={d.sample_id} className="border-b last:border-b-0 border-border row-hover fade-in-up" style={{ animationDelay: `${i * 15}ms` }}>
              <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                <div className="col-span-1 font-mono text-[11px] text-text-secondary">{d.sample_id}</div>
                <div className="col-span-2 font-mono text-[11px] text-accent">{d.source_material_ref}</div>
                <div className="col-span-2 text-xs line-clamp-2">{d.input_text}</div>
                <div className="col-span-1 text-center font-mono text-sm tabular-nums">
                  <span className="text-text-secondary">{d.score_a.toFixed(1)}</span>
                  <span className="mx-0.5 text-text-secondary">/</span>
                  <span className={d.score_b >= d.score_a ? 'text-status-approved' : 'text-status-rerun'}>{d.score_b.toFixed(1)}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className={`font-mono text-xs tabular-nums px-1.5 py-0.5 rounded ${d.score_delta > 0 ? 'text-status-approved bg-status-approved/10' : d.score_delta < 0 ? 'text-status-rerun bg-status-rerun/10' : 'text-text-secondary'}`}>
                    {d.score_delta > 0 ? '+' : ''}{d.score_delta.toFixed(1)}
                  </span>
                </div>
                <div className="col-span-2 text-center font-mono text-[11px]">
                  <span className={d.violations_a.length > 0 ? 'text-status-rerun' : 'text-text-secondary'}>
                    {d.violations_a.length > 0 ? d.violations_a.join(',') : '—'}
                  </span>
                  <span className="mx-1 text-border">|</span>
                  <span className={d.violations_b.length > 0 ? 'text-status-rerun' : 'text-status-approved'}>
                    {d.violations_b.length > 0 ? d.violations_b.join(',') : '—'}
                  </span>
                </div>
                <div className="col-span-2 text-center">
                  <StatusBadge status={d.decision || 'REVIEW_REQUIRED'} />
                </div>
                <div className="col-span-1 text-right text-xs">
                  <button
                    onClick={() => setExpanded(e => ({ ...e, [d.sample_id]: !e[d.sample_id] }))}
                    className="text-accent hover:underline mr-2"
                  >
                    {expanded[d.sample_id] ? '收起' : '对比'}
                  </button>
                  <button
                    onClick={() => setFbForm({ sample_id: d.sample_id, score: d.score_b, affects: d.violations_b.length > 0, rules: d.violations_b.join(',') })}
                    className="text-status-review hover:underline"
                  >
                    反馈
                  </button>
                </div>
              </div>
              {expanded[d.sample_id] && (
                <div className="px-4 pb-4 pt-1 bg-bg-secondary/40">
                  <div className="mb-2 text-[11px] text-text-secondary">
                    {d.reason && <span className="inline-flex items-center px-2 py-0.5 rounded bg-bg-tertiary border border-border mr-2">💡 {d.reason}</span>}
                  </div>
                  <DiffViewer a={d.output_a} b={d.output_b} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 人工反馈弹窗 */}
      {fbForm.sample_id && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setFbForm(f => ({ ...f, sample_id: null }))}>
          <div className="w-[480px] rounded-xl border border-border bg-bg-secondary p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-sm font-semibold">提交人工反馈 · 样本 #{fbForm.sample_id}</div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">修订评分 (0 - 5)</label>
              <input
                type="number" step="0.1" min={0} max={5}
                value={fbForm.score}
                onChange={e => setFbForm(f => ({ ...f, score: Number(e.target.value) }))}
                className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={fbForm.affects} onChange={e => setFbForm(f => ({ ...f, affects: e.target.checked }))} />
              此反馈涉及 <span className="text-status-review font-semibold">安全规则变更</span>（需 MLOps 同步复核规则）
            </label>
            <div>
              <label className="text-xs text-text-secondary block mb-1">影响的安全规则 ID（逗号分隔，如 R-007,R-004）</label>
              <input
                value={fbForm.rules}
                onChange={e => setFbForm(f => ({ ...f, rules: e.target.value }))}
                className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-xs font-mono"
                placeholder="R-007,R-004"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setFbForm(f => ({ ...f, sample_id: null }))} className="px-4 py-2 rounded-lg border border-border text-xs">取消</button>
              <button
                onClick={submitFeedback}
                disabled={createFb.isPending}
                className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:brightness-110 disabled:opacity-40"
              >
                提交（系统自动判定结论）
              </button>
            </div>
            {createFb.isError && <ActionableError error={parseError(createFb.error)} />}
          </div>
        </div>
      )}
    </div>
  );
}
