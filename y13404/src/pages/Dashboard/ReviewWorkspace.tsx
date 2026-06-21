import React from 'react';
import {
  LayoutDashboard,
  Route,
  AlertTriangle,
  Zap,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  RefreshCw,
  RotateCcw,
  Download,
} from 'lucide-react';
import { useCalculationStore } from '@/store/calculationStore';
import { getSampleTypeLabel, getBranchResultLabel } from '@/utils/mockData';
import { getBoundaryTypeLabel, getBoundaryTypeColor } from '@/utils/boundaryEngine';
import { cn } from '@/lib/utils';
import type { SampleType, BranchResult, BoundaryType } from '@/types';

const iconMap: Record<string, React.FC<any>> = {
  Route,
  AlertTriangle,
  Zap,
  ClipboardCheck,
};

const ReviewWorkspace: React.FC = () => {
  const { filters, currentResult, isCalculating, updateFilters, resetFilters, recalculate } =
    useCalculationStore();

  const handleSampleTypeToggle = (type: SampleType) => {
    const newTypes = filters.sampleTypes.includes(type)
      ? filters.sampleTypes.filter((t) => t !== type)
      : [...filters.sampleTypes, type];
    updateFilters({ sampleTypes: newTypes });
  };

  const handleBranchResultToggle = (result: BranchResult) => {
    const newResults = filters.branchResults.includes(result)
      ? filters.branchResults.filter((r) => r !== result)
      : [...filters.branchResults, result];
    updateFilters({ branchResults: newResults });
  };

  const handleBoundaryTypeToggle = (type: BoundaryType) => {
    const newTypes = filters.boundaryTypes.includes(type)
      ? filters.boundaryTypes.filter((t) => t !== type)
      : [...filters.boundaryTypes, type];
    updateFilters({ boundaryTypes: newTypes });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sampleTypes: { value: SampleType; label: string }[] = [
    { value: 'missing', label: '缺字段' },
    { value: 'alias', label: '别名' },
    { value: 'late', label: '晚到备注' },
  ];

  const branchResults: { value: BranchResult; label: string; color: string }[] = [
    { value: 'normal', label: '正常', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'warning', label: '警告', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'error', label: '错误', color: 'bg-red-100 text-red-700 border-red-200' },
  ];

  const boundaryTypes: { value: BoundaryType; label: string }[] = [
    { value: 'empty', label: '空集合' },
    { value: 'zero', label: '零值' },
    { value: 'extrapolate', label: '外推越界' },
  ];

  if (!currentResult) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">筛选条件</h3>
                <p className="text-xs text-slate-500">所有统计与明细来自同一计算结果</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置
              </button>
              <button
                onClick={recalculate}
                disabled={isCalculating}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isCalculating && 'animate-spin')} />
                重新计算
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">样例类型</label>
            <div className="flex flex-wrap gap-2">
              {sampleTypes.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleSampleTypeToggle(value)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-lg border transition-all',
                    filters.sampleTypes.includes(value)
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">分支结果</label>
            <div className="flex flex-wrap gap-2">
              {branchResults.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => handleBranchResultToggle(value)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-lg border transition-all',
                    filters.branchResults.includes(value)
                      ? color
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">边界类型</label>
            <div className="flex flex-wrap gap-2">
              {boundaryTypes.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleBoundaryTypeToggle(value)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-lg border transition-all',
                    filters.boundaryTypes.includes(value)
                      ? 'bg-purple-100 text-purple-700 border-purple-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentResult.stats.map((stat, index) => {
          const Icon = iconMap[stat.icon] || LayoutDashboard;
          return (
            <div
              key={stat.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all"
              style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.1}s both` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-800" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {stat.value}
                  </p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1">
                {stat.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                {stat.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                {stat.trend === 'neutral' && <Minus className="w-4 h-4 text-slate-400" />}
                <span
                  className={cn(
                    'text-xs font-medium',
                    stat.trend === 'up' && 'text-emerald-600',
                    stat.trend === 'down' && 'text-red-600',
                    stat.trend === 'neutral' && 'text-slate-500'
                  )}
                >
                  {stat.change > 0 ? '+' : ''}
                  {stat.change}
                </span>
                <span className="text-xs text-slate-400">较昨日</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">复核明细</h3>
                <p className="text-xs text-slate-500">共 {currentResult.details.length} 条记录</p>
              </div>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <Download className="w-3.5 h-3.5" />
              导出
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  样例名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  分支结果
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  边界类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  数值
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作人
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  备注
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentResult.details.map((row, index) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50 transition-colors"
                  style={{ animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both` }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                    {row.sampleName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-slate-600">{getSampleTypeLabel(row.sampleType)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        row.branchResult === 'normal' && 'bg-emerald-100 text-emerald-700',
                        row.branchResult === 'warning' && 'bg-amber-100 text-amber-700',
                        row.branchResult === 'error' && 'bg-red-100 text-red-700'
                      )}
                    >
                      {getBranchResultLabel(row.branchResult)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.boundaryType ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: getBoundaryTypeColor(row.boundaryType) + '15',
                          color: getBoundaryTypeColor(row.boundaryType),
                        }}
                      >
                        {getBoundaryTypeLabel(row.boundaryType)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {row.value}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {row.operator}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                    {formatDate(row.time)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                    {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ReviewWorkspace;
