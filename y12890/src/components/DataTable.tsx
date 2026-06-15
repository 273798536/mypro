import React, { useState } from 'react';
import { TideRecord } from '../types/tide';
import { DataStatus } from '../types/common';
import { formatDateTime, getStatusLabel } from '../utils/format';
import { COMMON_TIMEZONES } from '../core/timezone';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface DataTableProps {
  records: TideRecord[];
  showTimezoneToggle?: boolean;
  showOriginalTimezone?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  records,
  showTimezoneToggle = false,
  showOriginalTimezone = false,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('recordTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getRowBgColor = (status: DataStatus, isExpanded: boolean): string => {
    if (isExpanded) return 'bg-ocean-50';
    switch (status) {
      case DataStatus.PENDING:
        return 'bg-status-pending/5 hover:bg-status-pending/10';
      case DataStatus.NEED_REVIEW:
        return 'bg-status-review/5 hover:bg-status-review/10';
      case DataStatus.RECOLLECT:
        return 'bg-status-recollect/5 hover:bg-status-recollect/10';
      default:
        return 'hover:bg-slate-50';
    }
  };

  const getCellBgColor = (status: DataStatus): string => {
    switch (status) {
      case DataStatus.PENDING:
        return 'bg-status-pending/20';
      case DataStatus.NEED_REVIEW:
        return 'bg-status-review/20';
      case DataStatus.RECOLLECT:
        return 'bg-status-recollect/20';
      default:
        return '';
    }
  };

  const getTimezoneLabel = (tz: string): string => {
    return COMMON_TIMEZONES[tz as keyof typeof COMMON_TIMEZONES] || tz;
  };

  const sortedRecords = [...records].sort((a, b) => {
    let aVal: unknown = a[sortField as keyof TideRecord];
    let bVal: unknown = b[sortField as keyof TideRecord];

    if (aVal instanceof Date && bVal instanceof Date) {
      aVal = aVal.getTime();
      bVal = bVal.getTime();
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="w-3 h-3 text-ocean-600" />
      : <ChevronDown className="w-3 h-3 text-ocean-600" />;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="w-10 p-3"></th>
            <th
              className="p-3 text-left font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-100 transition-colors"
              onClick={() => handleSort('recordTime')}
            >
              <div className="flex items-center gap-1">
                时间
                <SortIcon field="recordTime" />
              </div>
            </th>
            <th
              className="p-3 text-left font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-100 transition-colors"
              onClick={() => handleSort('tideLevel')}
            >
              <div className="flex items-center gap-1">
                潮位
                <SortIcon field="tideLevel" />
              </div>
            </th>
            <th className="p-3 text-left font-semibold text-slate-700">单位</th>
            {showTimezoneToggle && (
              <th className="p-3 text-left font-semibold text-slate-700">
                {showOriginalTimezone ? '原始时区' : '校正时区'}
              </th>
            )}
            <th className="p-3 text-left font-semibold text-slate-700">状态</th>
            <th className="p-3 text-left font-semibold text-slate-700">说明</th>
          </tr>
        </thead>
        <tbody>
          {sortedRecords.map((record, index) => {
            const isExpanded = expandedRows.has(record.id);
            const hasIssues = record.status !== DataStatus.AVAILABLE;
            const tzToShow = showOriginalTimezone ? record.originalTimezone : record.timezone;

            return (
              <React.Fragment key={record.id}>
                <tr
                  className={`border-b border-slate-100 transition-colors cursor-pointer ${getRowBgColor(record.status, isExpanded)}`}
                  onClick={() => hasIssues && toggleRow(record.id)}
                >
                  <td className="p-3">
                    {hasIssues ? (
                      <div className="flex items-center gap-1">
                        <span className={`status-dot status-dot-${record.status} transition-transform ${isExpanded ? 'scale-125' : 'hover:scale-125'}`} />
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    ) : (
                      <span className="status-dot status-dot-available" />
                    )}
                  </td>
                  <td className="p-3 font-mono">{formatDateTime(record.recordTime)}</td>
                  <td className={`p-3 font-mono ${getCellBgColor(record.status)} rounded`}>
                    {record.tideLevel !== null ? record.tideLevel.toFixed(2) : '—'}
                  </td>
                  <td className="p-3 font-mono">{record.unit}</td>
                  {showTimezoneToggle && (
                    <td className="p-3">
                      <span className={record.originalTimezone !== record.timezone ? 'text-status-review font-medium' : ''}>
                        {getTimezoneLabel(tzToShow)}
                      </span>
                    </td>
                  )}
                  <td className="p-3">
                    <StatusBadge status={record.status} size="sm" />
                  </td>
                  <td className="p-3 max-w-xs">
                    {record.isDuplicate ? (
                      <span className="text-xs text-status-pending">与 {record.duplicateOf} 重复</span>
                    ) : record.note ? (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        {record.note}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">正常</span>
                    )}
                  </td>
                </tr>
                {isExpanded && hasIssues && (
                  <tr className="bg-slate-50">
                    <td colSpan={showTimezoneToggle ? 7 : 6} className="p-4">
                      <div className="pl-8 space-y-2">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-ocean-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-1">异常详情</p>
                            <p className="text-sm text-slate-600">
                              {record.status === DataStatus.PENDING && '数据存在空值或时区问题，当前标记为暂缓处理。'}
                              {record.status === DataStatus.NEED_REVIEW && '数据存在单位混用或备注不明确，需要场长复核确认。'}
                              {record.status === DataStatus.RECOLLECT && '数据超出合理范围，建议重新采集该点位数据。'}
                            </p>
                            {record.originalTimezone !== record.timezone && (
                              <p className="text-sm text-status-review mt-2">
                                ⚠️ 时区校正：原始 {getTimezoneLabel(record.originalTimezone)} → 校正后 {getTimezoneLabel(record.timezone)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
