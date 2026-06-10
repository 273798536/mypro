import React from 'react';
import { Import, Edit3, FileText, CheckCircle, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import type { ReviewRecord } from '@/types';
import { operationTypeLabels } from '@/types';
import { formatDate, getOperationTypeColor } from '@/utils/formatters';
import clsx from 'clsx';

interface TimelineProps {
  records: ReviewRecord[];
}

const getOperationIcon = (type: string) => {
  switch (type) {
    case 'import':
      return <Import size={16} />;
    case 'modify_group':
      return <Edit3 size={16} />;
    case 'modify_quality':
      return <AlertTriangle size={16} />;
    case 'add_note':
      return <FileText size={16} />;
    case 'confirm':
      return <CheckCircle size={16} />;
    case 'reject':
      return <XCircle size={16} />;
    case 'revert':
      return <RotateCcw size={16} />;
    default:
      return <FileText size={16} />;
  }
};

export const Timeline: React.FC<TimelineProps> = ({ records }) => {
  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.operateTime).getTime() - new Date(a.operateTime).getTime()
  );

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-paper-200" />
      
      <div className="space-y-6">
        {sortedRecords.map((record, index) => (
          <div key={record.id} className="relative pl-10 animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
            <div className={clsx(
              'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm',
              getOperationTypeColor(record.operationType)
            )}>
              {getOperationIcon(record.operationType)}
            </div>
            
            <div className="bg-white rounded-lg border border-paper-200 p-4 shadow-card hover:shadow-card-hover transition-all duration-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'px-2 py-0.5 text-xs font-medium rounded',
                    getOperationTypeColor(record.operationType)
                  )}>
                    {operationTypeLabels[record.operationType]}
                  </span>
                  <span className="text-xs text-paper-500">
                    {formatDate(record.operateTime)}
                  </span>
                </div>
                <span className="text-sm font-medium text-paper-700">{record.operator}</span>
              </div>
              
              {record.reason && (
                <div className="mb-2">
                  <span className="text-xs text-paper-500">修改原因：</span>
                  <p className="text-sm text-paper-800">{record.reason}</p>
                </div>
              )}
              
              {(record.oldGroup || record.newGroup) && (
                <div className="flex items-center gap-3 mb-2 text-sm">
                  <span className="text-paper-500">分组：</span>
                  {record.oldGroup && (
                    <span className="line-through text-paper-400 bg-paper-100 px-2 py-0.5 rounded">
                      {record.oldGroup}
                    </span>
                  )}
                  {record.oldGroup && record.newGroup && (
                    <span className="text-paper-400">→</span>
                  )}
                  {record.newGroup && (
                    <span className="text-moss-green-700 bg-moss-green-50 px-2 py-0.5 rounded font-medium">
                      {record.newGroup}
                    </span>
                  )}
                </div>
              )}
              
              {(record.oldStatus || record.newStatus) && (
                <div className="flex items-center gap-3 mb-2 text-sm">
                  <span className="text-paper-500">状态：</span>
                  {record.oldStatus && (
                    <span className="line-through text-paper-400 bg-paper-100 px-2 py-0.5 rounded">
                      {record.oldStatus as string}
                    </span>
                  )}
                  {record.oldStatus && record.newStatus && (
                    <span className="text-paper-400">→</span>
                  )}
                  {record.newStatus && (
                    <span className="text-moss-green-700 bg-moss-green-50 px-2 py-0.5 rounded font-medium">
                      {record.newStatus as string}
                    </span>
                  )}
                </div>
              )}
              
              {record.comment && (
                <div className="mt-3 pt-3 border-t border-paper-100">
                  <span className="text-xs text-paper-500">备注说明：</span>
                  <p className="text-sm text-paper-700 mt-1 leading-relaxed">{record.comment}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
