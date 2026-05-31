import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  FileText,
  AlertTriangle,
  PieChart,
  TrendingUp,
  ArrowRight,
  Upload,
  CheckCircle,
  Clock,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/format';
import { monthlyConsumeData, projectConsumeData } from '../data/mockData';

export function Dashboard() {
  const navigate = useNavigate();
  const currentBalance = useStore((state) => state.currentBalance);
  const cloudBills = useStore((state) => state.cloudBills);
  const exceptions = useStore((state) => state.exceptions);
  const allocationResults = useStore((state) => state.allocationResults);
  const ledgerEntries = useStore((state) => state.ledgerEntries);

  const pendingExceptions = exceptions.filter((ex) => ex.status === 'pending');
  const totalMonthBill = cloudBills
    .filter((b) => b.billPeriod === '2024-05')
    .reduce((sum, b) => sum + b.totalAmount, 0);
  const totalAllocated = allocationResults.reduce((sum, a) => sum + a.totalAmount, 0);

  const trendChartOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
    },
    legend: {
      data: ['消耗金额', '充值金额'],
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: monthlyConsumeData.map((d) => d.month),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#6b7280' },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { color: '#6b7280' },
    },
    series: [
      {
        name: '消耗金额',
        type: 'line',
        smooth: true,
        data: monthlyConsumeData.map((d) => d.amount),
        lineStyle: { color: '#2563eb', width: 3 },
        itemStyle: { color: '#2563eb' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(37, 99, 235, 0.3)' },
              { offset: 1, color: 'rgba(37, 99, 235, 0.05)' },
            ],
          },
        },
      },
      {
        name: '充值金额',
        type: 'bar',
        data: monthlyConsumeData.map((d) => d.recharge),
        itemStyle: { color: '#10b981' },
      },
    ],
  };

  const pieChartOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
      formatter: '{b}: ¥{c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#6b7280' },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: projectConsumeData.map((d, i) => ({
          value: d.value,
          name: d.name,
          itemStyle: {
            color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444'][i],
          },
        })),
      },
    ],
  };

  const statCards = [
    {
      title: '账户余额',
      value: formatCurrency(currentBalance),
      icon: Wallet,
      color: 'bg-primary-50 text-primary-600',
      trend: '+12.5%',
      trendUp: true,
    },
    {
      title: '本月账单',
      value: formatCurrency(totalMonthBill),
      icon: FileText,
      color: 'bg-success-50 text-success-600',
      trend: '+8.3%',
      trendUp: false,
    },
    {
      title: '已分摊金额',
      value: formatCurrency(totalAllocated),
      icon: PieChart,
      color: 'bg-purple-50 text-purple-600',
      trend: '97.2%',
      trendUp: true,
    },
    {
      title: '待处理异常',
      value: pendingExceptions.length,
      icon: AlertTriangle,
      color: 'bg-warning-50 text-warning-600',
      link: '/exceptions',
    },
  ];

  const quickActions = [
    { title: '导入云账单', icon: Upload, path: '/import', desc: '上传云服务商账单文件' },
    { title: '异常处理', icon: AlertTriangle, path: '/exceptions', desc: '处理标签缺失等异常' },
    { title: '项目分摊', icon: PieChart, path: '/allocation', desc: '调整项目成本分摊规则' },
    { title: '消耗分析', icon: TrendingUp, path: '/analysis', desc: '多维度查看消耗数据' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">概览</h1>
          <p className="text-gray-500 mt-1">云服务预付费消耗管理系统</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">上次更新: {formatDate(new Date().toISOString())}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                  {card.trend && (
                    <p
                      className={`text-sm mt-2 ${
                        card.trendUp ? 'text-success-600' : 'text-warning-600'
                      }`}
                    >
                      {card.trend} 较上月
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">消耗趋势</h2>
            <button
              onClick={() => navigate('/analysis')}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              查看详情 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <ReactECharts option={trendChartOption} style={{ height: '300px' }} />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">项目分布</h2>
          </div>
          <ReactECharts option={pieChartOption} style={{ height: '300px' }} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={() => navigate(action.path)}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                <Icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
              <p className="text-sm text-gray-500">{action.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">最近流水</h2>
            <button
              onClick={() => navigate('/ledger')}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              全部流水 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {ledgerEntries.slice(0, 5).map((entry) => (
              <div
                key={entry.entryId}
                className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      entry.entryType === 'recharge'
                        ? 'bg-success-50'
                        : entry.entryType === 'refund'
                        ? 'bg-warning-50'
                        : 'bg-gray-50'
                    }`}
                  >
                    {entry.entryType === 'recharge' ? (
                      <CheckCircle className="w-5 h-5 text-success-600" />
                    ) : entry.entryType === 'refund' ? (
                      <Clock className="w-5 h-5 text-warning-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{entry.sourceDesc}</p>
                    <p className="text-sm text-gray-500">{formatDate(entry.createdAt)}</p>
                  </div>
                </div>
                <span
                  className={`font-semibold ${
                    entry.amount > 0 ? 'text-success-600' : 'text-gray-900'
                  }`}
                >
                  {entry.amount > 0 ? '+' : ''}
                  {formatCurrency(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">待处理异常</h2>
            <button
              onClick={() => navigate('/exceptions')}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              全部异常 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {pendingExceptions.slice(0, 4).map((ex) => (
              <div
                key={ex.exceptionId}
                className="flex items-start gap-3 p-4 bg-warning-50 rounded-lg border border-warning-100"
              >
                <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{ex.description}</p>
                  <p className="text-sm text-gray-500 mt-1">{formatDate(ex.createdAt)}</p>
                </div>
              </div>
            ))}
            {pendingExceptions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto text-success-500 mb-3" />
                <p>暂无待处理异常</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
