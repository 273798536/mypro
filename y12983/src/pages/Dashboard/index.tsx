import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Plus,
  Table,
  Shield,
  FlaskConical,
  ListTodo,
} from 'lucide-react';
import { useGapStore } from '@/stores/gapStore';
import { useHistoryStore } from '@/stores/historyStore';
import StatCard from '@/components/Card/StatCard';
import Card from '@/components/Card/Card';
import Timeline from '@/components/Timeline/Timeline';
import StatusBadge from '@/components/Status/StatusBadge';
import Button from '@/components/Button/Button';

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, fetchStats, gaps, fetchGaps } = useGapStore();
  const { recentHistory, fetchRecent } = useHistoryStore();

  useEffect(() => {
    fetchStats();
    fetchGaps({ page: 1, pageSize: 5 });
    fetchRecent(10);
  }, [fetchStats, fetchGaps, fetchRecent]);

  const quickActions = [
    {
      label: '新建报告',
      icon: Plus,
      path: '/gaps',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: '查看快照',
      icon: Table,
      path: '/snapshots',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
    },
    {
      label: '权限审计',
      icon: Shield,
      path: '/audit',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: '测试路径',
      icon: FlaskConical,
      path: '/test',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">工作台</h1>
          <p className="text-sm text-slate-400 mt-1">
            时序库采样缺口报告管理控制台
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => navigate('/gaps')}>
          新建缺口报告
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="缺口总数"
          value={stats.total}
          icon={<ListTodo size={24} />}
          trend={`本月新增 ${stats.thisMonthNew} 条`}
          trendUp
          color="blue"
        />
        <StatCard
          title="待处理"
          value={stats.pending}
          icon={<Clock size={24} />}
          trend="需要及时跟进"
          color="amber"
        />
        <StatCard
          title="已修正"
          value={stats.fixed}
          icon={<CheckCircle2 size={24} />}
          trend="已闭环处理"
          trendUp
          color="emerald"
        />
        <StatCard
          title="严重问题"
          value={stats.critical}
          icon={<AlertTriangle size={24} />}
          trend="需优先处理"
          color="red"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className={`flex items-center gap-3 p-4 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-700 transition-all duration-200 group`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}
            >
              <action.icon size={20} />
            </div>
            <span className="text-sm font-medium text-slate-200">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="最近缺口报告"
            subtitle="最新 5 条记录"
            action={
              <button
                onClick={() => navigate('/gaps')}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                查看全部 →
              </button>
            }
          >
            <div className="space-y-2">
              {gaps.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  暂无缺口报告
                </div>
              ) : (
                gaps.map((gap) => (
                  <div
                    key={gap.id}
                    onClick={() => navigate(`/gaps/${gap.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={gap.status} size="sm" />
                        <span className="text-sm font-medium text-slate-200 truncate group-hover:text-blue-400 transition-colors">
                          {gap.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{gap.tableName}</span>
                        <span>•</span>
                        <span>{gap.businessLine}</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0 ml-4">
                      {new Date(gap.discoveredAt).toLocaleDateString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card
            title="最近活动"
            subtitle="操作记录时间线"
          >
            <Timeline logs={recentHistory} compact />
          </Card>
        </div>
      </div>

      <Card title="日常使用提示" subtitle="工作流建议">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-2 text-emerald-400 font-medium mb-2">
              <Shield size={16} />
              日常入口
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              平时通过「权限审计」入口进入，整理表结构快照，月底或课前回看迁移状态。
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-2 text-amber-400 font-medium mb-2">
              <AlertTriangle size={16} />
              问题处理
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              遇到迁移重复执行类记录时，使用修正功能，系统会自动检测重复，避免同一件事出现两份结论。
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-2 text-blue-400 font-medium mb-2">
              <TrendingUp size={16} />
              测试验证
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              测试路径内置重复导入场景，验证防重逻辑是否正确，避免工具越跑越乱。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
