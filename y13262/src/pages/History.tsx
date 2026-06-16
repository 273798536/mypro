import { useEffect, useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { useComplaintStore } from '@/stores/complaintStore';
import type { ConfirmationAction } from '../../shared/types';
import HistoryTimeline from '@/components/HistoryTimeline';

export default function History() {
  const { histories, historiesTotal, loading, fetchHistories } = useComplaintStore();
  const [actionFilter, setActionFilter] = useState<ConfirmationAction | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [mergeGroupId, setMergeGroupId] = useState('');

  useEffect(() => {
    fetchHistories();
  }, []);

  const handleSearch = () => {
    const filters: Record<string, string> = {};
    if (actionFilter) filters.action = actionFilter;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;
    if (mergeGroupId) filters.merge_group_id = mergeGroupId;
    fetchHistories(filters);
  };

  const actionOptions: { value: ConfirmationAction | ''; label: string }[] = [
    { value: '', label: '全部操作' },
    { value: 'confirm', label: '确认归并' },
    { value: 'unconfirm', label: '取消确认' },
    { value: 'edit_note', label: '编辑备注' },
    { value: 'merge', label: '创建归并' },
    { value: 'unmerge', label: '取消归并' },
  ];

  const actionCounts = histories.reduce<Record<string, number>>((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          <Clock size={24} style={{ color: 'var(--color-primary)' }} />
          历史审计
        </h2>
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          共 {historiesTotal} 条记录
        </span>
      </div>

      <div
        className="flex flex-wrap items-end gap-3 rounded-xl border p-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as ConfirmationAction | '')}
          className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {actionOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="归并组 ID"
          value={mergeGroupId}
          onChange={(e) => setMergeGroupId(e.target.value)}
          className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
          style={{ borderColor: 'var(--color-border)' }}
        />

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
          style={{ borderColor: 'var(--color-border)' }}
        />
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>至</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
          style={{ borderColor: 'var(--color-border)' }}
        />

        <button
          onClick={handleSearch}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          查询
        </button>
      </div>

      {Object.keys(actionCounts).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(actionCounts).map(([action, count]) => {
            const labels: Record<string, string> = {
              confirm: '确认归并',
              unconfirm: '取消确认',
              edit_note: '编辑备注',
              merge: '创建归并',
              unmerge: '取消归并',
            };
            return (
              <div
                key={action}
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
              >
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{labels[action] || action}</span>
                <span className="ml-2 text-sm font-semibold">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="rounded-xl border p-6"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            <span className="ml-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>加载中...</span>
          </div>
        ) : (
          <HistoryTimeline logs={histories} />
        )}
      </div>
    </div>
  );
}
