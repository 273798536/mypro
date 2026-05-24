import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, FileWarning, Plus } from 'lucide-react';
import { dashboardApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardApi.getStats,
  });

  const statCards = stats ? [
    {
      title: '总链路数',
      value: stats.totalChains,
      icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
      bgColor: 'bg-blue-50',
    },
    {
      title: '待处理',
      value: stats.pendingChains,
      icon: <Clock className="w-6 h-6 text-gray-600" />,
      bgColor: 'bg-gray-50',
    },
    {
      title: '异常链路',
      value: stats.exceptionChains,
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
      bgColor: 'bg-red-50',
    },
    {
      title: '已对账',
      value: stats.reconciledChains,
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      bgColor: 'bg-green-50',
    },
    {
      title: '待处理脏数据',
      value: stats.dirtyDataCount,
      icon: <FileWarning className="w-6 h-6 text-orange-600" />,
      bgColor: 'bg-orange-50',
    },
  ] : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">链路总览</h1>
        <Link
          to="/chains"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          创建链路
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} rounded-lg p-4 border border-gray-100`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近链路</h2>
          <div className="space-y-3">
            {stats?.recentChains.map((chain) => (
              <Link
                key={chain.id}
                to={`/chains/${chain.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{chain.chainNo}</p>
                  <p className="text-sm text-gray-500">
                    {chain.storeName} · {chain.businessDate.split('T')[0]}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={chain.status} />
                  <p className="text-sm text-gray-600 mt-1">
                    ¥{Number(chain.totalAmount).toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
          <div className="space-y-3">
            <Link
              to="/chains"
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">查看所有链路</p>
                <p className="text-sm text-gray-500">管理和追踪配送验收链路</p>
              </div>
            </Link>
            <Link
              to="/dirty-data"
              className="flex items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mr-4">
                <FileWarning className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">处理脏数据</p>
                <p className="text-sm text-gray-500">修正异常记录，确保数据一致性</p>
              </div>
            </Link>
            <Link
              to="/reconciliation"
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">对账工作台</p>
                <p className="text-sm text-gray-500">核对订单、欠条与对账单</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
