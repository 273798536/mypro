import React, { useEffect } from 'react';
import { Utensils, Calculator, AlertTriangle, TrendingUp, DollarSign, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDishStore } from '../store/dishStore';
import { useOptimizerStore } from '../store/optimizerStore';

export const Dashboard: React.FC = () => {
  const { dishes, loadDishes } = useDishStore();
  const { history, currentResult } = useOptimizerStore();

  useEffect(() => {
    loadDishes();
  }, [loadDishes]);

  const stats = [
    {
      label: '菜品总数',
      value: dishes.length,
      icon: Utensils,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: '优化方案',
      value: history.length,
      icon: Calculator,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: '待处理冲突',
      value: currentResult?.conflicts.length || 0,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: '平均成本',
      value: history.length > 0
        ? `¥${(history.reduce((sum, r) => sum + r.totalCost, 0) / history.length).toFixed(2)}`
        : '¥0.00',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const quickActions = [
    {
      title: '配餐优化',
      description: '配置约束条件，运行整数规划求解',
      icon: Calculator,
      path: '/optimizer',
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: '菜品库管理',
      description: '导入、编辑和管理菜品信息',
      icon: Utensils,
      path: '/dishes',
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      title: '冲突追溯',
      description: '查看约束冲突和解决路径',
      icon: AlertTriangle,
      path: '/trace',
      color: 'from-amber-500 to-amber-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">欢迎使用组合优化配餐器</h1>
        <p className="text-slate-500 mt-1">智能配餐决策系统，基于整数规划算法</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link
              key={index}
              to={action.path}
              className="group bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">{action.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{action.description}</p>
            </Link>
          );
        })}
      </div>

      {currentResult && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">最新优化结果</h2>
            <Link
              to="/optimizer"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看详情 →
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">方案名称</p>
              <p className="font-semibold text-slate-800 mt-1">{currentResult.configName}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">总成本</p>
              <p className="font-semibold text-slate-800 mt-1">¥{currentResult.totalCost.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600">选菜数量</p>
              <p className="font-semibold text-slate-800 mt-1">{currentResult.selectedDishes.length} 道</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-600">冲突数量</p>
              <p className="font-semibold text-slate-800 mt-1">{currentResult.conflicts.length} 个</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">开始您的配餐优化</h2>
            <p className="text-blue-100">基于整数规划算法，自动平衡营养、成本和过敏约束</p>
          </div>
          <Link
            to="/optimizer"
            className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            立即开始
          </Link>
        </div>
      </div>
    </div>
  );
};
