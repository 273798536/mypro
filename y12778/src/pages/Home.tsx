import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  FileSpreadsheet,
  Layers,
  FlaskConical,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/ErrorAlert';
import { cn } from '../lib/utils';
import type { Calculation } from '../../shared/types';

export function HomePage() {
  const navigate = useNavigate();
  const { calculations, calculationStats, fetchCalculations, fetchStats } = useAppStore();
  const [showNewModal, setShowNewModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCalculations();
    fetchStats();
  }, [fetchCalculations, fetchStats]);

  const filtered = calculations
    .filter((c) => filter === 'all' ? true : c.status === filter)
    .filter((c) =>
      search
        ? c.reagentBatchNo.toLowerCase().includes(search.toLowerCase()) ||
          c.explanation.summary.includes(search)
        : true
    );

  const statCards = [
    {
      label: '待复核',
      value: calculationStats?.pending ?? 0,
      icon: Clock,
      color: 'bg-status-pending/10 text-status-pending',
      bar: 'bg-status-pending',
    },
    {
      label: '已通过',
      value: calculationStats?.passed ?? 0,
      icon: CheckCircle2,
      color: 'bg-status-passed/10 text-status-passed',
      bar: 'bg-status-passed',
    },
    {
      label: '处理失败',
      value: calculationStats?.error ?? 0,
      icon: AlertTriangle,
      color: 'bg-status-anomaly/10 text-status-anomaly',
      bar: 'bg-status-anomaly',
    },
    {
      label: '全部记录',
      value: calculationStats?.total ?? 0,
      icon: FileSpreadsheet,
      color: 'bg-navy-600/10 text-navy-600',
      bar: 'bg-navy-600',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="animate-slide-up stagger-1">
        <div className="bg-navy-600 rounded shadow-card overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical className="w-5 h-5 text-navy-100" strokeWidth={1.8} />
                <h2 className="text-navy-50 text-xs font-medium uppercase tracking-[0.15em]">
                  异常留痕 · 日常入口
                </h2>
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-white">
                表面张力浓度试算工作台
              </h1>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-navy-700 font-semibold text-sm rounded hover:bg-navy-50 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              新建试算
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-navy-700/30">
            {statCards.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="bg-navy-600 px-6 py-4 animate-slide-up"
                  style={{ animationDelay: `${(idx + 1) * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-navy-200 text-xs font-medium">{s.label}</span>
                    <div className={cn('w-7 h-7 rounded flex items-center justify-center', s.color)}>
                      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-bold text-white leading-none animate-count-up">
                      {s.value}
                    </span>
                  </div>
                  <div className="mt-3 h-1 rounded-full bg-navy-700 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700', s.bar)}
                      style={{ width: `${Math.min(100, (s.value / Math.max(1, calculationStats?.total ?? 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="animate-slide-up stagger-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h3 className="font-serif text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-navy-600" strokeWidth={1.8} />
            试算记录列表
          </h3>
          <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
              <input
                type="text"
                placeholder="搜索批次号..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-60 pl-9 pr-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
              />
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded">
              {[
                { key: 'all', label: '全部' },
                { key: 'pending', label: '待复核' },
                { key: 'passed', label: '通过' },
                { key: 'error', label: '失败' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                    filter === f.key
                      ? 'bg-white text-navy-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {f.label}
                </button>
              ))}
              <div className="w-px h-4 bg-slate-300 mx-1" />
              <Filter className="w-3.5 h-3.5 text-slate-400 mx-1" strokeWidth={1.8} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-1" />
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">批次</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">观测张力</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">试算浓度</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">偏差</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">结果解释（摘要）</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-sm text-slate-400">
                    暂无记录
                  </td>
                </tr>
              ) : (
                filtered.map((c, idx) => (
                  <CalcRow
                    key={c.id}
                    calc={c}
                    idx={idx}
                    onOpen={() => navigate(`/calculation/${c.id}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showNewModal && (
        <NewCalculationModal onClose={() => setShowNewModal(false)} onCreated={(id) => { setShowNewModal(false); navigate(`/calculation/${id}`); }} />
      )}
    </div>
  );
}

function CalcRow({ calc, idx, onOpen }: { calc: Calculation; idx: number; onOpen: () => void }) {
  const accentColor =
    calc.status === 'passed' ? 'bg-status-passed' :
    calc.status === 'error' ? 'bg-status-anomaly' :
    calc.status === 'rejected' ? 'bg-status-rejected' :
    'bg-status-pending';

  const deviationColor =
    Math.abs(calc.deviation) <= 10 ? 'text-status-passed' :
    Math.abs(calc.deviation) <= 20 ? 'text-status-attention' :
    'text-status-anomaly';

  return (
    <tr
      className="hover:bg-slate-50 cursor-pointer transition-colors group animate-slide-up"
      style={{ animationDelay: `${idx * 40}ms` }}
      onClick={onOpen}
    >
      <td className="px-4 py-3">
        <div className={cn('w-1 h-10 rounded-sm', accentColor)} />
      </td>
      <td className="px-4 py-3">
        <div>
          <div className="font-mono text-sm font-semibold text-navy-700">{calc.reagentBatchNo}</div>
          <div className="text-[11px] text-slate-400">{formatDate(calc.createdAt)}</div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-slate-700">{calc.observedTension.toFixed(1)} mN/m</span>
        <span className="text-[11px] text-slate-400 ml-1">@{calc.temperature}℃</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-base font-bold text-slate-800">{calc.calculatedConcentration.toFixed(1)}</span>
        <span className="text-xs text-slate-400 ml-0.5">mg/L</span>
      </td>
      <td className="px-4 py-3">
        <span className={cn('font-mono text-sm font-semibold', deviationColor)}>
          {calc.deviation > 0 ? '+' : ''}{calc.deviation.toFixed(1)}%
        </span>
      </td>
      <td className="px-4 py-3 max-w-sm">
        <p className="text-xs text-slate-600 line-clamp-2 group-hover:text-slate-800">
          {calc.explanation.summary}
        </p>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={calc.status} />
      </td>
      <td className="px-4 py-3 text-right">
        <span className="inline-flex items-center gap-1 text-xs text-navy-600 font-medium group-hover:text-navy-700">
          详情 →
        </span>
      </td>
    </tr>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function NewCalculationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { reagents, fetchReagents, createCalculation } = useAppStore();
  const [reagentId, setReagentId] = useState('');
  const [observedTension, setObservedTension] = useState('');
  const [temperature, setTemperature] = useState('25');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReagents();
  }, [fetchReagents]);

  const handleSubmit = async () => {
    if (!reagentId || !observedTension || !temperature) {
      setError('请填写所有必填项');
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await createCalculation({
      reagentId,
      observedTension: Number(observedTension),
      temperature: Number(temperature),
    });
    setSubmitting(false);
    if (result.success && result.data) {
      onCreated(result.data.id);
    } else if (result.error) {
      setError(result.error.title + '：' + (result.error.actionableSteps[0] ?? ''));
    } else {
      setError('创建失败，请稍后重试');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded shadow-lg w-full max-w-md overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-slate-800">新建表面张力浓度试算</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">试剂批次 *</label>
            <select
              value={reagentId}
              onChange={(e) => setReagentId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 bg-white"
            >
              <option value="">请选择试剂批次...</option>
              {reagents
                .filter((r) => r.status === 'active')
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.batchNo} - {r.name}（标称 {r.nominalConcentration} mg/L）
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">观测表面张力 (mN/m) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={observedTension}
                onChange={(e) => setObservedTension(e.target.value)}
                placeholder="例：52.3"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">测量温度 (℃) *</label>
              <select
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 bg-white font-mono"
              >
                <option value="20">20</option>
                <option value="25">25</option>
                <option value="30">30</option>
                <option value="35">35</option>
                <option value="40">40</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="p-3 bg-status-anomaly/5 border border-status-anomaly/20 rounded text-xs text-status-anomaly">
              {error}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 bg-white rounded hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-navy-600 rounded hover:bg-navy-700 disabled:opacity-60"
          >
            {submitting ? '计算中...' : '开始试算'}
          </button>
        </div>
      </div>
    </div>
  );
}
