import React, { useState } from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import type { GroupStats, GroupByDimension } from '../../types';
import { formatNumber, formatPercentage, getCoverageStatusColor } from '../../utils/formatters';
import StatusBadge from '../common/StatusBadge';

interface GroupTableProps {
  data: GroupStats[];
  groupBy: GroupByDimension;
  onGroupByChange: (dimension: GroupByDimension) => void;
  targetCoverage: number;
}

type SortField = 'groupName' | 'coverageRate' | 'totalCount' | 'anomalyCount';
type SortDirection = 'asc' | 'desc';

const GroupTable: React.FC<GroupTableProps> = ({ 
  data, 
  groupBy, 
  onGroupByChange,
  targetCoverage 
}) => {
  const [sortField, setSortField] = useState<SortField>('coverageRate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'groupName':
        comparison = a.groupName.localeCompare(b.groupName);
        break;
      case 'coverageRate':
        comparison = a.coverageRate - b.coverageRate;
        break;
      case 'totalCount':
        comparison = a.totalCount - b.totalCount;
        break;
      case 'anomalyCount':
        comparison = a.anomalyCount - b.anomalyCount;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-slate-600" />
      : <ChevronDown className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">分组校准分析</h3>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={groupBy}
              onChange={(e) => onGroupByChange(e.target.value as GroupByDimension)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="category">按品类分组</option>
              <option value="promotion">按促销分组</option>
              <option value="none">不分组</option>
            </select>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('groupName')}
              >
                <div className="flex items-center gap-1">
                  分组名称
                  <SortIcon field="groupName" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('totalCount')}
              >
                <div className="flex items-center justify-end gap-1">
                  样本量
                  <SortIcon field="totalCount" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('coverageRate')}
              >
                <div className="flex items-center justify-end gap-1">
                  覆盖率
                  <SortIcon field="coverageRate" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                覆盖数
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('anomalyCount')}
              >
                <div className="flex items-center justify-end gap-1">
                  异常数
                  <SortIcon field="anomalyCount" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                平均误差
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedData.map((item, index) => {
              const isLowSample = item.totalCount < 30;
              return (
                <tr 
                  key={item.groupKey}
                  className={`hover:bg-slate-50 transition-colors ${isLowSample ? 'bg-amber-50/50' : ''}`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{item.groupName}</span>
                      {isLowSample && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          样本偏少
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">
                    {formatNumber(item.totalCount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <StatusBadge 
                      type="coverage" 
                      value={item.coverageRate} 
                      target={targetCoverage}
                      size="sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">
                    {formatNumber(item.coveredCount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span 
                      className={`font-mono ${item.anomalyCount > 0 ? 'text-red-600' : 'text-slate-400'}`}
                    >
                      {formatNumber(item.anomalyCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">
                    {formatPercentage(item.avgError)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="p-8 text-center text-slate-500">
          暂无数据
        </div>
      )}
    </div>
  );
};

export default GroupTable;
