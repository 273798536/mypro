import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  Wallet,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Store,
} from 'lucide-react';
import { api } from '@/api/client';
import { DashboardSummary, TrendData, StoreStats, BalanceLedger } from '@/types';
import { formatMoney, formatDateTime, getExceptionWarning } from '@/utils/format';

const COLORS = ['#D4AF37', '#0F2A4A', '#27AE60', '#E74C3C', '#F39C12'];

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [storeStats, setStoreStats] = useState<StoreStats[]>([]);
  const [exceptions, setExceptions] = useState<BalanceLedger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [summaryData, trendData, storeData, exceptionData] = await Promise.all([
        api.dashboard.summary(),
        api.dashboard.trend({ days: 14 }),
        api.dashboard.storeStats(),
        api.dashboard.recentExceptions(),
      ]);
      setSummary(summaryData as DashboardSummary);
      setTrend(trendData as TrendData[]);
      setStoreStats(storeData as StoreStats[]);
      setExceptions(exceptionData as BalanceLedger[]);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: '总储值余额',
      value: summary?.totalBalance || 0,
      icon: Wallet,
      color: 'from-navy-700 to-navy-900',
      subValue: `本金 ${formatMoney(summary?.totalPrincipal || 0)}`,
      subLabel: `赠送金 ${formatMoney(summary?.totalBonus || 0)}`,
    },
    {
      label: '活跃会员卡',
      value: summary?.totalCards || 0,
      icon: CreditCard,
      color: 'from-emerald-600 to-emerald-700',
      isNumber: true,
    },
    {
      label: '本月充值',
      value: summary?.monthRecharge || 0,
      icon: TrendingUp,
      color: 'from-gold-500 to-gold-600',
      trend: 'up',
    },
    {
      label: '本月消费',
      value: summary?.monthConsume || 0,
      icon: TrendingDown,
      color: 'from-orange-500 to-orange-600',
      trend: 'down',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-navy-900">仪表盘</h1>
        <button
          onClick={loadData}
          className="px-4 py-2 text-sm bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors"
        >
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${card.color} rounded-xl p-6 text-white shadow-lg`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/80 text-sm">{card.label}</p>
                <p className="text-3xl font-bold mt-2">
                  {card.isNumber ? card.value : formatMoney(card.value)}
                </p>
                {card.subValue && (
                  <p className="text-white/70 text-xs mt-2">{card.subValue}</p>
                )}
                {card.subLabel && (
                  <p className="text-white/70 text-xs">{card.subLabel}</p>
                )}
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <card.icon size={24} />
              </div>
            </div>
            {card.trend && (
              <div className="flex items-center gap-1 mt-4 text-white/80 text-sm">
                {card.trend === 'up' ? (
                  <ArrowUpRight size={16} />
                ) : (
                  <ArrowDownRight size={16} />
                )}
                <span>较上月</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {exceptions.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-red-500" size={20} />
            <h3 className="text-lg font-semibold text-red-800">异常预警</h3>
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {exceptions.length} 条
            </span>
          </div>
          <div className="space-y-3">
            {exceptions.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg p-4 border border-red-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="text-red-500" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.card_no} - {item.user_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getExceptionWarning(item.exception_type || '')} · {item.remark}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-red-600 font-semibold">{formatMoney(item.amount)}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(item.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-display font-semibold text-navy-900 mb-4">
            收支趋势（近14天）
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => formatMoney(value)}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="recharge"
                  name="充值"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  dot={{ fill: '#D4AF37' }}
                />
                <Line
                  type="monotone"
                  dataKey="consume"
                  name="消费"
                  stroke="#E74C3C"
                  strokeWidth={2}
                  dot={{ fill: '#E74C3C' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-display font-semibold text-navy-900 mb-4">
            门店消费占比
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={storeStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ store_name, percent }) =>
                    `${store_name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total_amount"
                >
                  {storeStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatMoney(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Store className="text-navy-900" size={20} />
          <h3 className="text-lg font-display font-semibold text-navy-900">门店消费统计</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={storeStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="store_name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatMoney(value)} />
              <Legend />
              <Bar dataKey="total_amount" name="消费金额" fill="#0F2A4A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="transaction_count" name="交易笔数" fill="#D4AF37" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
