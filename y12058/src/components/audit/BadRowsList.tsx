import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { formatBadRowType, formatBadRowSource } from '@/utils/dataCleaner';

export const BadRowsList: React.FC = () => {
  const { badRows } = useGameStore();

  if (badRows.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4 font-display">坏行记录</h3>
      
      <div className="text-sm text-gray-500 mb-4">
        共 {badRows.length} 条坏行数据已被过滤
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {badRows.map(row => (
          <div key={row.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  第 {row.rowNumber} 行
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded">
                  {formatBadRowType(row.type)}
                </span>
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                  {formatBadRowSource(row.source)}
                </span>
              </div>
            </div>
            
            {row.originalData.trim() !== '' && (
              <div className="mt-2 text-sm font-mono bg-white p-2 rounded border overflow-x-auto">
                {row.originalData || '(空行)'}
              </div>
            )}
            
            {row.note && (
              <div className="mt-1 text-xs text-yellow-700">
                备注: {row.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
