import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, GitCompareArrows, Loader2, Database, History } from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { ReportPreview } from '@/components/ReportPreview';
import { BatchStatusBadge } from '@/components/Badge';
import { cn } from '@/lib/utils';
import { listBatches } from '@/lib/api';
import type { Batch, ComparisonMetrics, ComparisonResult } from '@shared/types';

const METRIC_ROWS: Array<{ key: keyof ComparisonMetrics; label: string; fmt: (n: number) => string }> = [
  { key: 'agreementRate', label: '一致率', fmt: (n) => `${Math.round(n * 100)}%` },
  { key: 'kappa', label: "Cohen's Kappa", fmt: (n) => n.toFixed(3) },
  { key: 'anomalyCount', label: '异常总数', fmt: (n) => String(n) },
  { key: 'resolvedCount', label: '已处理', fmt: (n) => String(n) },
  { key: 'biasCount', label: '偏科数', fmt: (n) => String(n) },
];

export default function ReportCompare() {
  const { id } = useParams<{ id: string }>();
  const {
    report,
    comparisons,
    loadingReport,
    loadingCompare,
    submitting,
    error,
    fetchReport,
    generateReport,
    fetchComparisons,
    compareBatches,
  } = useReviewStore();

  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [againstId, setAgainstId] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchReport(id);
    fetchComparisons(id);
    listBatches().then(setAllBatches).catch(() => {});
  }, [id, fetchReport, fetchComparisons]);

  const againstOptions = allBatches.filter((b) => b.id !== id);
  const latest = comparisons[0];

  const onGenerate = async () => {
    if (!id) return;
    await generateReport(id);
  };

  const onCompare = async () => {
    if (!id || !againstId) return;
    await compareBatches(id, againstId);
  };

  return (
    <div className="p-6 flex flex-col gap-5 max-w-[1280px] mx-auto">
      <div>
        <h2 className="font-display text-2xl text-ink">报告与对比</h2>
        <p className="text-xs text-ink-muted mt-0.5">
          左侧导出非技术可读报告；右侧灰度对比复用既有处理记录，不重复计算
        </p>
      </div>

      {error && <p className="text-xs text-oxblood">{error}</p>}

      <div className="grid grid-cols-2 gap-5">
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base text-ink flex items-center gap-1.5">
              <FileText size={15} className="text-teal" /> 报告导出
            </h3>
            <button
              onClick={onGenerate}
              disabled={loadingReport || submitting}
              className="inline-flex items-center gap-1.5 text-xs text-paper-50 bg-teal px-2.5 py-1.5 rounded-sm hover:bg-teal-soft disabled:opacity-50"
            >
              {loadingReport ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              生成报告
            </button>
          </div>
          {report ? (
            <ReportPreview html={report.html} generatedAt={report.generatedAt} />
          ) : (
            <ReportPreview html="" />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="font-display text-base text-ink flex items-center gap-1.5">
            <GitCompareArrows size={15} className="text-teal" /> 灰度对比
          </h3>

          <div className="flex items-center gap-2">
            <select
              value={againstId}
              onChange={(e) => setAgainstId(e.target.value)}
              className="flex-1 bg-paper-100 border border-ink/10 rounded-sm px-2.5 py-1.5 text-sm focus:outline-none focus:border-teal/50"
            >
              <option value="">选择对照批次…</option>
              {againstOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNo}（一致率 {Math.round(b.agreementRate * 100)}%）
                </option>
              ))}
            </select>
            <button
              onClick={onCompare}
              disabled={!againstId || loadingCompare}
              className="inline-flex items-center gap-1.5 text-xs text-paper-50 bg-teal px-2.5 py-1.5 rounded-sm hover:bg-teal-soft disabled:opacity-50"
            >
              {loadingCompare ? <Loader2 size={13} className="animate-spin" /> : <GitCompareArrows size={13} />}
              对比
            </button>
          </div>

          {latest ? (
            <ComparisonTable result={latest} />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-ink-faint gap-1.5 border border-dashed border-ink/15 rounded-sm">
              <GitCompareArrows size={22} />
              <p className="text-xs">选择对照批次后生成对比</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
              <History size={12} /> 历史对比记录
            </div>
            {comparisons.length === 0 ? (
              <p className="text-[11px] text-ink-faint">暂无历史对比</p>
            ) : (
              comparisons.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 text-[11px] bg-paper-100 border border-ink/8 rounded-sm px-2.5 py-1.5"
                >
                  <span className="font-mono text-ink-soft">{c.current.batchNo}</span>
                  <span className="text-ink-faint">vs</span>
                  <span className="font-mono text-ink-soft">{c.against.batchNo}</span>
                  <span className="ml-auto text-ink-faint">
                    {new Date(c.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ComparisonTable({ result }: { result: ComparisonResult }) {
  return (
    <div className="flex flex-col gap-2">
      <table className="w-full text-sm border border-ink/10 rounded-sm overflow-hidden">
        <thead>
          <tr className="bg-paper-200 text-[11px] text-ink-muted text-left">
            <th className="font-normal px-3 py-2">指标</th>
            <th className="font-normal px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-ink">{result.current.batchNo}</span>
                <BatchStatusBadge status={result.current.status} />
              </div>
            </th>
            <th className="font-normal px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-ink">{result.against.batchNo}</span>
                <BatchStatusBadge status={result.against.status} />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {METRIC_ROWS.map((row, i) => {
            const cur = result.currentMetrics[row.key];
            const agt = result.againstMetrics[row.key];
            const better = cur > agt;
            return (
              <tr key={row.key} className={cn(i > 0 && 'rule')}>
                <td className="px-3 py-2 text-ink-soft">{row.label}</td>
                <td className={cn('px-3 py-2 tnum', better ? 'text-teal' : 'text-ink')}>
                  {row.fmt(cur)}
                </td>
                <td className={cn('px-3 py-2 tnum', !better ? 'text-teal' : 'text-ink')}>
                  {row.fmt(agt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="flex items-start gap-1 text-[11px] text-ink-muted bg-amber2-tint border border-amber2/20 rounded-sm px-2.5 py-1.5">
        <Database size={12} className="mt-0.5 shrink-0 text-amber2" />
        <span>{result.note || '数据来源：本批既有处理记录，未重复计算'}</span>
      </p>
    </div>
  );
}
