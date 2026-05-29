import { useState } from 'react';
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
  Legend,
} from 'recharts';
import {
  Eye,
  MousePointerClick,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Activity,
  FileWarning,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';

interface TrendData {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface DeductionData {
  name: string;
  value: number;
  color: string;
}

interface AlertCard {
  type: 'click_missing' | 'click_anomaly' | 'rule_change';
  title: string;
  count: number;
  level: 'high' | 'medium' | 'low';
}

const mockTrendData: TrendData[] = [
  { date: '05-22', impressions: 12500, clicks: 3200, conversions: 450 },
  { date: '05-23', impressions: 13800, clicks: 3500, conversions: 520 },
  { date: '05-24', impressions: 14200, clicks: 3800, conversions: 490 },
  { date: '05-25', impressions: 11000, clicks: 2900, conversions: 380 },
  { date: '05-26', impressions: 15600, clicks: 4100, conversions: 580 },
  { date: '05-27', impressions: 16800, clicks: 4500, conversions: 620 },
  { date: '05-28', impressions: 17200, clicks: 4800, conversions: 650 },
];

const mockDeductionData: DeductionData[] = [
  { name: '异常点击', value: 35, color: '#EF4444' },
  { name: '重复转化', value: 25, color: '#F59E0B' },
  { name: 'IP欺诈', value: 20, color: '#8B5CF6' },
  { name: '时间异常', value: 12, color: '#3B82F6' },
  { name: '其他', value: 8, color: '#6B7280' },
];

const mockAlerts: AlertCard[] = [
  { type: 'click_missing', title: '点击缺失', count: 12, level: 'high' },
  { type: 'click_anomaly', title: '异常点击', count: 28, level: 'medium' },
  { type: 'rule_change', title: '规则变更', count: 3, level: 'low' },
];

const formatNumber = (num: number): string => {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
};

export default function DashboardPage() {
  const [trendData] = useState<TrendData[]>(mockTrendData);
  const [deductionData] = useState<DeductionData[]>(mockDeductionData);
  const [alerts] = useState<AlertCard[]>(mockAlerts);

  const totalImpressions = trendData.reduce((sum, d) => sum + d.impressions, 0);
  const totalClicks = trendData.reduce((sum, d) => sum + d.clicks, 0);
  const totalConversions = trendData.reduce((sum, d) => sum + d.conversions, 0);
  const estimatedCommission = totalConversions * 85;

  const metricCards = [
    {
      title: '本周曝光量',
      value: formatNumber(totalImpressions),
      icon: Eye,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: '本周点击量',
      value: formatNumber(totalClicks),
      icon: MousePointerClick,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      title: '本周转化量',
      value: formatNumber(totalConversions),
      icon: ShoppingCart,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      title: '预估佣金',
      value: '¥' + formatNumber(estimatedCommission),
      icon: DollarSign,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'click_missing':
        return FileWarning;
      case 'click_anomaly':
        return Activity;
      case 'rule_change':
        return AlertTriangle;
      default:
        return AlertTriangle;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <StatusBadge status="error">高优先级</StatusBadge>;
      case 'medium':
        return <StatusBadge status="warning">中优先级</StatusBadge>;
      case 'low':
        return <StatusBadge status="info">低优先级</StatusBadge>;
      default:
        return <StatusBadge status="info">未知</StatusBadge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="数据概览" description="查看本周业务数据和异常告警" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] text-gray-500">{card.title}</p>
                  <p className="mt-2 text-[26px] font-semibold text-gray-900">
                    {card.value}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="mb-4 text-[16px] font-semibold text-gray-900">异常告警</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {alerts.map((alert, index) => {
            const Icon = getAlertIcon(alert.type);
            return (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-white p-5 hover:border-primary/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-red-50 p-2">
                      <Icon className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-gray-900">
                        {alert.title}
                      </p>
                      <p className="text-[12px] text-gray-500 mt-0.5">
                        发现 {alert.count} 条记录
                      </p>
                    </div>
                  </div>
                  {getLevelBadge(alert.level)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 lg:col-span-2">
          <h3 className="mb-4 text-[16px] font-semibold text-gray-900">
            近7天数据趋势
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '13px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  name="曝光量"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  name="点击量"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  name="转化量"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-[16px] font-semibold text-gray-900">
            扣量分布
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deductionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {deductionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
