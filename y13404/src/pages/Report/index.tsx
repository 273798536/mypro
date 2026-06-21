import React from 'react';
import {
  FileBarChart,
  Route,
  AlertTriangle,
  Zap,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { useCalculationStore } from '@/store/calculationStore';
import { getSampleTypeLabel, getBranchResultLabel } from '@/utils/mockData';
import { getBoundaryTypeLabel, getBoundaryTypeColor } from '@/utils/boundaryEngine';
import ExportPanel from './ExportPanel';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.FC<any>> = {
  Route,
  AlertTriangle,
  Zap,
  ClipboardCheck,
};

const Report: React.FC = () => {
  const { currentResult } = useCalculationStore();

  const formatDate = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!currentResult) return null;

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          报告汇总
        </h1>
        <p className="text-slate-500 max-w-2xl">
          统计卡片、明细表和导出文件均来自同一批计算结果，确保数据一致性
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentResult.stats.map((stat, index) => {
          const Icon = iconMap[stat.icon] || FileBarChart;
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
                <FileBarChart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">复核明细表</h3>
                <p className="text-xs text-slate-500">共 {currentResult.details.length} 条记录</p>
              </div>
            </div>
            <div className="text-xs text-slate-400">
              计算批次: <span className="font-mono text-slate-600">{currentResult.id}</span>
            </div>
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

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6">
        <h3 className="font-semibold text-indigo-800 mb-4">边界异常汇总</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentResult.boundaryRecords.map((record, index) => (
            <div
              key={record.id}
              className="bg-white rounded-lg p-4 border border-slate-200"
              style={{ animation: `fadeInUp 0.3s ease-out ${index * 0.1}s both` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: getBoundaryTypeColor(record.type) + '15',
                    color: getBoundaryTypeColor(record.type),
                  }}
                >
                  {getBoundaryTypeLabel(record.type)}
                </span>
                <span className="text-xs text-slate-400">{record.id}</span>
              </div>
              <p className="text-sm text-slate-600 mb-3">{record.explanation}</p>
              {(record.valueBefore !== null || record.valueAfter !== null) && (
                <div className="flex items-center gap-3 text-xs">
                  {record.valueBefore !== null && (
                    <div>
                      <span className="text-slate-500">前: </span>
                      <span className="text-red-500 line-through">{record.valueBefore}</span>
                    </div>
                  )}
                  {record.valueAfter !== null && (
                    <div>
                      <span className="text-slate-500">后: </span>
                      <span className="text-emerald-600 font-medium">{record.valueAfter}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  来源: {record.sourceMaterial.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ExportPanel />

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

export default Report;
