import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronUp, ChevronDown, History, Eye } from 'lucide-react';
import type { DeflectionRecord } from '@/types';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDeflectionValue, formatTemperature, formatHumidity, formatDateTime } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface DetailTableProps {
  records: DeflectionRecord[];
  onRowClick?: (record: DeflectionRecord) => void;
}

type SortKey = 'beamNumber' | 'detectionType' | 'detectionTime' | 'deflectionValue' | 'status';
type SortOrder = 'asc' | 'desc';

const columnLabels: Record<SortKey, string> = {
  beamNumber: '梁号',
  detectionType: '检测类型',
  detectionTime: '检测时间',
  deflectionValue: '挠度值 (mm)',
  status: '状态',
};

export default function DetailTable({ records, onRowClick }: DetailTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('detectionTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const sortedRecords = useMemo(() => {
    const sorted = [...records];
    sorted.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortKey) {
        case 'beamNumber':
          aVal = a.beamNumber;
          bVal = b.beamNumber;
          break;
        case 'detectionType':
          aVal = a.detectionType;
          bVal = b.detectionType;
          break;
        case 'detectionTime':
          aVal = new Date(a.detectionTime).getTime();
          bVal = new Date(b.detectionTime).getTime();
          break;
        case 'deflectionValue':
          aVal = a.deflectionValue;
          bVal = b.deflectionValue;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [records, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getRowBgClass = (status: string): string => {
    switch (status) {
      case 'NOISE_SUSPECTED':
        return 'bg-amber-900/20 hover:bg-amber-900/30';
      case 'EXTREME_VALUE':
        return 'bg-red-900/20 hover:bg-red-900/30';
      case 'PENDING_CONFIRM':
        return 'bg-slate-800/40 hover:bg-slate-800/60';
      case 'CONFIRMED_REJECT':
        return 'bg-rose-900/20 hover:bg-rose-900/30';
      default:
        return 'bg-[#1e3a5f]/40 hover:bg-[#2d5a8e]/30';
    }
  };

  const getValueColorClass = (status: string): string => {
    switch (status) {
      case 'NOISE_SUSPECTED':
        return 'text-amber-400';
      case 'EXTREME_VALUE':
        return 'text-red-400';
      default:
        return 'text-white';
    }
  };

  return (
    <div className="overflow-x-auto border-2 border-[#2d5a8e]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1e3a5f]">
            {(Object.keys(columnLabels) as SortKey[]).map((key) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                className="bg-[#1e3a5f] text-[#8ba7c7] font-medium text-xs uppercase tracking-wider px-4 py-3 text-left cursor-pointer hover:bg-[#2d5a8e]/50 transition-colors select-none whitespace-nowrap"
              >
                <span className="flex items-center gap-1">
                  {columnLabels[key]}
                  <span className="inline-flex flex-col">
                    <ChevronUp className={cn('w-3 h-3 -mb-1', sortKey === key && sortOrder === 'asc' ? 'text-white' : 'text-[#5a7aa0]')} />
                    <ChevronDown className={cn('w-3 h-3', sortKey === key && sortOrder === 'desc' ? 'text-white' : 'text-[#5a7aa0]')} />
                  </span>
                </span>
              </th>
            ))}
            <th className="bg-[#1e3a5f] text-[#8ba7c7] font-medium text-xs uppercase tracking-wider px-4 py-3 text-left">
              温度
            </th>
            <th className="bg-[#1e3a5f] text-[#8ba7c7] font-medium text-xs uppercase tracking-wider px-4 py-3 text-left">
              湿度
            </th>
            <th className="bg-[#1e3a5f] text-[#8ba7c7] font-medium text-xs uppercase tracking-wider px-4 py-3 text-center">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRecords.map((record) => (
            <tr
              key={record.id}
              onClick={() => onRowClick?.(record)}
              className={cn('border-t border-[#2d5a8e]/50 transition-colors cursor-pointer', getRowBgClass(record.status))}
            >
              <td className="px-4 py-3 font-mono text-white">{record.beamNumber}</td>
              <td className="px-4 py-3 text-[#8ba7c7]">
                {record.detectionType === 'static' ? '静态检测' : record.detectionType === 'dynamic' ? '动态检测' : '环境检测'}
              </td>
              <td className="px-4 py-3 text-[#8ba7c7] font-mono text-xs">{formatDateTime(record.detectionTime)}</td>
              <td className={cn('px-4 py-3 font-mono font-medium', getValueColorClass(record.status))}>
                {formatDeflectionValue(record.deflectionValue)}
                {record.isBoundary && (
                  <span className="ml-2 text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 border border-amber-400/30">
                    边界
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={record.status} />
              </td>
              <td className="px-4 py-3 text-[#8ba7c7] font-mono text-xs">{formatTemperature(record.temperature)}</td>
              <td className="px-4 py-3 text-[#8ba7c7] font-mono text-xs">{formatHumidity(record.humidity)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-2">
                  <Link
                    to={`/history/${record.id}`}
                    className="inline-flex items-center gap-1 text-[#5a9fd4] hover:text-white text-xs transition-colors"
                    title="查看历史"
                  >
                    <History className="w-3.5 h-3.5" />
                    历史
                  </Link>
                  <Link
                    to={`/history/${record.id}`}
                    className="inline-flex items-center gap-1 text-[#5a9fd4] hover:text-white text-xs transition-colors"
                    title="查看详情"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    详情
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sortedRecords.length === 0 && (
        <div className="py-12 text-center text-[#8ba7c7]">
          暂无匹配的检测记录
        </div>
      )}
    </div>
  );
}
