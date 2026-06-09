import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Plus, Filter, FileText, AlertTriangle, CheckCircle2, XCircle,
  FlaskConical, TrendingUp,
} from 'lucide-react';
import { useRecords } from '@/hooks/useRecord';
import { useUiStore } from '@/store/useUiStore';
import { RecordCard } from '@/components/record/RecordCard';
import { EmptyState } from '@/components/common/UIComponents';
import { formatDateTime } from '@/utils/format';
import type { RecordStatus } from '@/types';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { records, loaded } = useRecords();
  const searchQuery = useUiStore(s => s.searchQuery);
  const setSearchQuery = useUiStore(s => s.setSearchQuery);
  const filterStatus = useUiStore(s => s.filterStatus);
  const setFilterStatus = useUiStore(s => s.setFilterStatus);

  const stats = useMemo(() => {
    const ready = records.filter(r => r.status === 'ready').length;
    const review = records.filter(r => r.status === 'needs_review').length;
    const invalid = records.filter(r => r.status === 'invalid').length;
    const lastUpdate = records.length
      ? records.reduce((a, b) => new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b).updatedAt
      : '';
    return { total: records.length, ready, review, invalid, lastUpdate };
  }, [records]);

  const filtered = useMemo(() => {
    let list = [...records];
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(r =>
        r.batchNumber.toLowerCase().includes(q) ||
        r.sampleName.toLowerCase().includes(q) ||
        r.operator.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [records, searchQuery, filterStatus]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-lab-500">
          <FlaskConical className="w-6 h-6 animate-pulse" />
          <span className="text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-lab-900 flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-lab-600" />
            记录总览
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            共 {stats.total} 条记录 · 最近更新 {stats.lastUpdate ? formatDateTime(stats.lastUpdate) : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/reports" className="btn-secondary">
            <FileText className="w-4 h-4" />
            报告中心
          </Link>
          <Link to="/records/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            新建记录
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: '全部记录',
            value: stats.total,
            icon: FlaskConical,
            color: 'from-lab-500 to-lab-700',
            text: 'text-lab-700',
            delay: 'stagger-1',
          },
          {
            label: '可直接使用',
            value: stats.ready,
            icon: CheckCircle2,
            color: 'from-success-500 to-success-600',
            text: 'text-success-700',
            delay: 'stagger-2',
          },
          {
            label: '需安全员复核',
            value: stats.review,
            icon: AlertTriangle,
            color: 'from-warning-500 to-warning-600',
            text: 'text-warning-700',
            delay: 'stagger-3',
            pulse: stats.review > 0,
          },
          {
            label: '无效/坏数据',
            value: stats.invalid,
            icon: XCircle,
            color: 'from-danger-500 to-danger-600',
            text: 'text-danger-700',
            delay: 'stagger-4',
          },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={cn(
                'card p-5 opacity-0 animate-fade-in-up relative overflow-hidden',
                card.delay,
              )}
              style={{ animationFillMode: 'forwards' }}
            >
              <div className={cn('absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-10 rounded-bl-full -mr-8 -mt-8', card.color)} />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <p className="text-xs text-zinc-500 font-medium">{card.label}</p>
                  <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-soft', card.color)}>
                    <Icon className={cn('w-4.5 h-4.5', card.pulse && 'animate-pulse')} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className={cn('font-serif text-3xl font-semibold tabular-nums', card.text)}>{card.value}</span>
                  <span className="text-xs text-zinc-400">条</span>
                </div>
                {stats.total > 0 && card.label !== '全部记录' && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-zinc-500">
                    <TrendingUp className="w-3 h-3" />
                    占比 {((card.value / stats.total) * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="搜索批号、样品名、操作人员..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input pl-9"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-lab-50 rounded-lg p-1">
            {(['all', 'ready', 'needs_review', 'invalid'] as const).map(s => {
              const active = filterStatus === s;
              const labels: Record<RecordStatus | 'all', string> = {
                all: '全部',
                ready: '可使用',
                needs_review: '待复核',
                invalid: '无效',
              };
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    active ? 'bg-white text-lab-700 shadow-soft' : 'text-zinc-500 hover:text-lab-600',
                  )}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Filter className="w-10 h-10" />}
          title="暂无符合条件的记录"
          description={searchQuery ? '试试调整搜索关键词' : '点击右上角「新建记录」导入你的第一份色谱数据'}
          action={!searchQuery ? { label: '新建记录', to: '/records/new' } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r, i) => (
            <RecordCard key={r.id} record={r} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
