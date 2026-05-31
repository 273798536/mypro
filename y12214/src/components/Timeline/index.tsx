import type { ChangeLog } from '@/types';
import { formatDateFull, getFieldLabel, formatValue } from '@/utils/format';
import { User, Clock } from 'lucide-react';

interface Props {
  changes: ChangeLog[];
}

export default function Timeline({ changes }: Props) {
  if (changes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>暂无变动记录</p>
      </div>
    );
  }
  
  const sortedChanges = [...changes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  return (
    <div className="relative">
      {sortedChanges.map((change, index) => (
        <div key={change.id} className="relative pl-8 pb-6 last:pb-0">
          {index !== sortedChanges.length - 1 && (
            <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gray-200" />
          )}
          
          <div className="absolute left-0 top-1.5 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center border-2 border-white">
            <div className="w-2 h-2 bg-primary-500 rounded-full" />
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {change.operator}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDateFull(change.createdAt)}
              </span>
            </div>
            
            <p className="text-gray-800 mb-2">
              <span className="font-medium">{getFieldLabel(change.fieldName)}</span>
              从 
              <span className="text-red-500 mx-1 line-through">
                {formatValue(change.fieldName, change.oldValue)}
              </span>
              改为 
              <span className="text-emerald-600 mx-1 font-medium">
                {formatValue(change.fieldName, change.newValue)}
              </span>
            </p>
            
            <p className="text-sm text-gray-500">
              <span className="text-gray-400">原因：</span>
              {change.changeReason}
            </p>
            
            {change.affectedCalculations.length > 0 && (
              <p className="text-xs text-primary-600 mt-2">
                影响 {change.affectedCalculations.length} 份测算结果
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
