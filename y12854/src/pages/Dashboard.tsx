import { useEffect } from 'react';
import { Clock, AlertTriangle, Radio, Wind, Waves, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store';

function StatCard({
  icon: Icon,
  label,
  count,
  sub,
  borderColor,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  sub?: string;
  borderColor: string;
}) {
  return (
    <div
      className={`bg-slate-900 rounded-lg border-l-4 ${borderColor} p-4 animate-card-in flex items-start gap-3`}
    >
      <div className="p-2 rounded-md bg-slate-800 mt-0.5">
        <Icon className="w-5 h-5 text-slate-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{count}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ForecastCards({
  forecasts,
}: {
  forecasts: { stationName: string; windSpeed: number; waveHeight: number; forecastTime: string }[];
}) {
  if (!forecasts.length) return null;
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
        <Wind className="w-4 h-4" /> 气象预报概览
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {forecasts.map((f, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-52 bg-slate-900 rounded-lg p-3 border border-slate-800"
          >
            <p className="text-sm font-medium text-white mb-2">{f.stationName}</p>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Wind className="w-3 h-3" /> {Number(f.windSpeed).toFixed(1)} m/s
              </span>
              <span className="flex items-center gap-1">
                <Waves className="w-3 h-3" /> {Number(f.waveHeight).toFixed(1)} m
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {new Date(f.forecastTime).toLocaleDateString('zh-CN')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditTimeline({ logs }: { logs: { id: string; action: string; detail: string; timestamp: string }[] }) {
  if (!logs.length) return null;
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
        <Clock className="w-4 h-4" /> 最近审计日志
      </h2>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 items-start bg-slate-900/50 rounded p-2.5">
            <ArrowRight className="w-3 h-3 text-warning-amber mt-1 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-300">
                <span className="font-medium text-white">{log.action}</span> — {log.detail}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">{new Date(log.timestamp).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { dashboard, fetchDashboard, loading } = useAppStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading.dashboard && !dashboard) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        加载中...
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        暂无数据
      </div>
    );
  }

  const { pendingCount, anomalyCountByType, buoyLateCount, recentAuditLogs, weatherForecastSummary } = dashboard;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">工作台</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Clock}
          label="待复核样本"
          count={pendingCount}
          borderColor="border-l-warning-amber"
        />
        <StatCard
          icon={AlertTriangle}
          label="异常样本"
          count={(anomalyCountByType?.supplement ?? 0) + (anomalyCountByType?.recalibrate ?? 0)}
          sub={`需补材料 ${anomalyCountByType?.supplement ?? 0} / 需改口径 ${anomalyCountByType?.recalibrate ?? 0}`}
          borderColor="border-l-red-500"
        />
        <StatCard
          icon={Radio}
          label="浮标晚到"
          count={buoyLateCount}
          borderColor="border-l-amber-400"
        />
      </div>
      <ForecastCards forecasts={weatherForecastSummary ?? []} />
      <AuditTimeline logs={recentAuditLogs ?? []} />
    </div>
  );
}
