import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight, Eye } from 'lucide-react';
import { useDataStore } from '@/stores/useDataStore';
import { StatusBadge } from '@/components/StatusBadge';
import { DataMarkTags } from '@/components/MarkTag';
import { formatDateTime, formatPercent } from '@/utils/format';
import type { DataStatus, JudgeResult, MarkType } from '@/types';
import { cn } from '@/lib/utils';

const statusOptions: { value: DataStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'normal', label: '正常' },
  { value: 'warning', label: '预警' },
  { value: 'critical', label: '临界' },
];

const markTypeOptions: { value: MarkType | 'all'; label: string }[] = [
  { value: 'all', label: '全部标记' },
  { value: 'noise', label: '疑似噪声' },
  { value: 'old_note', label: '旧版备注' },
  { value: 'name_mismatch', label: '名称不一致' },
  { value: 'verbal_note', label: '口头备注' },
  { value: 'pending', label: '待补材料' },
  { value: 'manual', label: '人工改判' },
];

const judgeOptions: { value: JudgeResult | 'all'; label: string }[] = [
  { value: 'all', label: '全部判定' },
  { value: 'none', label: '未判定' },
  { value: 'normal', label: '判定正常' },
  { value: 'noise', label: '判定噪声' },
  { value: 'pending', label: '待补材料' },
];

export const DataList: React.FC = () => {
  const navigate = useNavigate();
  const { getFilteredData, filters, setFilters, getStatsSummary } = useDataStore();
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  
  const data = getFilteredData();
  const stats = getStatsSummary();
  
  const handleRowClick = (id: string) => {
    navigate(`/detail/${id}`);
  };
  
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">数据列表</h1>
          <p className="text-sm text-gray-400">
            共 <span className="text-teal-glow font-mono font-medium">{stats.total}</span> 条数据，
            当前筛选 <span className="text-teal-glow font-mono font-medium">{data.length}</span> 条
          </p>
        </div>
        <button
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            showFilterPanel
              ? 'bg-teal-glow/15 text-teal-glow border border-teal-glow/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
          )}
        >
          <Filter className="w-4 h-4" />
          筛选
        </button>
      </div>
      
      {showFilterPanel && (
        <div className="glass-card rounded-xl p-4 animate-slide-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="ID / 冷却塔 / 材料"
                  value={filters.searchKeyword || ''}
                  onChange={(e) => setFilters({ searchKeyword: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-deep-blue-700/50 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-glow/50 transition-colors"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">状态</label>
              <select
                value={filters.status || 'all'}
                onChange={(e) => setFilters({ status: e.target.value as DataStatus | 'all' })}
                className="w-full px-3 py-2 bg-deep-blue-700/50 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-teal-glow/50 transition-colors appearance-none"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">标记类型</label>
              <select
                value={filters.markType || 'all'}
                onChange={(e) => setFilters({ markType: e.target.value as MarkType | 'all' })}
                className="w-full px-3 py-2 bg-deep-blue-700/50 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-teal-glow/50 transition-colors appearance-none"
              >
                {markTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">判定结果</label>
              <select
                value={filters.judgeResult || 'all'}
                onChange={(e) => setFilters({ judgeResult: e.target.value as JudgeResult | 'all' })}
                className="w-full px-3 py-2 bg-deep-blue-700/50 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-teal-glow/50 transition-colors appearance-none"
              >
                {judgeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="bg-deep-blue-700/50">
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">数据ID</th>
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">冷却塔</th>
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">水滴值</th>
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">偏离度</th>
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">状态</th>
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">材料名称</th>
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">标记</th>
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">采集时间</th>
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr
                  key={item.id}
                  onClick={() => handleRowClick(item.id)}
                  className={cn(
                    'border-t border-white/5 hover:bg-white/5 cursor-pointer transition-colors',
                    idx % 2 === 1 && 'bg-white/[0.02]'
                  )}
                  style={{ animationDelay: `${idx * 10}ms` }}
                >
                  <td className="px-4 py-3 text-sm font-mono text-gray-300">{item.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{item.towerId}</td>
                  <td className="px-4 py-3 text-sm font-mono text-white">
                    {item.dropletValue.toFixed(1)}
                  </td>
                  <td className={cn(
                    'px-4 py-3 text-sm font-mono font-medium',
                    item.deviation > 20 ? 'text-orange-alert' : item.deviation > 0 ? 'text-amber-warn' : 'text-teal-glow'
                  )}>
                    {formatPercent(item.deviation)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 max-w-[140px] truncate">
                    {item.materialName}
                  </td>
                  <td className="px-4 py-3">
                    <DataMarkTags
                      isNoiseSuspected={item.isNoiseSuspected}
                      isOldNote={item.isOldNote}
                      isNameMismatch={item.isNameMismatch}
                      isVerbalNote={item.isVerbalNote}
                      isPending={item.judgeResult === 'pending'}
                      isManual={item.judgeResult !== 'none'}
                      size="sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                    {formatDateTime(item.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(item.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-teal-glow hover:text-teal-glow-400 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      详情
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {data.length === 0 && (
            <div className="py-16 text-center">
              <div className="text-gray-500 text-sm mb-2">暂无符合条件的数据</div>
              <button
                onClick={() => {
                  setFilters({ status: 'all', markType: 'all', searchKeyword: '', judgeResult: 'all' });
                }}
                className="text-xs text-teal-glow hover:underline"
              >
                清除筛选条件
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
