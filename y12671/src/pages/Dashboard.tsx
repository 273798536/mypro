
import { useState } from 'react';
import { useAppStore } from '@/store';
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  Calculator,
  GitCompare,
  History,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Task, DataPoint } from '@/types';

const Dashboard = () => {
  const { tasks, selectTask } = useAppStore();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t: Task) => t.status === 'pending').length,
    checking: tasks.filter((t: Task) => t.status === 'checking').length,
    reviewing: tasks.filter((t: Task) => t.status === 'reviewing').length,
    completed: tasks.filter((t: Task) => t.status === 'completed').length,
    withOutliers: tasks.filter((t: Task) =>
      t.dataPoints.some((dp) => dp.isOutlier)
    ).length,
    withSectionImages: tasks.filter((t: Task) =>
      t.sectionImages.length > 0
    ).length,
  };

  const filteredTasks =
    filterStatus === 'all'
      ? tasks
      : tasks.filter((t: Task) => t.status === filterStatus);

  const getStatusBadge = (status: Task['status']) => {
    const statusConfig: Record<
      string,
      { color: string; label: string; icon: any }
    > = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800',
        label: '待处理',
        icon: Clock,
      },
      checking: {
        color: 'bg-blue-100 text-blue-800',
        label: '校验中',
        icon: Calculator,
      },
      reviewing: {
        color: 'bg-orange-100 text-orange-800',
        label: '待复核',
        icon: AlertTriangle,
      },
      completed: {
        color: 'bg-green-100 text-green-800',
        label: '已完成',
        icon: CheckCircle,
      },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
    sub,
  }: any) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold text-slate-800">
            {value}
          </p>
          {sub && (
            <p className="text-xs text-slate-400 mt-1">
              {sub}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          工业机器人臂展校验仪表盘
        </h1>
        <p className="text-slate-500">
          剖切面越界分析、离群点复核、历史审计一体化工作台
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={ClipboardList}
          label="总任务数"
          value={stats.total}
          color="bg-blue-500"
        />
        <StatCard
          icon={Clock}
          label="待处理"
          value={stats.pending}
          color="bg-yellow-500"
          sub="等待开始校验"
        />
        <StatCard
          icon={Calculator}
          label="校验中"
          value={stats.checking}
          color="bg-indigo-500"
          sub="数据采集中"
        />
        <StatCard
          icon={AlertTriangle}
          label="待复核"
          value={stats.reviewing}
          color="bg-orange-500"
          sub="含离群点/越界"
        />
        <StatCard
          icon={CheckCircle}
          label="已完成"
          value={stats.completed}
          color="bg-green-500"
        />
        <StatCard
          icon={AlertCircle}
          label="含离群点"
          value={stats.withOutliers}
          color="bg-red-500"
          sub="需人工确认"
        />
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-slate-800">
            校验任务列表
          </h2>
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'checking', 'reviewing', 'completed'].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status === 'all'
                    ? '全部'
                    : status === 'pending'
                    ? '待处理'
                    : status === 'checking'
                    ? '校验中'
                    : status === 'reviewing'
                    ? '待复核'
                    : '已完成'}
                </button>
              )
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                  任务名称
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                  机器人型号
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                  状态
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                  标称值
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                  数据点
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                  剖面图
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                  更新时间
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                  快捷操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task: Task) => {
                const outlierCount = task.dataPoints.filter(
                  (dp: DataPoint) => dp.isOutlier
                ).length;
                const hasOutliers = outlierCount > 0;
                const hasImages = task.sectionImages.length > 0;
                const verifiedOutlierCount = task.dataPoints.filter(
                  (dp) => dp.isOutlier && dp.verifiedBy
                ).length;

                return (
                  <tr
                    key={task.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <p className="font-medium text-slate-800">
                        {task.name}
                      </p>
                      {task.batchId && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          批次 {task.batchId}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {task.robotModel}
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(task.status)}
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-mono">
                      {task.nominalValue}±{task.tolerance}mm
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-slate-600 font-mono">
                          {task.dataPoints.length} 点
                        </span>
                        {hasOutliers ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            {outlierCount} 离群
                            {verifiedOutlierCount > 0 && (
                              <span className="text-green-600 ml-1">
                                ({verifiedOutlierCount}已核)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            正常
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {hasImages ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          <ImageIcon className="w-3 h-3" />
                          {task.sectionImages.length} 版
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          截图清单待补
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-500 text-sm">
                      {new Date(task.updatedAt).toLocaleDateString(
                        'zh-CN'
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            selectTask(task.id);
                            navigate('/calculator');
                          }}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          <Calculator className="w-4 h-4" />
                          计算
                        </button>
                        {hasImages && (
                          <button
                            onClick={() => {
                              selectTask(task.id);
                              navigate('/compare');
                            }}
                            className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-medium text-sm ml-2"
                          >
                            <GitCompare className="w-4 h-4" />
                            对比
                          </button>
                        )}
                        <button
                          onClick={() => {
                            selectTask(task.id);
                            navigate('/history');
                          }}
                          className="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-medium text-sm ml-2"
                        >
                          <History className="w-4 h-4" />
                          历史
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-slate-400">
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="text-amber-800 font-semibold flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5" />
          日常操作清单 - 使用提示
        </h3>
        <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
          <li>
            <span className="font-medium">重复运行校验：</span>
            在「计算工具」页面顶部按钮，每次运行会生成操作日志
          </li>
          <li>
            <span className="font-medium">补录：</span>
            截图清单晚到没关系，可先录入数据后补录剖面图和数据点
          </li>
          <li>
            <span className="font-medium">人工确认：</span>
            离群点复核必须填写原因，会完整记录谁、什么时候、为什么
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
