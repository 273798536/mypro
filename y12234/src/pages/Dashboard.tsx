import { Link } from 'react-router-dom';
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Upload,
  Calculator,
  GitBranch,
  TestTube,
  TrendingUp,
  DollarSign,
  Car
} from 'lucide-react';
import { useAppStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const { plates, revenues, problems, bindings, isDataLoaded, loadSampleData } = useAppStore();

  const unresolvedProblems = problems.filter(p => !p.isResolved).length;
  const totalRevenue = revenues.reduce((sum, r) => sum + r.recognizedAmount, 0);
  const totalDeferred = revenues.reduce((sum, r) => sum + r.deferredAmount, 0);

  const revenueByPeriod = revenues.reduce((acc, r) => {
    const existing = acc.find(item => item.period === r.period);
    if (existing) {
      existing.recognized += r.recognizedAmount;
      existing.deferred += r.deferredAmount;
    } else {
      acc.push({
        period: r.period,
        recognized: r.recognizedAmount,
        deferred: r.deferredAmount
      });
    }
    return acc;
  }, [] as { period: string; recognized: number; deferred: number }[]);

  const problemTypeData = problems.reduce((acc, p) => {
    const typeMap: Record<string, string> = {
      binding_failure: '换绑失败',
      cross_month_refund: '跨月退款',
      deduction_mismatch: '抵扣异常',
      data_inconsistency: '数据不一致'
    };
    const label = typeMap[p.problemType] || p.problemType;
    const existing = acc.find(item => item.name === label);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: label, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

  const quickActions = [
    { icon: Upload, label: '导入样例数据', path: '/import', color: 'bg-blue-500', description: '一键加载测试数据' },
    { icon: Calculator, label: '收入递延计算', path: '/calculation', color: 'bg-emerald-500', description: '计算包月收入递延' },
    { icon: GitBranch, label: '查看问题追踪', path: '/tracking', color: 'bg-amber-500', description: '追踪异常事件' },
    { icon: TestTube, label: '换绑场景测试', path: '/bind-test', color: 'bg-purple-500', description: '测试换绑失败路径' }
  ];

  const recentProblems = problems.slice(0, 3);

  return (
    <div className="space-y-6">
      {!isDataLoaded && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="bg-amber-100 p-3 rounded-xl">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">欢迎使用停车运营财务追踪系统</h3>
              <p className="text-amber-700 mb-4">系统检测到您还没有加载数据，建议先导入样例数据体验完整功能。</p>
              <button
                onClick={loadSampleData}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-amber-500/30"
              >
                <Upload className="w-4 h-4" />
                导入样例数据
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">¥{totalRevenue.toLocaleString()}</div>
          <div className="text-sm text-slate-500 mt-1">已确认收入</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">¥{totalDeferred.toLocaleString()}</div>
          <div className="text-sm text-slate-500 mt-1">递延收入</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-xl">
              <Car className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">{plates.length}</div>
          <div className="text-sm text-slate-500 mt-1">车牌档案数</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className={`${unresolvedProblems > 0 ? 'bg-red-100' : 'bg-emerald-100'} p-3 rounded-xl`}>
              <AlertCircle className={`w-6 h-6 ${unresolvedProblems > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
            </div>
          </div>
          <div className={`text-3xl font-bold ${unresolvedProblems > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {unresolvedProblems}
          </div>
          <div className="text-sm text-slate-500 mt-1">待处理问题</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">收入趋势</h3>
          {revenueByPeriod.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByPeriod}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number) => [`¥${value}`, '']}
                />
                <Bar dataKey="recognized" name="已确认收入" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="deferred" name="递延收入" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              暂无数据，请先导入数据
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">问题类型分布</h3>
          {problemTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={problemTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {problemTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              暂无问题数据
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {problemTypeData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-slate-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.path}
              to={action.path}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className={`${action.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-slate-800 mb-1">{action.label}</h4>
              <p className="text-sm text-slate-500 mb-3">{action.description}</p>
              <div className="flex items-center text-sm text-slate-400 group-hover:text-emerald-500 transition-colors">
                立即前往 <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {recentProblems.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">待处理问题</h3>
            <Link to="/tracking" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              查看全部 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentProblems.map((problem) => (
              <div
                key={problem.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    problem.severity === 'critical' ? 'bg-red-100' :
                    problem.severity === 'high' ? 'bg-orange-100' :
                    problem.severity === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    <AlertCircle className={`w-5 h-5 ${
                      problem.severity === 'critical' ? 'text-red-600' :
                      problem.severity === 'high' ? 'text-orange-600' :
                      problem.severity === 'medium' ? 'text-amber-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{problem.description}</p>
                    <p className="text-sm text-slate-500">责任人: {problem.responsibleParty}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  problem.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  problem.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                  problem.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {problem.severity === 'critical' ? '紧急' :
                   problem.severity === 'high' ? '高' :
                   problem.severity === 'medium' ? '中' : '低'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
