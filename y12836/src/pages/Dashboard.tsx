import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Upload,
  FileDown,
  Zap,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import StatusBadge from '@/components/ui/StatusBadge';

export default function Dashboard() {
  const navigate = useNavigate();
  const samples = useAppStore((state) => state.samples);
  const anomalies = useAppStore((state) => state.anomalies);
  const lineageEvents = useAppStore((state) => state.lineageEvents);
  const getSampleById = useAppStore((state) => state.getSampleById);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedToday = samples.filter(
      (s) =>
        (s.status === 'confirmed' || s.status === 'exported') &&
        new Date(s.updatedAt) >= today
    ).length;

    const pendingEstimation = samples.filter(
      (s) => s.status === 'pending' || s.status === 'estimating'
    ).length;

    const activeAnomalies = anomalies.filter((a) => a.status !== 'resolved').length;

    return {
      totalSamples: samples.length,
      pendingEstimation,
      anomalies: activeAnomalies,
      completedToday,
    };
  }, [samples, anomalies]);

  const recentActivity = useMemo(
    () => lineageEvents.slice(0, 8),
    [lineageEvents]
  );

  const statCards = [
    {
      label: '样本总数',
      value: stats.totalSamples,
      icon: FlaskConical,
      color: 'text-brand-600',
      bgColor: 'bg-brand-50',
      trend: '+12 本周',
      trendUp: true,
    },
    {
      label: '待处理估算',
      value: stats.pendingEstimation,
      icon: Activity,
      color: 'text-accent-600',
      bgColor: 'bg-accent-50',
      trend: '3 件进行中',
      trendUp: true,
    },
    {
      label: '异常记录',
      value: stats.anomalies,
      icon: AlertTriangle,
      color: 'text-warning-600',
      bgColor: 'bg-warning-50',
      trend: '需处理',
      trendUp: false,
    },
    {
      label: '今日完成',
      value: stats.completedToday,
      icon: CheckCircle2,
      color: 'text-accent-700',
      bgColor: 'bg-accent-50',
      trend: '达标',
      trendUp: true,
    },
  ];

  const quickActions = [
    {
      label: '新建样本',
      icon: Plus,
      onClick: () => navigate('/samples?action=new'),
      color: 'from-brand-500 to-brand-700',
    },
    {
      label: '批量导入',
      icon: Upload,
      onClick: () => navigate('/samples?action=import'),
      color: 'from-accent-500 to-accent-700',
    },
    {
      label: '启动估算',
      icon: Zap,
      onClick: () => navigate('/estimation'),
      color: 'from-warning-500 to-warning-700',
    },
    {
      label: '导出报告',
      icon: FileDown,
      onClick: () => navigate('/samples'),
      color: 'from-slate-500 to-slate-700',
    },
  ];

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'estimated':
      case 're_estimated':
        return <Activity className="w-4 h-4 text-brand-500" />;
      case 'corrected':
        return <CheckCircle2 className="w-4 h-4 text-accent-500" />;
      case 'anomaly_detected':
        return <AlertTriangle className="w-4 h-4 text-warning-500" />;
      case 'exported':
        return <FileDown className="w-4 h-4 text-slate-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">工作台</h1>
          <p className="text-sm text-slate-500 mt-1">
            欢迎回来，李检验师。今天是{new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/anomalies')}
            className="btn-secondary"
          >
            <AlertTriangle className="w-4 h-4 mr-2 text-warning-500" />
            异常处理
            {stats.anomalies > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-warning-100 text-warning-700 rounded-full">
                {stats.anomalies}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="card p-5 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <span className={`text-xs font-medium ${card.trendUp ? 'text-accent-600' : 'text-warning-600'}`}>
                  {card.trend}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-serif font-bold text-slate-900 stat-number">
                  {card.value}
                </p>
                <p className="text-sm text-slate-500 mt-1">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">快捷操作</h2>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    className="group relative overflow-hidden rounded-lg p-4 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-md`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-sm font-medium text-slate-800">{action.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">最近活动</h2>
              <button
                onClick={() => navigate('/lineage')}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center"
              >
                查看全部
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
            <div className="space-y-3">
              {recentActivity.map((event, index) => {
                const sample = getSampleById(event.sampleId);
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-2 -mx-2 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                    style={{ animationDelay: `${index * 30}ms` }}
                    onClick={() => navigate(`/lineage/${event.sampleId}`)}
                  >
                    <div className="mt-0.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                        {getEventIcon(event.eventType)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">
                          {sample?.barcode || '未知样本'}
                        </span>
                        {sample && <StatusBadge status={sample.status} />}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">
                        {event.description}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                      {formatDistanceToNow(new Date(event.timestamp), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">待处理提醒</h2>
              <span className="badge badge-warning">
                {stats.pendingEstimation + stats.anomalies} 项
              </span>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-brand-50 border border-brand-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-600" />
                  <span className="text-sm font-medium text-brand-800">
                    {samples.filter(s => s.status === 'estimating').length} 个样本估算中
                  </span>
                </div>
                <p className="text-xs text-brand-600 mt-1">
                  预计还需约 2 分钟完成
                </p>
              </div>

              <div className="p-3 rounded-lg bg-warning-50 border border-warning-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning-600" />
                  <span className="text-sm font-medium text-warning-800">
                    {stats.anomalies} 条异常记录待处理
                  </span>
                </div>
                <p className="text-xs text-warning-600 mt-1">
                  含 {samples.filter(s => s.hasAnomaly).length} 例条码重复
                </p>
                <button
                  onClick={() => navigate('/anomalies')}
                  className="mt-2 text-xs font-medium text-warning-700 hover:text-warning-800 flex items-center"
                >
                  立即处理
                  <ChevronRight className="w-3 h-3 ml-0.5" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-accent-50 border border-accent-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent-600" />
                  <span className="text-sm font-medium text-accent-800">
                    {samples.filter(s => s.status === 'estimated').length} 个样本待人工复核
                  </span>
                </div>
                <p className="text-xs text-accent-600 mt-1">
                  请在今日下班前完成审核
                </p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">分组概览</h2>
            <div className="space-y-3">
              {useAppStore.getState().groups.map((group) => (
                <div key={group.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{group.name}</span>
                    <span className="font-medium text-slate-900">{group.sampleCount} 例</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(group.sampleCount || 0) * 2.5}%`,
                        backgroundColor: group.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
