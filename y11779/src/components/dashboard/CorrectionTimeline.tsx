import React from 'react';
import { Clock, User, Tag, Edit3, Trash2, FileText } from 'lucide-react';
import type { CorrectionRecord, CorrectionType } from '../../types';
import { formatDateTime, truncateText } from '../../utils/formatters';

interface CorrectionTimelineProps {
  records: CorrectionRecord[];
}

const CorrectionTimeline: React.FC<CorrectionTimelineProps> = ({ records }) => {
  const getTypeIcon = (type: CorrectionType) => {
    const icons: Record<CorrectionType, React.ReactNode> = {
      adjustment: <Edit3 className="w-4 h-4" />,
      annotation: <Tag className="w-4 h-4" />,
      exclusion: <Trash2 className="w-4 h-4" />
    };
    return icons[type];
  };

  const getTypeLabel = (type: CorrectionType): string => {
    const labels: Record<CorrectionType, string> = {
      adjustment: '参数调整',
      annotation: '标注说明',
      exclusion: '数据排除'
    };
    return labels[type];
  };

  const getTypeColor = (type: CorrectionType): string => {
    const colors: Record<CorrectionType, string> = {
      adjustment: 'bg-blue-100 text-blue-700',
      annotation: 'bg-amber-100 text-amber-700',
      exclusion: 'bg-red-100 text-red-700'
    };
    return colors[type];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">修正记录</h3>
          <span className="text-sm text-slate-500">
            共 {records.length} 条记录
          </span>
        </div>
      </div>
      
      <div className="p-4 max-h-64 overflow-y-auto">
        {records.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">暂无修正记录</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />
            
            <div className="space-y-4">
              {records.map((record, index) => (
                <div key={record.id} className="relative pl-10">
                  <div 
                    className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${getTypeColor(record.type)}`}
                  >
                    {getTypeIcon(record.type)}
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(record.type)}`}>
                        {getTypeLabel(record.type)}
                      </span>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDateTime(record.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-700 mb-2">
                      {record.reason}
                    </p>
                    
                    {record.beforeValue !== null && record.afterValue !== null && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">变更:</span>
                        <span className="text-red-600 line-through">
                          {typeof record.beforeValue === 'object' 
                            ? JSON.stringify(record.beforeValue) 
                            : String(record.beforeValue)}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="text-emerald-600">
                          {typeof record.afterValue === 'object' 
                            ? JSON.stringify(record.afterValue) 
                            : String(record.afterValue)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <User className="w-3 h-3" />
                        <span>{record.operator}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Tag className="w-3 h-3" />
                        <span>{record.source}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CorrectionTimeline;
