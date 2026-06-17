import React, { useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { RiskBadge } from '../components/RiskBadge';
import { IntentTag } from '../components/IntentTag';
import { SOURCE_TYPE_LABELS, INTENT_LABELS } from '../../shared/types';

export const Dashboard: React.FC = () => {
  const {
    dashboardStats,
    fetchDashboard,
    fetchConversations,
    setFilters,
    loading
  } = useStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const goToReview = (filters: any) => {
    setFilters(filters);
    window.location.hash = '#/review';
  };

  if (loading.dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!dashboardStats) {
    return <div className="text-gray-500">暂无数据</div>;
  }

  const { total, reviewed, pending, driftRate, riskDistribution, bySource, byIntent, recentDrifts } = dashboardStats;

  const statCards = [
    {
      title: '总对话数',
      value: total,
      icon: FileText,
      color: 'bg-blue-500',
      trend: '+12%'
    },
    {
      title: '已复核',
      value: reviewed,
      icon: CheckCircle,
      color: 'bg-green-500',
      trend: `${Math.round(reviewed / total * 100)}%`
    },
    {
      title: '待复核',
      value: pending,
      icon: Clock,
      color: 'bg-amber-500',
      trend: null
    },
    {
      title: '意图漂移率',
      value: `${driftRate}%`,
      icon: driftRate > 10 ? AlertTriangle : TrendingDown,
      color: driftRate > 10 ? 'bg-red-500' : 'bg-green-500',
      trend: driftRate > 10 ? '+2.3%' : '-1.5%',
      trendUp: driftRate > 10
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据概览</h1>
          <p className="text-gray-500 mt-1">客服机器人意图漂移检测综合统计</p>
        </div>
        <button
          onClick={() => goToReview({ hasDrift: true })}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          查看待复核
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                {stat.trend && (
                  <div className={`flex items-center gap-1 mt-2 text-sm ${stat.trendUp ? 'text-red-500' : 'text-green-500'}`}>
                    {stat.trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{stat.trend}</span>
                    <span className="text-gray-400 ml-1">较上周</span>
                  </div>
                )}
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">风险分布</h3>
          <div className="space-y-4">
            {(['high', 'medium', 'low', 'none'] as const).map((level) => (
              <div key={level} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RiskBadge level={level} />
                  <span className="text-sm text-gray-600">{riskDistribution[level] || 0} 条</span>
                </div>
                <span className="text-sm text-gray-500">
                  {total > 0 ? Math.round((riskDistribution[level] || 0) / total * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">材料来源分布</h3>
          <div className="space-y-4">
            {Object.entries(bySource).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{SOURCE_TYPE_LABELS[source as keyof typeof SOURCE_TYPE_LABELS]}</span>
                <span className="text-sm text-gray-500">{count} 条</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">意图分布</h3>
          <div className="space-y-3">
            {Object.entries(byIntent).map(([intent, count]) => (
              <div key={intent} className="flex items-center justify-between">
                <IntentTag intent={intent as any} />
                <span className="text-sm text-gray-500">{count} 条</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">近期漂移检测</h3>
          <button
            onClick={() => goToReview({ hasDrift: true })}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            查看全部
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">会话ID</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">用户输入</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">原始标注</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">AI预测</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">风险等级</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">来源</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">检测时间</th>
              </tr>
            </thead>
            <tbody>
              {recentDrifts.map((item: any) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => goToReview({ search: item.id })}>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-blue-600">{item.id}</span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-gray-700 max-w-xs truncate">{item.userInput}</p>
                  </td>
                  <td className="py-3 px-4">
                    <IntentTag intent={item.originalIntent} variant="outline" />
                  </td>
                  <td className="py-3 px-4">
                    <IntentTag intent={item.predictedIntent} />
                  </td>
                  <td className="py-3 px-4">
                    <RiskBadge level={item.riskLevel} />
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600">{SOURCE_TYPE_LABELS[item.sourceType]}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-500">{new Date(item.detectedAt).toLocaleString('zh-CN')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
