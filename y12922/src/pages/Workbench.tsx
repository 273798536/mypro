import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  AlertCircle,
  Clock,
  Inbox,
  Loader2,
  Fingerprint,
  ChevronRight,
} from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { StatCard } from '@/components/StatCard';
import { ProgressBar } from '@/components/ProgressBar';
import { BatchStatusBadge } from '@/components/Badge';
import { ImportDialog } from '@/components/ImportDialog';
import { cn } from '@/lib/utils';
import {
  STATUS_FLOW,
  BATCH_STATUS_LABELS,
  type BatchStatus,
} from '@shared/types';

export default function Workbench() {
  const navigate = useNavigate();
  const {
    dashboard,
    batches,
    loadingDashboard,
    loadingBatches,
    error,
    fetchDashboard,
    fetchBatches,
  } = useReviewStore();

  const [statusFilter, setStatusFilter] = useState<BatchStatus | ''>('');
  const [q, setQ] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchBatches();
  }, [fetchDashboard, fetchBatches]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchBatches({
        status: statusFilter || undefined,
        q: q || undefined,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [statusFilter, q, fetchBatches]);

  const byStatus = dashboard?.byStatus ?? {
    IMPORTED: 0,
    REVIEWING: 0,
    REVIEWED: 0,
    EXPORTED: 0,
  };

  return (
    <div className="p-6 flex flex-col gap-5 max-w-[1280px] mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl text-ink">复盘工作台</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            汇总各状态批次、待复核异常与最近导出，所有结论可反查
          </p>
        </div>
        <button
          onClick={() => setImportOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm text-paper-50 bg-teal px-3 py-2 rounded-sm hover:bg-teal-soft"
        >
          <Plus size={15} /> 导入批次
        </button>
      </div>

      {error && (
        <p className="text-xs text-oxblood flex items-center gap-1">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      <div className="grid grid-cols-4 gap-3">
        {STATUS_FLOW.map((s) => (
          <StatCard
            key={s}
            label={BATCH_STATUS_LABELS[s]}
            value={loadingDashboard ? '—' : byStatus[s] ?? 0}
            tone={
              s === 'EXPORTED'
                ? 'teal'
                : s === 'REVIEWING'
                  ? 'amber'
                  : 'ink'
            }
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="待复核异常"
          value={dashboard?.openAnomalies ?? 0}
          hint="尚未处理的异常总数"
          tone="amber"
          icon={<AlertCircle size={16} />}
        />
        <StatCard
          label="最近导出"
          value={
            dashboard?.lastExportAt
              ? new Date(dashboard.lastExportAt).toLocaleDateString('zh-CN')
              : '—'
          }
          hint={
            dashboard?.lastExportAt
              ? new Date(dashboard.lastExportAt).toLocaleTimeString('zh-CN')
              : '暂无导出记录'
          }
          icon={<Clock size={16} />}
        />
      </div>

      <div className="bg-paper-50 border border-ink/10 rounded-sm shadow-ledger">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-ink/10">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('')}
              className={cn(
                'text-xs px-2.5 py-1 rounded-sm border',
                statusFilter === ''
                  ? 'bg-ink text-paper-50 border-ink'
                  : 'border-ink/15 text-ink-soft hover:bg-paper-200',
              )}
            >
              全部
            </button>
            {STATUS_FLOW.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-sm border',
                  statusFilter === s
                    ? 'bg-ink text-paper-50 border-ink'
                    : 'border-ink/15 text-ink-soft hover:bg-paper-200',
                )}
              >
                {BATCH_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="relative w-64">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索批次编号 / 指纹"
              className="w-full pl-7 pr-2 py-1.5 text-xs bg-paper-100 border border-ink/10 rounded-sm focus:outline-none focus:border-teal/50"
            />
          </div>
        </div>

        {loadingBatches ? (
          <div className="flex items-center justify-center py-16 text-ink-faint gap-2 text-sm">
            <Loader2 size={16} className="animate-spin" /> 加载批次…
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-ink-faint gap-2">
            <Inbox size={28} />
            <p className="text-sm">暂无批次，点击右上角导入</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-ink-muted text-left">
                <th className="font-normal px-4 py-2">批次编号</th>
                <th className="font-normal px-4 py-2">状态</th>
                <th className="font-normal px-4 py-2 w-44">一致率</th>
                <th className="font-normal px-4 py-2">异常</th>
                <th className="font-normal px-4 py-2">指纹</th>
                <th className="font-normal px-4 py-2">导入时间</th>
                <th className="font-normal px-4 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => navigate(`/batches/${b.id}`)}
                  className="rule cursor-pointer hover:bg-paper-100/70 group"
                >
                  <td className="px-4 py-2.5">
                    <span className="font-display text-sm text-ink">{b.batchNo}</span>
                    <span className="ml-2 text-[11px] text-ink-faint">
                      {b.sampleCount} 样本
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <BatchStatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    <ProgressBar
                      value={b.agreementRate}
                      showValue
                      tone={b.agreementRate < 0.8 ? 'amber' : 'teal'}
                    />
                  </td>
                  <td className="px-4 py-2.5 tnum text-ink-soft">
                    {b.anomalyCount}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-muted">
                      <Fingerprint size={12} />
                      <span className="truncate max-w-[120px]" title={b.fingerprint}>
                        {b.fingerprint.slice(0, 12)}…
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tnum text-[11px] text-ink-muted">
                    {new Date(b.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-2.5 text-ink-faint group-hover:text-teal">
                    <ChevronRight size={15} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
