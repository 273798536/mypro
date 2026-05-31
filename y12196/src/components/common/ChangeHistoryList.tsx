import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { User, Clock } from 'lucide-react';
import type { ChangeRecord } from '../../types';
import { sourceLabels } from '../../data/mockData';

interface ChangeHistoryListProps {
  records: ChangeRecord[];
  maxItems?: number;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '-';
  if (value instanceof Date) return format(value, 'yyyy-MM-dd HH:mm', { locale: zhCN });
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    status: '状态',
    boxNumber: '箱号',
    description: '描述',
    weight: '重量',
    volume: '体积',
    name: '城市名称',
    performanceDate: '演出日期',
    venue: '演出场地',
    arrivalDate: '到达日期',
    signatureDate: '签收日期',
    receivedBy: '签收人',
    shipmentStatus: '流转状态',
  };
  return labels[fieldName] || fieldName;
}

export function ChangeHistoryList({ records, maxItems }: ChangeHistoryListProps) {
  const displayRecords = maxItems ? records.slice(0, maxItems) : records;

  if (displayRecords.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        暂无变更记录
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayRecords.map((record, index) => (
        <div
          key={record.id}
          className="bg-white border border-gray-100 rounded-md p-4 animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary-700">
                {getFieldLabel(record.fieldName)}
              </span>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                {sourceLabels[record.source] || record.source}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={12} />
              {format(new Date(record.timestamp), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">原值:</span>
              <span className="diff-old px-1.5 py-0.5 rounded">
                {formatValue(record.oldValue)}
              </span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">新值:</span>
              <span className="diff-new px-1.5 py-0.5 rounded">
                {formatValue(record.newValue)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <User size={12} />
            <span>{record.operator}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
