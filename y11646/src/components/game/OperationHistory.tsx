import React from 'react';
import { History, Plus, Trash2, ArrowRight, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { OperationLog } from '../../types';
import { formatTimestamp } from '../../utils/storage';

interface OperationHistoryProps {
  operations: OperationLog[];
}

export const OperationHistory: React.FC<OperationHistoryProps> = ({ operations }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'place': return <Plus size={14} className="text-green-400" />;
      case 'remove': return <Trash2 size={14} className="text-red-400" />;
      case 'swap': return <ArrowRight size={14} className="text-blue-400" />;
      default: return <History size={14} />;
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <History size={20} className="text-purple-400" />
        <h3 className="text-lg font-semibold text-white">操作痕迹</h3>
        <span className="text-sm text-gray-400 ml-auto">
          共 {operations.length} 步
        </span>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-2">
        {operations.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <History size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无操作记录</p>
          </div>
        ) : (
          [...operations].reverse().map((op, index) => (
            <div
              key={op.id}
              className="p-2 bg-gray-800 rounded-lg text-sm"
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{getIcon(op.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white truncate">
                      {op.chemicalName || op.chemicalId}
                    </span>
                    <span className={`text-xs flex items-center gap-1 ${
                      op.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {op.scoreChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {op.scoreChange >= 0 ? '+' : ''}{op.scoreChange}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {op.toSlotPosition} · {formatTimestamp(op.timestamp).split(' ')[1]}
                  </div>
                  {op.risks.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-400">
                      <AlertTriangle size={12} />
                      <span>{op.risks.length} 项风险</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
