import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import FilterBar from '../components/FilterBar';
import StatusBadge from '../components/StatusBadge';
import { filmProjects } from '../data/mockData';

const COLORS = ['#1e3a5f', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];

export default function Dashboard() {
  const {
    getTotalExpense,
    getCollectedExpense,
    getPendingExpense,
    getAnomalyCount,
    getFilteredBills,
    getProjectById,
  } = useStore();

  const filteredBills = getFilteredBills();

  const statCards = [
    {
      label: '总费用',
      value: getTotalExpense(),
      icon: Wallet,
      color: 'from-slate-700 to-slate-900',
      trend: '+12.5%',
    },
    {
      label: '已归集',
      value: getCollectedExpense(),
      icon: CheckCircle2,
      color: 'from-emerald-600 to-emerald-800',
      trend: '+8.2%',
    },
    {
      label: '待归集',
      value: getPendingExpense(),
      icon: Clock,
      color: 'from-amber-500 to-amber-700',
      trend: '-3.1%',
    },
    {
      label: '异常记录',
      value: getAnomalyCount(),
      icon: AlertTriangle,
      color: 'from-rose-500 to-rose-700',
      isCount: true,
      trend: '2待处理',
    },
  ];

  const barChartData = useMemo(() => {
    const projectMap = new Map<string, { name: string; amount: number }>();
    
    filteredBills.forEach((bill) => {
      const project = getProjectById(bill.projectId);
      if (project) {
        const existing = projectMap.get(bill.projectId);
        if (existing) {
          existing.amount += bill.amount;
        } else {
          projectMap.set(bill.projectId, { name: project.name, amount: bill.amount });
        }
      }
    });

    return Array.from(projectMap.values());
  }, [filteredBills, getProjectById]);

  const pieChartData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    filteredBills.forEach((bill) => {
      const existing = categoryMap.get(bill.expenseCategory) || 0;
      categoryMap.set(bill.expenseCategory, existing + bill.amount);
    });

    return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredBills]);

  const anomalyBills = useMemo(
    () => filteredBills.filter((b) => b.isCategoryMismatch || b.hasMissingFields),
    [filteredBills]
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">归集仪表盘</h1>
        <p className="text-slate-500 mt-1">实时监控宣发费用归集状态</p>
      </div>

      <FilterBar />

      <div className="grid grid-cols-4 gap-6 mb-6">
        {statCards.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-gradient-to-br text-white rounded-2xl p-5 shadow-lg transform hover:scale-[1.02] transition-transform duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 -m-5`}>
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="w-8 h-8 opacity-80" />
                <div className="flex items-center gap-1 text-sm opacity-80">
                  <TrendingUp className="w-4 h-4" />
                  {stat.trend}
                </div>
              </div>
              <p className="text-sm opacity-80 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold">
                {stat.isCount ? stat.value : `¥${(stat.value / 10000).toFixed(0)}万`}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">按影片费用分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis
                tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                tick={{ fontSize: 12 }}
                stroke="#64748b"
              />
              <Tooltip
                formatter={(value: number) => [`¥${value.toLocaleString()}`, '金额']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="amount" fill="#1e3a5f" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">科目占比</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {pieChartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`¥${value.toLocaleString()}`, '金额']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {pieChartData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-slate-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">异常告警</h3>
          <span className="text-sm text-slate-500">共 {anomalyBills.length} 条异常记录</span>
        </div>
        
        {anomalyBills.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无异常记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {anomalyBills.map((bill) => {
              const project = filmProjects.find((p) => p.id === bill.projectId);
              return (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{bill.supplierName}</p>
                      <p className="text-sm text-slate-500">
                        {project?.name} · ¥{bill.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={bill.status} />
                    <span className="text-sm text-slate-500">{bill.billDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
