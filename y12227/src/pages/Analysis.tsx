import { useState } from 'react';
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Download,
  Filter,
  Cloud,
  Server,
  Database,
  Layers,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/format';
import { cn } from '../lib/utils';
import { monthlyConsumeData, projectConsumeData } from '../data/mockData';

export function Analysis() {
  const billItems = useStore((state) => state.billItems);
  const cloudBills = useStore((state) => state.cloudBills);
  const [selectedPeriod, setSelectedPeriod] = useState('2024-05');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');

  const productTypeStats = [
    { name: '云服务器', value: 28390, icon: Server, color: 'bg-primary-500' },
    { name: '云数据库', value: 15680, icon: Database, color: 'bg-purple-500' },
    { name: '对象存储', value: 3240.5, icon: Layers, color: 'bg-cyan-500' },
    { name: 'CDN加速', value: 12340.3, icon: Cloud, color: 'bg-warning-500' },
  ];

  const trendChartOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
      formatter: (params: any) => {
        const item = params[0];
        return `<div class="font-medium">${item.name}</div>
                <div>消耗金额: ¥${item.value.toLocaleString()}</div>`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
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
        type: 'bar',
        data: monthlyConsumeData.map((d) => d.amount),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#1d4ed8' },
            ],
          },
          borderRadius: [6, 6, 0, 0],
        },
        barWidth: '50%',
      },
    ],
  };

  const projectChartOption = {
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
        radius: ['45%', '70%'],
        center: ['40%', '50%'],
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

  const stackChartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
    },
    legend: {
      data: ['电商平台', '数据中台', '用户中心', '营销活动', '待分摊'],
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
      data: ['1月', '2月', '3月', '4月', '5月'],
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
        name: '电商平台',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: [45000, 48000, 52000, 55000, 58670],
        itemStyle: { color: '#3b82f6' },
      },
      {
        name: '数据中台',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: [7500, 8000, 8500, 8800, 8960],
        itemStyle: { color: '#8b5cf6' },
      },
      {
        name: '用户中心',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: [3800, 4000, 4200, 4300, 4500],
        itemStyle: { color: '#06b6d4' },
      },
      {
        name: '营销活动',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: [0, 0, 8000, 10000, 12340],
        itemStyle: { color: '#f59e0b' },
      },
      {
        name: '待分摊',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: [5200, 4800, 3600, 2900, 3240],
        itemStyle: { color: '#ef4444' },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">消耗分析</h1>
          <p className="text-gray-500 mt-1">多维度查看云服务消耗数据</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Calendar className="w-4 h-4" />
            {selectedPeriod}
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            <Download className="w-4 h-4" />
            导出报表
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">筛选:</span>
          </div>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="all">全部云厂商</option>
            <option value="aliyun">阿里云</option>
            <option value="tencent">腾讯云</option>
            <option value="aws">AWS</option>
          </select>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="all">全部项目</option>
            <option value="proj-001">电商平台</option>
            <option value="proj-002">数据中台</option>
            <option value="proj-003">用户中心</option>
            <option value="proj-004">营销活动</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {productTypeStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.color, 'bg-opacity-10')}>
                  <Icon className={cn('w-5 h-5', stat.color.replace('bg-', 'text-'))} />
                </div>
                <span className="text-2xl font-bold text-gray-900">{formatCurrency(stat.value)}</span>
              </div>
              <p className="text-sm text-gray-500">{stat.name}</p>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', stat.color)}
                  style={{ width: `${(stat.value / 28390) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">月度消耗趋势</h2>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-md">柱状图</button>
              <button className="px-3 py-1 text-gray-500 text-sm hover:bg-gray-100 rounded-md">折线图</button>
            </div>
          </div>
          <ReactECharts option={trendChartOption} style={{ height: '300px' }} />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">项目消耗占比</h2>
          </div>
          <ReactECharts option={projectChartOption} style={{ height: '300px' }} />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">项目堆叠消耗</h2>
        </div>
        <ReactECharts option={stackChartOption} style={{ height: '350px' }} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">消耗明细</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  资源名称
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  资源ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  产品
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用量
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  标签
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  使用时段
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金额
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {billItems.map((item) => (
                <tr key={item.itemId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.resourceName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {item.resourceId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.usageAmount} {item.usageUnit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(item.tags).map(([key, value]) => (
                        <span
                          key={key}
                          className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full"
                        >
                          {key}:{value}
                        </span>
                      ))}
                      {Object.keys(item.tags).length === 0 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                          无标签
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(item.usageStart)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
