
import { useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { LucideIcon } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Skull,
  RefreshCw
} from 'lucide-react';

export function Dashboard() {
  const { stats, retryCategories, fetchStats, fetchRetryCategories, resumeProcessing, loading } = useTaskStore();

  useEffect(() => {
    fetchStats();
    fetchRetryCategories();
    const interval = setInterval(() => {
      fetchStats();
      fetchRetryCategories();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchRetryCategories]);

  const handleResume = async () => {
    if (confirm('确定要恢复处理所有待处理任务吗？')) {
      await resumeProcessing();
    }
  };

  const chartData = stats ? [
    { name: '排队中', value: stats.pending, color: '#6b7280' },
    { name: '处理中', value: stats.processing, color: '#3b82f6' },
    { name: '等重试', value: stats.waitingRetry, color: '#f59e0b' },
    { name: '等人工', value: stats.waitingManual, color: '#f97316' },
    { name: '永久失败', value: stats.permanentFailed, color: '#ef4444' },
    { name: '成功', value: stats.success, color: '#10b981' },
    { name: '已关闭', value: stats.closed, color: '#64748b' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-800">财务概览</h3>
          <p className="text-sm text-slate-500">可重试分类、死信处理、恢复后续跑</p>
        </div>
        <button
          onClick={handleResume}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          恢复后续跑
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="任务总数"
          value={stats?.total || 0}
          color="text-slate-600"
          bgColor="bg-slate-50"
        />
        <StatCard
          icon={RotateCcw}
          label="待重试"
          value={stats?.waitingRetry || 0}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard
          icon={Clock}
          label="等人工"
          value={stats?.waitingManual || 0}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
        <StatCard
          icon={Skull}
          label="死信数量"
          value={stats?.permanentFailed || 0}
          color="text-red-600"
          bgColor="bg-red-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="text-sm font-medium text-slate-600 mb-4">状态分布</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="text-sm font-medium text-slate-600 mb-4">可重试分类</h4>
          <div className="space-y-4">
            {retryCategories.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">暂无待重试任务</p>
            ) : (
              retryCategories.map((cat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 text-sm font-medium">
                        {cat.category.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {cat.category === 'recharge' ? '充值流水' : 
                         cat.category === 'refund' ? '退款申请' :
                         cat.category === 'store_transfer' ? '门店交接表' : '供应商对账单'}
                      </p>
                      <p className="text-xs text-slate-500">{cat.status}</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-slate-800">{cat.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-green-600" size={24} />
            <div>
              <p className="text-sm text-green-600">补偿成功</p>
              <p className="text-2xl font-bold text-green-700">{stats?.success || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-600" size={24} />
            <div>
              <p className="text-sm text-amber-600">需要人工处理</p>
              <p className="text-2xl font-bold text-amber-700">{(stats?.waitingManual || 0) + (stats?.permanentFailed || 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-slate-600" size={24} />
            <div>
              <p className="text-sm text-slate-600">已关闭</p>
              <p className="text-2xl font-bold text-slate-700">{stats?.closed || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bgColor }: {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center mb-4`}>
        <Icon className={color} size={20} />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}
