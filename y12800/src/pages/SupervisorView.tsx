import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import type { Sample, SampleStatus, SupervisorOverview } from '../../shared/types';
import { SAMPLE_STATUS_LABELS } from '../../shared/types';

interface SupervisorSample extends Sample {}

export default function SupervisorView() {
  const [overview, setOverview] = useState<SupervisorOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<SampleStatus | ''>('');
  const [samples, setSamples] = useState<SupervisorSample[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/qc/supervisor/overview');
        const json = await res.json();
        if (json.success) setOverview(json.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setSamplesLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterStatus) params.set('status', filterStatus);
        params.set('pageSize', '100');
        const qs = params.toString();
        const res = await fetch(`/api/qc/samples?${qs}`);
        const json = await res.json();
        if (json.success) setSamples(json.data.list);
      } finally {
        setSamplesLoading(false);
      }
    })();
  }, [filterStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-qc-teal" />
      </div>
    );
  }

  if (!overview) return null;

  const pct = (n: number) => overview.total ? Math.round((n / overview.total) * 100) : 0;

  const statCards = [
    {
      label: '直接可用',
      count: overview.completed,
      pct: pct(overview.completed),
      icon: CheckCircle2,
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      barColor: 'bg-emerald-500',
      status: 'completed' as SampleStatus,
    },
    {
      label: '需复核',
      count: overview.reviewNeeded + overview.pendingReview,
      pct: pct(overview.reviewNeeded + overview.pendingReview),
      icon: AlertTriangle,
      color: 'amber',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      barColor: 'bg-amber-500',
      status: 'review_needed' as SampleStatus,
    },
    {
      label: '不可用',
      count: overview.rejected,
      pct: pct(overview.rejected),
      icon: XCircle,
      color: 'rose',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
      barColor: 'bg-rose-500',
      status: 'rejected' as SampleStatus,
    },
  ];

  const problemSamples = samples.filter(
    (s) => s.status === 'rejected' || s.status === 'review_needed'
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-800">导师视图</h2>
        <p className="text-xs text-slate-400 mt-0.5">一眼分清：直接可用 · 需复核 · 不可用</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={() => setFilterStatus(filterStatus === card.status ? '' : card.status)}
            className={`card p-5 text-left transition-all hover:shadow-md ${
              filterStatus === card.status ? 'ring-2 ring-qc-teal ring-offset-1' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <card.icon size={20} className={card.textColor} />
              </div>
              <span className={`text-3xl font-bold ${card.textColor}`}>{card.count}</span>
            </div>
            <p className="text-sm font-medium text-slate-700 mb-2">{card.label}</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className={`${card.barColor} h-1.5 rounded-full transition-all`}
                style={{ width: `${card.pct}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{card.pct}% 占比</p>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            {filterStatus ? `${SAMPLE_STATUS_LABELS[filterStatus]}记录` : '全部记录'}
            <span className="text-slate-400 font-normal ml-1">({samples.length})</span>
          </h3>
          <div className="flex items-center gap-2">
            {filterStatus && (
              <button
                onClick={() => setFilterStatus('')}
                className="btn-secondary btn-sm flex items-center gap-1"
              >
                <RotateCcw size={12} />
                清除筛选
              </button>
            )}
          </div>
        </div>

        {samplesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-qc-teal" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-2.5">条码</th>
                  <th className="px-4 py-2.5">行号</th>
                  <th className="px-4 py-2.5">图片名</th>
                  <th className="px-4 py-2.5">来源备注</th>
                  <th className="px-4 py-2.5">状态</th>
                  <th className="px-4 py-2.5">结论/备注</th>
                  <th className="px-4 py-2.5">操作</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s) => (
                  <tr key={s.id} className={`table-row ${s.isDuplicate ? 'duplicate-row' : ''}`}>
                    <td className="px-4 py-2.5 text-sm font-mono">
                      <div className="flex items-center gap-1.5">
                        {s.isDuplicate && <AlertTriangle size={12} className="text-qc-amber" />}
                        {s.barcode}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{s.originalRowNumber}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[120px] truncate">
                      {s.imageFileName || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[150px] truncate">
                      {s.sourceRemark || '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`badge ${
                          s.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : s.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : s.status === 'review_needed'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {SAMPLE_STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[200px]">
                      {s.qcConclusion && <p>{s.qcConclusion}</p>}
                      {s.reviewNote && (
                        <p className="text-rose-600 mt-0.5">⚠ {s.reviewNote}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/annotation/${s.id}`}
                        className="text-xs text-qc-teal hover:underline flex items-center gap-0.5"
                      >
                        详情 <ArrowUpRight size={10} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {problemSamples.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <XCircle size={16} className="text-rose-500" />
            需关注的问题记录
          </h3>
          <div className="space-y-2">
            {problemSamples.map((s) => (
              <div
                key={s.id}
                className={`flex items-start gap-3 p-3 rounded-md border ${
                  s.status === 'rejected'
                    ? 'bg-rose-50/50 border-rose-200'
                    : 'bg-orange-50/50 border-orange-200'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    s.status === 'rejected' ? 'bg-rose-100' : 'bg-orange-100'
                  }`}
                >
                  {s.status === 'rejected' ? (
                    <XCircle size={14} className="text-rose-600" />
                  ) : (
                    <AlertTriangle size={14} className="text-orange-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{s.barcode}</span>
                    <span
                      className={`badge text-[10px] ${
                        s.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700 border-rose-200'
                          : 'bg-orange-100 text-orange-700 border-orange-200'
                      }`}
                    >
                      {SAMPLE_STATUS_LABELS[s.status]}
                    </span>
                    {s.isDuplicate && (
                      <span className="badge text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                        条码重复
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    行号: {s.originalRowNumber}
                    {s.imageFileName && <span className="ml-2">图片: {s.imageFileName}</span>}
                    {s.sourceRemark && <span className="ml-2">备注: {s.sourceRemark}</span>}
                  </p>
                  {s.reviewNote && (
                    <p className="text-xs text-rose-600 mt-0.5">原因: {s.reviewNote}</p>
                  )}
                </div>
                <Link
                  to={`/annotation/${s.id}`}
                  className="text-xs text-qc-teal hover:underline shrink-0"
                >
                  追溯 <ArrowUpRight size={10} className="inline" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
