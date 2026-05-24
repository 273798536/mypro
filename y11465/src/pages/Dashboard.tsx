import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Layers, Clock, Snowflake, CheckCircle, AlertTriangle, RefreshCw, User, FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { batchStats, taskStats, fetchBatchStats, fetchTaskStats } = useAppStore();

  useEffect(() => {
    fetchBatchStats();
    fetchTaskStats();
  }, [fetchBatchStats, fetchTaskStats]);

  const statCards = [
    { label: '总批次', value: batchStats.total, icon: Layers, color: 'bg-blue-500' },
    { label: '待复核', value: batchStats.pendingReview, icon: Clock, color: 'bg-amber-500' },
    { label: '已冻结', value: batchStats.frozen, icon: Snowflake, color: 'bg-cyan-500' },
    { label: '已结算', value: batchStats.settled, icon: CheckCircle, color: 'bg-green-500' },
  ];

  const taskCards = [
    { label: '等待重试', value: taskStats.waitingRetry, icon: RefreshCw, color: 'bg-yellow-500' },
    { label: '等待人工', value: taskStats.waitingManual, icon: User, color: 'bg-orange-500' },
    { label: '永久失败', value: taskStats.failed, icon: AlertTriangle, color: 'bg-red-500' },
    { label: '成功完成', value: taskStats.success, icon: CheckCircle, color: 'bg-emerald-500' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">仪表盘</h1>
          <p className="text-slate-500 mt-1">服装打版样衣异常回执状态概览</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/batches/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-md"
          >
            <Plus size={18} />
            创建批次
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className={`${card.color} h-2`} />
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 text-sm">{card.label}</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{card.value}</p>
                  </div>
                  <div className={`${card.color} p-3 rounded-lg opacity-10`}>
                    <Icon size={24} className={card.color.replace('bg-', 'text-')} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="text-lg font-semibold text-slate-700 mb-4">异步任务状态</h2>
      <div className="grid grid-cols-4 gap-5 mb-6">
        {taskCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`${card.color} bg-opacity-10 rounded-lg p-5 border-l-4`} style={{ borderLeftColor: 'currentColor' }}>
              <div className="flex items-center gap-3">
                <div className={`${card.color} p-2 rounded`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-5">
          <h3 className="font-semibold text-slate-700 mb-4">快捷操作</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/batches" className="flex items-center gap-2 p-3 bg-slate-50 rounded hover:bg-slate-100 transition-colors">
              <Layers size={18} className="text-blue-500" />
              <span className="text-sm text-slate-700">批次管理</span>
            </Link>
            <Link to="/documents" className="flex items-center gap-2 p-3 bg-slate-50 rounded hover:bg-slate-100 transition-colors">
              <FileText size={18} className="text-green-500" />
              <span className="text-sm text-slate-700">单据管理</span>
            </Link>
            <Link to="/review" className="flex items-center gap-2 p-3 bg-slate-50 rounded hover:bg-slate-100 transition-colors">
              <CheckCircle size={18} className="text-amber-500" />
              <span className="text-sm text-slate-700">复核改判</span>
            </Link>
            <Link to="/reports" className="flex items-center gap-2 p-3 bg-slate-50 rounded hover:bg-slate-100 transition-colors">
              <FileText size={18} className="text-purple-500" />
              <span className="text-sm text-slate-700">报告中心</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5">
          <h3 className="font-semibold text-slate-700 mb-4">演示流程</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
              <div>
                <p className="text-sm font-medium text-slate-700">初始化数据库</p>
                <p className="text-xs text-slate-500">npm run db:init</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
              <div>
                <p className="text-sm font-medium text-slate-700">导入示例数据</p>
                <p className="text-xs text-slate-500">npm run db:seed</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
              <div>
                <p className="text-sm font-medium text-slate-700">查看完整演示</p>
                <p className="text-xs text-slate-500">点击左侧「演示流程」菜单</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
