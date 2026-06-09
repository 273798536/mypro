import { useMemo } from 'react';
import { BarChart3, AlertOctagon, TrendingUp, CheckCircle2, Clock, AlertTriangle, History, ChevronRight } from 'lucide-react';
import { useCondProbStore } from '@/store/useCondProbStore';
import { formatPercent } from '@/utils';
import { DataStatusBadge } from '@/components/StatusBadge';
import SampleBanner from '@/components/SampleBanner';
import { useNavigate } from 'react-router-dom';

export default function ErrorAnalysis() {
  const { params, changelogs, setExpandedParamId } = useCondProbStore();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = params.length;
    const available = params.filter((p) => p.status === 'available').length;
    const pending = params.filter((p) => p.status === 'pending').length;
    const recollect = params.filter((p) => p.status === 'recollect').length;
    const boundary = params.filter((p) => p.isBoundary);
    const approved = params.filter((p) => p.reviewStatus === 'approved').length;
    const avgProb =
      total === 0 ? 0 : params.reduce((s, p) => s + p.probability, 0) / total;
    const lowConfidence = params.filter((p) => p.conditionCount < 50);
    return { total, available, pending, recollect, boundary, approved, avgProb, lowConfidence };
  }, [params]);

  const maxCount = Math.max(1, stats.available, stats.pending, stats.recollect);

  const boundaryParams = params.filter((p) => p.isBoundary);

  const recentLogs = changelogs.slice(0, 10);

  const jumpToParam = (paramId: string) => {
    setExpandedParamId(paramId);
    navigate('/');
  };

  const Card = ({
    icon: Icon,
    label,
    value,
    hint,
    accent,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: React.ReactNode;
    hint: string;
    accent: string;
  }) => (
    <div className="bg-white rounded-xl border border-ink-100 p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-ink-500 uppercase tracking-wider">{label}</p>
          <p className={`mt-2 font-serif text-3xl font-bold ${accent}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent.replace('text-', 'bg-').replace('700', '50').replace('800', '50')} bg-opacity-20`}>
          <Icon className={`w-5 h-5 ${accent}`} />
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-400">{hint}</p>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <SampleBanner />

      <div className="mb-6">
        <h2 className="font-serif text-2xl font-semibold text-ink-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-violet-600" />
          误差分析 · 月底 / 课前查看
        </h2>
        <p className="text-sm text-ink-500 mt-1">
          整体数据质量、状态分布、边界样例与最近变更。给老师或工程师讲解前，先在这里确认结论能否说清楚。
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <Card icon={TrendingUp} label="参数总数" value={stats.total} hint="全部录入的条件概率条目" accent="text-ink-800" />
        <Card icon={CheckCircle2} label="可用数据" value={stats.available} hint="审核通过、可直接使用" accent="text-emerald-700" />
        <Card icon={Clock} label="暂缓中" value={stats.pending} hint="待复核或样本量一般" accent="text-amber-700" />
        <Card icon={AlertTriangle} label="需重采" value={stats.recollect} hint="数据质量存疑，暂不可用" accent="text-rose-700" />
        <Card icon={AlertOctagon} label="边界样例" value={stats.boundary.length} hint="极端概率或异常数据" accent="text-amber-800" />
        <Card icon={BarChart3} label="平均概率" value={formatPercent(stats.avgProb)} hint={`低置信度 ${stats.lowConfidence.length} 条（样本<50）`} accent="text-violet-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-ink-100 shadow-card p-5">
          <h3 className="font-serif text-lg font-semibold text-ink-800 mb-4">状态分布</h3>
          <div className="space-y-3">
            {[
              { key: 'available', label: '可用', count: stats.available, color: 'bg-emerald-500', text: 'text-emerald-700' },
              { key: 'pending', label: '暂缓', count: stats.pending, color: 'bg-amber-500', text: 'text-amber-700' },
              { key: 'recollect', label: '需重新采集', count: stats.recollect, color: 'bg-rose-500', text: 'text-rose-700' },
            ].map((row) => {
              const pct = stats.total === 0 ? 0 : (row.count / stats.total) * 100;
              return (
                <div key={row.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`font-medium ${row.text}`}>{row.label}</span>
                    <span className="font-mono text-ink-600">
                      {row.count} <span className="text-ink-400">· {pct.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden">
                    <div
                      className={`h-full ${row.color} transition-all`}
                      style={{ width: `${(row.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-ink-100">
            <h4 className="font-serif text-base font-semibold text-ink-800 mb-3 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-amber-600" />
              边界样例回看 · 共 {boundaryParams.length} 条
            </h4>
            {boundaryParams.length === 0 ? (
              <p className="text-sm text-ink-400 py-4 text-center">暂无边界样例</p>
            ) : (
              <div className="space-y-2">
                {boundaryParams.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => jumpToParam(p.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-l-4 border-l-amber-400 border-amber-100 bg-amber-50/30 hover:bg-amber-50 text-left transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-sm font-semibold text-ink-800 truncate">
                        P({p.outcome} | {p.condition})
                      </p>
                      <p className="text-xs text-ink-500 mt-0.5 truncate">{p.boundaryNote || p.explanation}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-bold text-ink-800">{formatPercent(p.probability)}</div>
                      <div className="mt-1"><DataStatusBadge status={p.status} /></div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-ink-100 shadow-card p-5">
          <h3 className="font-serif text-lg font-semibold text-ink-800 mb-4 flex items-center gap-1.5">
            <History className="w-5 h-5 text-violet-600" />
            最近变更留痕
          </h3>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-ink-400 py-6 text-center">暂无变更记录</p>
          ) : (
            <ul className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {recentLogs.map((log) => {
                const param = params.find((p) => p.id === log.paramId);
                return (
                  <li key={log.id} className="relative pl-4">
                    <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-violet-400 ring-4 ring-violet-50" />
                    <div className="text-xs">
                      <div className="flex items-center gap-2 text-ink-700">
                        <span className="font-medium">{param ? `${param.outcome} | ${param.condition}` : `参数 #${log.paramId.slice(0, 6)}`}</span>
                      </div>
                      <div className="mt-1 text-ink-500">
                        <span className="font-mono text-ink-600">{log.field}</span>
                        <span className="mx-1 text-ink-300">·</span>
                        <span className="line-through text-rose-500/80">{log.oldValue.slice(0, 20)}</span>
                        <span className="mx-1 text-ink-400">→</span>
                        <span className="text-emerald-600">{log.newValue.slice(0, 20)}</span>
                      </div>
                      {log.reason && <div className="mt-0.5 text-ink-400">理由：{log.reason}</div>}
                      <div className="mt-0.5 text-ink-400 font-mono">
                        {new Date(log.timestamp).toLocaleString('zh-CN', { hour12: false })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
